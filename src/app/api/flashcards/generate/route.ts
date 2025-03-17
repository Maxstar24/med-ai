import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { ObjectId } from 'mongodb';
import Flashcard from '@/models/Flashcard';
import FlashcardCategory from '@/models/FlashcardCategory';

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Initialize the Google Generative AI client
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Verify Firebase token
async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Helper function to convert file to generative part
async function fileToGenerativePart(file: File): Promise<Part> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Check for unsupported file types
  if (file.type === 'image/gif') {
    throw new Error('GIF images are not supported. Please use JPEG or PNG images.');
  }
  
  // Validate supported MIME types
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Please use JPEG, PNG, or PDF files.`);
  }
  
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: file.type
    }
  } as Part;
}

export async function POST(req: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const uid = decodedToken.uid;
    
    // Parse form data
    const formData = await req.formData();
    const topic = formData.get('topic') as string;
    const categoryId = formData.get('categoryId') as string;
    const numCards = parseInt(formData.get('numCards') as string || '5');
    const difficulty = formData.get('difficulty') as string || 'medium';
    const isPublic = formData.get('isPublic') === 'true';
    const pdfFile = formData.get('pdf') as File | null;
    
    // Validate required fields
    if (!topic && !pdfFile) {
      return NextResponse.json(
        { error: 'Either topic or PDF file is required' },
        { status: 400 }
      );
    }
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const category = await FlashcardCategory.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the category
    if (category.createdBy.toString() !== uid) {
      return NextResponse.json(
        { error: 'You do not have permission to add flashcards to this category' },
        { status: 403 }
      );
    }
    
    // Generate flashcards using AI
    const flashcards = await generateFlashcards(
      topic,
      pdfFile,
      numCards,
      difficulty,
      uid,
      categoryId,
      isPublic
    );
    
    return NextResponse.json(flashcards);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
}

async function generateFlashcards(
  topic: string,
  pdfFile: File | null,
  numCards: number,
  difficulty: string,
  uid: string,
  categoryId: string,
  isPublic: boolean
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
      Create ${numCards} flashcards for medical education on the topic of ${topic || 'the provided document'}.
      
      The flashcards should be at ${difficulty} difficulty level and include:
      
      1. A clear, concise question
      2. A comprehensive answer
      3. A brief explanation that provides additional context or mnemonics (optional)
      
      Format your response as a JSON array with the following structure:
      [
        {
          "question": "Question text",
          "answer": "Answer text",
          "explanation": "Explanation text",
          "tags": ["tag1", "tag2"]
        }
      ]
      
      Make sure the content is medically accurate, educational, and appropriate for healthcare professionals and medical students.
      This is for educational purposes in a medical context only.
      
      Important: Make sure all flashcards are related to the same topic and form a cohesive set for learning.
    `;
    
    let result;
    
    // Handle different content types
    if (pdfFile) {
      const parts: Part[] = [{ text: basePrompt }];
      
      // Add PDF
      const pdfPart = await fileToGenerativePart(pdfFile);
      parts.push(pdfPart);
      parts.push({ text: "Please analyze this medical document and create flashcards based on its content." });
      
      result = await model.generateContent(parts);
    } else {
      result = await model.generateContent(basePrompt);
    }
    
    const responseText = result.response.text();
    
    // Extract the JSON from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/```\n([\s\S]*?)\n```/) || 
                      responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
    const flashcardsData = JSON.parse(jsonString);
    
    // Validate flashcards data
    if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
      throw new Error('AI did not generate valid flashcards');
    }
    
    // Generate a unique set ID to group these flashcards together
    const setId = new ObjectId();
    
    // Determine the topic name
    const topicName = topic || (pdfFile ? pdfFile.name.replace(/\.[^/.]+$/, "") : "Generated Flashcards");
    
    console.log(`Creating flashcard set with ID ${setId} for topic "${topicName}"`);
    
    // Create flashcards in the database
    const createdFlashcards = [];
    
    for (const cardData of flashcardsData) {
      if (!cardData.question || !cardData.answer) {
        continue; // Skip invalid cards
      }
      
      // Add the topic as a tag if it's not already included
      const tags = cardData.tags || [];
      if (topic && !tags.includes(topic)) {
        tags.push(topic);
      }
      
      const newFlashcard = new Flashcard({
        question: cardData.question,
        answer: cardData.answer,
        explanation: cardData.explanation || '',
        category: new ObjectId(categoryId),
        tags: tags,
        createdBy: uid,
        isPublic,
        difficulty,
        reviewCount: 0,
        confidenceLevel: 3,
        nextReviewDate: new Date(), // Due immediately for first review
        setId: setId, // Add the set ID to group flashcards
        topicName: topicName // Add the topic name
      });
      
      await newFlashcard.save();
      createdFlashcards.push(newFlashcard);
    }
    
    // Update category card count
    await FlashcardCategory.findByIdAndUpdate(
      categoryId,
      { $inc: { cardCount: createdFlashcards.length } }
    );
    
    return createdFlashcards;
  } catch (error) {
    console.error('Error in AI flashcard generation:', error);
    throw error;
  }
} 