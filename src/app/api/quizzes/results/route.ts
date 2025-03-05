import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

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

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = quizResultSchema.parse(body);

    // Here you would typically save to your database
    // For now, we'll just return success
    // Example with MongoDB:
    /*
    const result = await db.collection('quiz_results').insertOne({
      ...validatedData,
      userId: session.user.id,
      createdAt: new Date(),
    });
    */

    return NextResponse.json({
      message: 'Quiz result saved successfully',
      // result: result.insertedId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Quiz result API error:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz result' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    // Here you would typically query your database
    // For now, return mock data
    const mockResults = [
      {
        id: '1',
        quizId: '1',
        score: 8,
        totalQuestions: 10,
        timeSpent: 600, // seconds
        completedAt: new Date().toISOString(),
        improvement: '+15%',
        streak: 3,
      },
      {
        id: '2',
        quizId: '1',
        score: 7,
        totalQuestions: 10,
        timeSpent: 540,
        completedAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
        improvement: '+5%',
        streak: 2,
      }
    ];

    // Filter results if quizId is provided
    const filteredResults = quizId
      ? mockResults.filter(r => r.quizId === quizId)
      : mockResults;

    return NextResponse.json({
      results: filteredResults,
      stats: {
        totalQuizzesTaken: filteredResults.length,
        averageScore: filteredResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / filteredResults.length,
        totalTimeSpent: filteredResults.reduce((acc, r) => acc + r.timeSpent, 0),
        currentStreak: Math.max(...filteredResults.map(r => r.streak)),
      }
    });
  } catch (error) {
    console.error('Quiz results API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    );
  }
} 