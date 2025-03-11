import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      
      const { specialty, difficulty, additionalInstructions, includeImages, numQuestions } = await req.json();
      
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
        numQuestions
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

async function generateMedicalCase(
  specialty: string,
  difficulty: string,
  additionalInstructions: string,
  includeImages: boolean,
  numQuestions: number
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create a detailed prompt for the AI
    const prompt = `
      Create a detailed medical case study for educational purposes in the field of ${specialty}.
      
      The case should be at ${difficulty} difficulty level and include:
      
      1. A title for the case
      2. A brief description (1-2 sentences)
      3. Detailed case content with patient history, symptoms, examination findings, and relevant test results
      4. ${numQuestions} questions about the case with answers and explanations
      
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
        ]
      }
      
      Make sure the content is medically accurate, educational, and formatted in proper markdown including headers, lists, and tables where appropriate.
    `;
    
    const result = await model.generateContent(prompt);
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
    
    return caseData;
  } catch (error) {
    console.error('Error in AI case generation:', error);
    throw error;
  }
} 