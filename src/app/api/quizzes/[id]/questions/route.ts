import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz, { IQuiz } from '@/models/Quiz';

// GET: Fetch questions for a specific quiz
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    
    // Find the quiz in the database and specify the return type
    const quiz = await Quiz.findById(quizId).lean() as unknown as IQuiz;
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to access this quiz
    if (!quiz.isPublic && quiz.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this quiz' },
        { status: 403 }
      );
    }
    
    // Return the questions from the quiz
    return NextResponse.json({
      questions: quiz.questions
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
      { status: 500 }
    );
  }
}