import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/firebase-admin';

const questionRequestSchema = z.object({
  category: z.enum(['Cardiology', 'Pharmacology', 'Neurology']).optional(),
  type: z.enum(['multiple-choice', 'true-false', 'matching']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// Mock database of questions
const questionsDB = [
  {
    id: 1,
    type: 'multiple-choice',
    category: 'Cardiology',
    difficulty: 'intermediate',
    question: 'Which of the following is NOT a typical symptom of acute myocardial infarction?',
    options: [
      'Chest pain',
      'Shortness of breath',
      'Knee pain',
      'Nausea'
    ],
    correctAnswer: 2,
    explanation: 'Knee pain is not typically associated with acute myocardial infarction. The classic symptoms include chest pain (angina), shortness of breath, nausea, sweating, and pain radiating to the arm or jaw.'
  },
  {
    id: 2,
    type: 'true-false',
    category: 'Pharmacology',
    difficulty: 'beginner',
    question: 'Beta blockers are contraindicated in patients with asthma.',
    correctAnswer: true,
    explanation: 'Beta blockers can trigger bronchospasm in asthmatic patients due to their effect on β2 receptors in the bronchial smooth muscle.'
  },
  {
    id: 3,
    type: 'matching',
    category: 'Neurology',
    difficulty: 'advanced',
    question: 'Match the cranial nerve with its primary function:',
    pairs: [
      { item: 'CN VII', match: 'Facial expression' },
      { item: 'CN X', match: 'Heart rate & digestion' },
      { item: 'CN VIII', match: 'Hearing & balance' }
    ],
    explanation: 'The cranial nerves are essential for various bodily functions. CN VII (facial nerve) controls facial expressions, CN X (vagus nerve) regulates heart rate and digestion, and CN VIII (vestibulocochlear nerve) is responsible for hearing and balance.'
  },
  // Additional questions
  {
    id: 4,
    type: 'multiple-choice',
    category: 'Cardiology',
    difficulty: 'beginner',
    question: 'Which heart chamber pumps blood to the lungs?',
    options: [
      'Left ventricle',
      'Right ventricle',
      'Left atrium',
      'Right atrium'
    ],
    correctAnswer: 1,
    explanation: 'The right ventricle pumps deoxygenated blood to the lungs through the pulmonary artery. The left ventricle pumps oxygenated blood to the rest of the body.'
  },
  {
    id: 5,
    type: 'true-false',
    category: 'Pharmacology',
    difficulty: 'intermediate',
    question: 'ACE inhibitors can cause a dry cough as a side effect.',
    correctAnswer: true,
    explanation: 'ACE inhibitors commonly cause a dry cough due to the accumulation of bradykinin in the lungs. This side effect occurs in about 10-20% of patients.'
  }
];

export async function GET(request: Request) {
  try {
    // Check authentication using Firebase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      // Verify the Firebase token
      await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const difficulty = searchParams.get('difficulty');

    // Validate query parameters
    const validatedParams = questionRequestSchema.parse({
      category,
      type,
      difficulty
    });

    // Filter questions based on parameters
    let filteredQuestions = [...questionsDB];
    
    if (validatedParams.category) {
      filteredQuestions = filteredQuestions.filter(q => q.category === validatedParams.category);
    }
    
    if (validatedParams.type) {
      filteredQuestions = filteredQuestions.filter(q => q.type === validatedParams.type);
    }
    
    if (validatedParams.difficulty) {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === validatedParams.difficulty);
    }

    // Randomly select questions
    const shuffledQuestions = filteredQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 5); // Return 5 random questions

    return NextResponse.json({
      questions: shuffledQuestions
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Practice API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice questions' },
      { status: 500 }
    );
  }
}

// Endpoint to submit answers and get results
export async function POST(request: Request) {
  try {
    // Check authentication using Firebase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      // Verify the Firebase token
      await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { questionId, answer } = body;

    // Find the question
    const question = questionsDB.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check the answer
    let isCorrect = false;
    switch (question.type) {
      case 'multiple-choice':
        isCorrect = answer === question.correctAnswer;
        break;
      case 'true-false':
        isCorrect = answer === question.correctAnswer;
        break;
      case 'matching':
        // Implement matching logic here
        isCorrect = false; // Placeholder
        break;
    }

    return NextResponse.json({
      isCorrect,
      explanation: question.explanation
    });
  } catch (error) {
    console.error('Practice API error:', error);
    return NextResponse.json(
      { error: 'Failed to process answer' },
      { status: 500 }
    );
  }
} 