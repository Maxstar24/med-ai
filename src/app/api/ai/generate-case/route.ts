import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
let firebaseApp: admin.app.App;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  try {
    // Check if we have the service account key
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables');
    }

    // Parse the service account key JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    // Initialize the app
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });

    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

// Initialize the Google Generative AI client
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Initialize Firebase Admin if not already initialized
    try {
      initializeFirebaseAdmin();
      console.log('Firebase Admin initialized successfully');
    } catch (adminError) {
      console.error('Error initializing Firebase Admin:', adminError);
      return NextResponse.json(
        { message: 'Server configuration error', error: adminError instanceof Error ? adminError.message : String(adminError) },
        { status: 500 }
      );
    }
    
    // Get the authorization token from the request
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json(
        { message: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    console.log('Token extracted, length:', idToken.length);
    
    try {
      // Verify the Firebase ID token
      console.log('Attempting to verify Firebase ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      console.log('Token verified successfully for user:', uid);
      
      if (!uid) {
        console.error('Token verified but no UID found');
        return NextResponse.json(
          { message: 'Unauthorized: Invalid user' },
          { status: 401 }
        );
      }
      
      const formData = await req.formData();
      const specialty = formData.get('specialty') as string;
      const difficulty = formData.get('difficulty') as string;
      const additionalInstructions = formData.get('additionalInstructions') as string;
      const includeImages = formData.get('includeImages') === 'true';
      const numQuestions = parseInt(formData.get('numQuestions') as string, 10);
      const imageFile = formData.get('image') as File | null;
      const pdfFile = formData.get('pdf') as File | null;
      const includeHistory = formData.get('includeHistory') === 'true';
      const previousPrompts = formData.get('previousPrompts') as string;
      
      if (!specialty) {
        return NextResponse.json(
          { message: 'Medical specialty is required' },
          { status: 400 }
        );
      }
      
      // Generate the case using AI
      const generatedCase = await generateMedicalCase(
        specialty,
        difficulty,
        additionalInstructions,
        includeImages,
        numQuestions,
        imageFile,
        pdfFile,
        includeHistory,
        previousPrompts
      );
      
      return NextResponse.json(generatedCase);
    } catch (firebaseError) {
      console.error('Firebase authentication error:', firebaseError);
      return NextResponse.json(
        { message: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error generating case with AI:', error);
    return NextResponse.json(
      { message: 'Failed to generate case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fileToGenerativePart(file: File): Promise<Part> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Determine MIME type based on file extension
  const fileType = file.name.split('.').pop()?.toLowerCase();
  let mimeType = file.type;
  
  if (!mimeType) {
    // Fallback MIME types if not provided
    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png'].includes(fileType || '')) {
      mimeType = `image/${fileType}`;
    }
  }
  
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mimeType
    }
  } as Part;
}

async function generateMedicalCase(
  specialty: string,
  difficulty: string,
  additionalInstructions: string,
  includeImages: boolean,
  numQuestions: number,
  imageFile: File | null,
  pdfFile: File | null,
  includeHistory: boolean,
  previousPrompts: string
) {
  try {
    // Using the newer model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-pro-exp-02-05",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
    
    // Create a detailed prompt for the AI
    const basePrompt = `
      Create a detailed medical case study for educational purposes in the field of ${specialty} for healthcare professionals and medical students.
      
      The case should be at ${difficulty} difficulty level and include:
      
      1. A title for the case
      2. A brief description (1-2 sentences)
      3. Detailed case content with patient history, symptoms, examination findings, and relevant test results
      4. ${numQuestions} questions about the case with answers and explanations
      5. At least 3-5 relevant external links to medical resources, journals, or educational websites where users can learn more about this condition
      
      Additional requirements:
      ${additionalInstructions ? `- ${additionalInstructions}` : ''}
      ${includeImages ? '- Include descriptions of relevant medical images that would be helpful for this case' : ''}
      
      Format your response as a JSON object with the following structure:
      {
        "title": "Case title",
        "description": "Brief description",
        "content": "Detailed markdown content",
        "category": "${specialty}",
        "tags": ["tag1", "tag2"],
        "specialties": ["${specialty}"],
        "difficulty": "${difficulty}",
        "answers": [
          {
            "question": "Question 1?",
            "answer": "Answer 1",
            "explanation": "Explanation 1"
          }
        ],
        "references": [
          {
            "title": "Reference Title",
            "url": "https://example.com/reference",
            "description": "Brief description of what this reference contains"
          }
        ]
      }
      
      Make sure the content is medically accurate, educational, and formatted in proper markdown including headers, lists, and tables where appropriate.
      This is for educational purposes in a medical context only.
    `;
    
    // Add history context if requested
    const historyContext = includeHistory && previousPrompts ? 
      `Previous context: ${previousPrompts}\n\nPlease consider the above history when generating this case.` : '';
    
    const finalPrompt = historyContext ? `${historyContext}\n\n${basePrompt}` : basePrompt;
    
    let result;
    
    // Handle different content types
    if (imageFile || pdfFile) {
      const parts: Part[] = [{ text: finalPrompt }];
      
      // Add image if provided
      if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        parts.push(imagePart);
        parts.push({ text: "Please analyze this medical image and incorporate relevant findings into the case study." });
      }
      
      // Add PDF if provided
      if (pdfFile) {
        const pdfPart = await fileToGenerativePart(pdfFile);
        parts.push(pdfPart);
        parts.push({ text: "Please analyze this medical document and incorporate relevant information into the case study." });
      }
      
      result = await model.generateContent(parts);
    } else {
      result = await model.generateContent(finalPrompt);
    }
    
    const responseText = result.response.text();
    
    // Extract the JSON from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/```\n([\s\S]*?)\n```/) || 
                      responseText.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
    const caseData = JSON.parse(jsonString);
    
    // Ensure all required fields are present
    const requiredFields = ['title', 'description', 'content', 'category', 'answers'];
    for (const field of requiredFields) {
      if (!caseData[field]) {
        throw new Error(`Generated case is missing required field: ${field}`);
      }
    }
    
    // Ensure answers have the correct structure
    if (!Array.isArray(caseData.answers) || caseData.answers.length === 0) {
      throw new Error('Generated case must have at least one question and answer');
    }
    
    for (const answer of caseData.answers) {
      if (!answer.question || !answer.answer) {
        throw new Error('Each answer must have a question and answer field');
      }
    }
    
    // Set default values for optional fields
    if (!caseData.tags) caseData.tags = [];
    if (!caseData.specialties) caseData.specialties = [specialty];
    if (!caseData.mediaUrls) caseData.mediaUrls = [];
    if (!caseData.references) caseData.references = [];
    
    // Add metadata about the generation
    caseData.generatedWith = "gemini-2.0-pro-exp-02-05";
    caseData.generatedAt = new Date().toISOString();
    
    // If image or PDF was analyzed, add a note about it
    if (imageFile || pdfFile) {
      caseData.mediaAnalysis = {
        imageAnalyzed: !!imageFile,
        pdfAnalyzed: !!pdfFile,
        imageFilename: imageFile?.name || null,
        pdfFilename: pdfFile?.name || null
      };
    }
    
    return caseData;
  } catch (error) {
    console.error('Error in AI case generation:', error);
    throw error;
  }
} 