import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { IQuizResult, IQuiz } from '@/types/models';

const quizResultSchema = z.object({
  quizId: z.string(),
  score: z.number(),
  totalQuestions: z.number(),
  timeSpent: z.number(),
  answers: z.array(z.object({
    questionId: z.string(),
    userAnswer: z.union([z.string(), z.number(), z.boolean()]),
    isCorrect: z.boolean(),
    timeSpent: z.number().optional(),
  })),
  completedAt: z.string().datetime(),
});

// GET: Fetch quiz results for a user (with optional quiz filter)
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the session for authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    
    // Build the query based on parameters
    const query: any = { userId: session.user.id };
    if (quizId) {
      query.quizId = new mongoose.Types.ObjectId(quizId);
    }
    
    // Fetch results from the database
    const results = await QuizResult.find(query)
      .sort({ completedAt: -1 }) // Sort by most recent first
      .lean();
    
    // Calculate statistics
    const stats = await calculateUserStats(session.user.id);
    
    return NextResponse.json({ results, stats });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    );
  }
}

// POST: Submit a new quiz result
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the session for authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate required fields
    if (!body.quizId || !body.score || body.answers === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the quiz exists
    const quiz = await Quiz.findById(body.quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    console.log('Quiz found:', quiz);
    
    // Calculate total questions
    const totalQuestions = quiz.questions.length;
    
    // Check if this user has previous results for this quiz
    const previousResult = await QuizResult.findOne({ 
      userId: session.user.id,
      quizId: body.quizId 
    }).sort({ completedAt: -1 });
    console.log('Previous result:', previousResult);
    
    // Calculate improvement if there's a previous result
    let improvement = null;
    let streak = 1;
    
    if (previousResult) {
      const prevScore = previousResult.score / previousResult.totalQuestions;
      const currentScore = body.score / totalQuestions;
      const improvementPercentage = ((currentScore - prevScore) * 100).toFixed(0);
      
      if (Number(improvementPercentage) > 0) {
        improvement = `+${improvementPercentage}%`;
      } else if (Number(improvementPercentage) < 0) {
        improvement = `${improvementPercentage}%`;
      } else {
        improvement = '0%';
      }
      
      // Update streak based on previous streak
      streak = previousResult.streak;
      
      // Calculate if this attempt was on a different day than the previous one
      const prevDate = new Date(previousResult.completedAt).setHours(0, 0, 0, 0);
      const currentDate = new Date().setHours(0, 0, 0, 0);
      
      if (prevDate < currentDate) {
        // It's a new day, increment streak
        streak += 1;
      }
    }
    
    // Create the quiz result
    const quizResult = new QuizResult({
      quizId: body.quizId,
      userId: session.user.id,
      score: body.score,
      totalQuestions,
      timeSpent: body.timeSpent || 0,
      answers: body.answers,
      completedAt: new Date(),
      improvement,
      streak
    });
    console.log('Quiz result to save:', quizResult);
    
    // Save the result to the database
    await quizResult.save();
    console.log('Quiz result saved successfully');
    
    // Prepare response with additional data
    const resultWithQuizInfo = {
      ...quizResult.toJSON(),
      questions: quiz.questions  // Include the questions in the response
    };
    
    return NextResponse.json({
      message: 'Quiz result submitted successfully',
      result: resultWithQuizInfo
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz result' },
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