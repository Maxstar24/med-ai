import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variables
const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    const { topic, questionType, difficulty, count = 3, description = '' } = body;
    
    // Validate required fields
    if (!topic || !questionType || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, questionType, and difficulty are required' },
        { status: 400 }
      );
    }
    
    // Validate question type
    const validQuestionTypes = ['multiple-choice', 'true-false', 'saq'];
    if (!validQuestionTypes.includes(questionType)) {
      return NextResponse.json(
        { error: `Invalid question type. Must be one of: ${validQuestionTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate difficulty
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if API key is available
    if (!API_KEY) {
      console.error('Google AI API key is not configured');
      return NextResponse.json(
        { 
          error: 'AI service is not properly configured', 
          details: 'Missing API key. Please add GOOGLE_AI_API_KEY or GEMINI_API_KEY to your environment variables.'
        },
        { status: 500 }
      );
    }
    
    // Limit count to a reasonable number
    const questionCount = Math.min(Math.max(1, count), 10);
    
    console.log(`Generating ${questionCount} ${questionType} questions on ${topic} at ${difficulty} level`);
    
    // Initialize Google Gemini client
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create context from description if provided
    const contextInfo = description 
      ? `Quiz Description: ${description}\n\nBased on this description, generate questions that are relevant to the specific context provided.` 
      : '';
    
    // Create prompt based on question type
    let prompt = '';
    
    if (questionType === 'multiple-choice') {
      prompt = `Generate ${questionCount} multiple-choice questions about ${topic} at a ${difficulty} level for medical students.
      ${contextInfo}
      
      For each question, provide:
      1. The question text - be specific about whether case sensitivity matters in the answer
      2. Four answer options (A, B, C, D) - ensure these are distinct and unambiguous
      3. The correct answer (indicate which letter is correct)
      4. A brief explanation of why the answer is correct
      
      Format the response as a JSON array with objects containing:
      {
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "A", // The letter of the correct option
        "explanation": "Explanation text",
        "type": "multiple-choice",
        "difficulty": "${difficulty}",
        "topic": "${topic}",
        "tags": ["tag1", "tag2"] // Relevant medical tags for this question
      }`;
    } else if (questionType === 'true-false') {
      prompt = `Generate ${questionCount} true/false questions about ${topic} at a ${difficulty} level for medical students.
      ${contextInfo}
      
      For each question, provide:
      1. The question text (should be a statement that is either true or false) - make sure the statement is unambiguously true or false
      2. Whether the statement is true or false
      3. A brief explanation of why the statement is true or false
      
      Format the response as a JSON array with objects containing:
      {
        "question": "Statement text",
        "correctAnswer": true, // or false
        "explanation": "Explanation text",
        "type": "true-false",
        "difficulty": "${difficulty}",
        "topic": "${topic}",
        "tags": ["tag1", "tag2"] // Relevant medical tags for this question
      }`;
    } else if (questionType === 'saq') {
      prompt = `Generate ${questionCount} short answer questions about ${topic} at a ${difficulty} level for medical students.
      ${contextInfo}
      
      For each question, provide:
      1. The question text - be very specific about expected answer format (e.g., if case sensitivity matters, if abbreviations are accepted)
      2. The correct answer - provide the canonical form of the answer
      3. Alternative acceptable answers (at least 3-5) - include variations in:
         - Capitalization (e.g., "kanamycin" vs "Kanamycin")
         - Common misspellings or alternative spellings
         - Synonyms or equivalent terms
         - Abbreviations if applicable
      4. A brief explanation of the answer
      
      If the answer requires exact spelling or capitalization, explicitly state this in the question.
      
      Format the response as a JSON array with objects containing:
      {
        "question": "Question text (include any specific instructions about answer format)",
        "correctAnswer": ["Primary correct answer", "Alternative answer 1", "Alternative answer 2", "Alternative answer 3", "Alternative answer 4"],
        "explanation": "Explanation text",
        "type": "saq",
        "difficulty": "${difficulty}",
        "topic": "${topic}",
        "tags": ["tag1", "tag2"] // Relevant medical tags for this question
      }`;
    }
    
    // Add system prompt
    const systemPrompt = "You are a medical education expert who creates high-quality quiz questions for medical students. Your responses should be accurate, educational, and formatted as specified. Always return valid JSON. For short answer questions, be thorough in providing alternative acceptable answers including variations in capitalization, spelling, and terminology.";
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    
    try {
      // Call Google Gemini API
      console.log('Calling Google Gemini API with model: gemini-1.5-pro');
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();
      
      // Extract and parse the response
      let generatedQuestions;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;
        
        // Parse the JSON
        generatedQuestions = JSON.parse(jsonString);
        
        // Ensure it's an array
        if (!Array.isArray(generatedQuestions)) {
          // If it's an object with a questions property that's an array, use that
          if (generatedQuestions.questions && Array.isArray(generatedQuestions.questions)) {
            generatedQuestions = generatedQuestions.questions;
          } else {
            // Otherwise, wrap it in an array
            generatedQuestions = [generatedQuestions];
          }
        }
        
        // Validate and format each question
        generatedQuestions = generatedQuestions.map((q: any) => {
          // Process SAQ questions to ensure they have enough alternative answers
          if (questionType === 'saq' && Array.isArray(q.correctAnswer)) {
            // If there's only one answer, create variations with different capitalizations
            if (q.correctAnswer.length === 1) {
              const mainAnswer = q.correctAnswer[0];
              // Add lowercase and uppercase variations if they don't already exist
              const lowerCase = mainAnswer.toLowerCase();
              const upperCase = mainAnswer.toUpperCase();
              const titleCase = mainAnswer.charAt(0).toUpperCase() + mainAnswer.slice(1).toLowerCase();
              
              const variations = [mainAnswer];
              if (!variations.includes(lowerCase)) variations.push(lowerCase);
              if (!variations.includes(upperCase)) variations.push(upperCase);
              if (!variations.includes(titleCase)) variations.push(titleCase);
              
              q.correctAnswer = variations;
            }
          }
          
          // Ensure required fields
          return {
            ...q,
            type: questionType,
            difficulty: difficulty,
            topic: topic,
            tags: q.tags || []
          };
        });
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.log('Raw response:', responseText);
        return NextResponse.json(
          { error: 'Failed to parse AI-generated questions', rawResponse: responseText },
          { status: 500 }
        );
      }
      
      // Return the generated questions
      return NextResponse.json({
        success: true,
        questions: generatedQuestions
      });
    } catch (error: any) {
      console.error('Error calling Google Gemini API:', error);
      
      // Provide more detailed error information
      const errorDetails = {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.errorDetails || 'No additional details available'
      };
      
      return NextResponse.json(
        { 
          error: 'Failed to generate questions with AI', 
          details: errorDetails,
          apiKeyConfigured: !!API_KEY,
          apiKeyLength: API_KEY ? API_KEY.length : 0
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error.message },
      { status: 500 }
    );
  }
} 