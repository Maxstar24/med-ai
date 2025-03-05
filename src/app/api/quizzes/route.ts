import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple-choice', 'true-false', 'fill-in-blank', 'matching']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.boolean()]),
  explanation: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  topic: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const quizSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(questionSchema),
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
    const validatedData = quizSchema.parse(body);

    // Here you would typically save to your database
    // For now, we'll just return success
    // Example with MongoDB:
    /*
    const quiz = await db.collection('quizzes').insertOne({
      ...validatedData,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    */

    return NextResponse.json({
      message: 'Quiz saved successfully',
      // quiz: quiz.insertedId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Quiz API error:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz' },
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
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    // Here you would typically query your database
    // For now, return mock data
    const mockQuizzes = [
      {
        id: '1',
        title: 'Cardiology Basics',
        description: 'Basic concepts in cardiology',
        questionCount: 10,
        difficulty: 'beginner',
        topic: 'Cardiology',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Advanced Pharmacology',
        description: 'Complex drug interactions and mechanisms',
        questionCount: 15,
        difficulty: 'advanced',
        topic: 'Pharmacology',
        createdAt: new Date().toISOString(),
      },
    ];

    // Filter mock data
    let filteredQuizzes = [...mockQuizzes];
    if (topic) {
      filteredQuizzes = filteredQuizzes.filter(q => q.topic === topic);
    }
    if (difficulty) {
      filteredQuizzes = filteredQuizzes.filter(q => q.difficulty === difficulty);
    }

    return NextResponse.json({
      quizzes: filteredQuizzes
    });
  } catch (error) {
    console.error('Quiz API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
} 