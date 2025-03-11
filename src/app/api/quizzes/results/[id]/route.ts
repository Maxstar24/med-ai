import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';
import { DecodedIdToken } from 'firebase-admin/auth';

// Define interfaces for type safety
interface IQuizResult {
  _id: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  userId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    userAnswer?: string | number | boolean;
    shortAnswer?: string;
    isCorrect: boolean;
    timeSpent?: number;
  }>;
  completedAt: Date;
  improvement: string | null;
  streak: number;
}

interface IQuiz {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  questions: Array<{
    _id: mongoose.Types.ObjectId | string;
    text: string;
    type: 'multiple-choice' | 'true-false' | 'spot' | 'saq';
    options: any[];
    correctAnswer: string | string[];
    explanation: string;
    imageUrl?: string;
  }>;
}

// Helper function to verify Firebase token
async function verifyFirebaseToken(authHeader: string | null): Promise<DecodedIdToken | null> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Define a more flexible schema for different question types
const answerSchema = z.union([
  // For multiple choice and true/false questions
  z.object({
    questionId: z.string(),
    selectedOptionIds: z.array(z.string()).optional(),
    userAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
    isCorrect: z.boolean().optional(),
    timeSpent: z.number().optional(),
  }),
  // For spot (image identification) questions
  z.object({
    questionId: z.string(),
    shortAnswer: z.string().optional(),
    userAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
    isCorrect: z.boolean().optional(),
    timeSpent: z.number().optional(),
  }),
  // For short answer questions
  z.object({
    questionId: z.string(),
    shortAnswer: z.string().optional(),
    userAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
    isCorrect: z.boolean().optional(),
    timeSpent: z.number().optional(),
  })
]);

// GET: Fetch a specific quiz result by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the result ID from params
    const resultId = params.id;
    
    if (!resultId || !mongoose.Types.ObjectId.isValid(resultId)) {
      return NextResponse.json(
        { error: 'Invalid result ID' },
        { status: 400 }
      );
    }
    
    // Fetch the result from the database
    const result = await QuizResult.findById(resultId).lean();
    
    if (!result) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedResult = result as unknown as IQuizResult;
    
    // Verify that the result belongs to the authenticated user
    if (typedResult.userId !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Unauthorized to access this result' },
        { status: 403 }
      );
    }
    
    // Fetch the quiz to get the questions
    const quiz = await Quiz.findById(typedResult.quizId).lean();
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedQuiz = quiz as unknown as IQuiz;
    
    // Calculate percentage score
    const percentageScore = Math.round((typedResult.score / typedResult.totalQuestions) * 100);
    
    // Combine the result with the quiz questions
    const resultWithQuestions = {
      ...typedResult,
      questions: typedQuiz.questions,
      percentageScore
    };
    
    return NextResponse.json({ result: resultWithQuestions });
  } catch (error) {
    console.error('Error fetching quiz result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz result' },
      { status: 500 }
    );
  }
}

// Helper function to calculate user statistics
async function calculateUserStats(userId: string) {
  // Get all results for this user
  const results = await QuizResult.find({ userId }).lean();
  
  if (results.length === 0) {
    return {
      totalQuizzesTaken: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      currentStreak: 0
    };
  }
  
  // Calculate total quizzes taken
  const totalQuizzesTaken = results.length;
  
  // Calculate average score
  const totalScore = results.reduce((acc, result) => {
    return acc + (result.score / result.totalQuestions);
  }, 0);
  const averageScore = totalScore / results.length;
  
  // Calculate total time spent
  const totalTimeSpent = results.reduce((acc, result) => acc + (result.timeSpent || 0), 0);
  
  // Get the current streak from the most recent result
  const latestResult = results.sort((a, b) => 
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )[0];
  
  const currentStreak = latestResult ? latestResult.streak : 0;
  
  return {
    totalQuizzesTaken,
    averageScore,
    totalTimeSpent,
    currentStreak
  };
}