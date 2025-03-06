import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import { IQuizResult, IQuiz } from '@/types/models';

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

    // Get the quiz result ID from the URL parameters
    const resultId = params.id;

    // Find the quiz result in the database
    const result: IQuizResult | null = await QuizResult.findById(resultId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Quiz result not found' },
        { status: 404 }
      );
    }
    
    // Only allow access to the user's own results
    if (result.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this result' },
        { status: 403 }
      );
    }
    
    // Get the associated quiz to include questions
    const quiz: IQuiz | null = await Quiz.findById(result.quizId);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Associated quiz not found' },
        { status: 404 }
      );
    }
    
    // Combine the result with the questions from the quiz
    const fullResult = {
      ...result,
      questions: quiz.questions
    };

    return NextResponse.json({ result: fullResult });
  } catch (error) {
    console.error('Quiz result API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the quiz result' },
      { status: 500 }
    );
  }
}