import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import QuizAnalytics from '@/models/QuizAnalytics';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// Helper function to update quiz analytics
async function updateQuizAnalytics(quizId: string, attempt: any) {
  try {
    let analytics = await QuizAnalytics.findOne({ quizId });
    
    if (!analytics) {
      analytics = new QuizAnalytics({
        quizId,
        totalAttempts: 0,
        completionRate: 0,
        averageScore: 0,
        averageTimeSpent: 0,
        questionStats: []
      });
    }
    
    await analytics.updateWithAttempt(attempt);
  } catch (error) {
    console.error('Error updating quiz analytics:', error);
  }
}

// POST: Create a new quiz attempt
export async function POST(req, context) {
  const { params } = context;
  try {
    console.log('POST request received for quiz attempt');
    
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization') || '';
    console.log('Authorization header present:', !!authHeader);
    
    const decodedToken = await verifyFirebaseToken(authHeader);
    console.log('Token verification result:', decodedToken ? 'success' : 'failure');
    
    if (!decodedToken) {
      console.error('Token verification failed');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    console.log('Quiz ID:', quizId);
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    console.log('Quiz found:', !!quiz);
    
    if (!quiz) {
      console.error('Quiz not found');
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Create a new attempt
    console.log('Creating new attempt');
    const attempt = new QuizAttempt({
      quizId,
      userFirebaseUid: decodedToken.uid,
      userId: decodedToken.uid,
      startedAt: new Date(),
      totalQuestions: quiz.questions.length,
      questionsAttempted: 0,
      score: 0,
      answers: []
    });
    
    console.log('Saving attempt');
    await attempt.save();
    console.log('Attempt saved successfully');
    
    return NextResponse.json({ attempt });
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz attempt' },
      { status: 500 }
    );
  }
}

// PATCH: Update a quiz attempt with answers
export async function PATCH(req, context) {
  const { params } = context;
  try {
    console.log('PATCH request received for quiz attempt');
    
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Authorization header missing');
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    // Pass the entire authHeader to verifyFirebaseToken
    // Let the function handle the Bearer prefix
    const decodedToken = await verifyFirebaseToken(authHeader);
    console.log('Token verification result:', decodedToken ? 'success' : 'failure');
    
    if (!decodedToken) {
      console.error('Token verification failed');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    const userFirebaseUid = decodedToken.uid;
    console.log('User Firebase UID:', userFirebaseUid);
    
    // Get the request body
    const body = await req.json();
    const { attemptId, answers, isComplete } = body;
    console.log('Request body:', { attemptId, answersCount: answers?.length, isComplete });
    
    if (!attemptId) {
      console.error('attemptId is missing in request');
      return NextResponse.json(
        { error: 'attemptId is required' },
        { status: 400 }
      );
    }
    
    // Find the attempt
    console.log('Finding attempt with ID:', attemptId);
    const attempt = await QuizAttempt.findById(attemptId);
    console.log('Attempt found:', !!attempt);
    
    if (!attempt) {
      console.error('Attempt not found');
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }
    
    // Verify the user owns this attempt
    console.log('Attempt userFirebaseUid:', attempt.userFirebaseUid);
    console.log('Attempt userId:', attempt.userId);
    console.log('Current userFirebaseUid:', userFirebaseUid);
    
    const isOwner = attempt.userFirebaseUid === userFirebaseUid || attempt.userId === userFirebaseUid;
    console.log('Is owner:', isOwner);
    
    if (!isOwner) {
      console.error('User is not the owner of this attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Not the owner' },
        { status: 403 }
      );
    }
    
    // Update the attempt with new answers
    if (answers && answers.length > 0) {
      // Ensure each answer has a valid questionId
      const validAnswers = answers.filter((answer: { questionId?: string }) => answer.questionId);
      console.log('Valid answers count:', validAnswers.length);
      
      if (validAnswers.length > 0) {
        attempt.answers = attempt.answers.concat(validAnswers);
        attempt.questionsAttempted = attempt.answers.length;
        
        // Calculate score
        const correctAnswers = attempt.answers.filter((answer: { isCorrect: boolean }) => answer.isCorrect).length;
        attempt.score = (correctAnswers / attempt.totalQuestions) * 100;
        console.log('Updated score:', attempt.score);
      }
    }
    
    // Mark as complete if specified
    if (isComplete) {
      console.log('Marking attempt as complete');
      attempt.completedAt = new Date();
      
      // Update analytics
      await updateQuizAnalytics(params.id, attempt);
    }
    
    console.log('Saving attempt');
    await attempt.save();
    console.log('Attempt saved successfully');
    
    return NextResponse.json({ attempt });
  } catch (error) {
    console.error('Error updating quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz attempt' },
      { status: 500 }
    );
  }
}

// GET: Get attempts for a quiz
export async function GET(req, context) {
  const { params } = context;
  try {
    console.log('GET request received for quiz attempts');
    
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');

    // Verify Firebase token
    const authHeader = req.headers.get('authorization') || '';
    console.log('Authorization header present:', !!authHeader);
    
    const decodedToken = await verifyFirebaseToken(authHeader);
    console.log('Token verification result:', decodedToken ? 'success' : 'failure');
    
    if (!decodedToken) {
      console.error('Token verification failed');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    const userFirebaseUid = decodedToken.uid;
    console.log('Quiz ID:', quizId);
    console.log('User Firebase UID:', userFirebaseUid);

    // Find all attempts for this quiz by this user (check both userFirebaseUid and userId fields)
    console.log('Finding attempts');
    const attempts = await QuizAttempt.find({
      quizId,
      $or: [
        { userFirebaseUid },
        { userId: userFirebaseUid }
      ]
    }).sort({ startedAt: -1 });
    console.log('Found attempts:', attempts.length);

    // Get analytics for this quiz
    console.log('Finding analytics');
    const analytics = await QuizAnalytics.findOne({ quizId });
    console.log('Analytics found:', !!analytics);

    return NextResponse.json({ attempts, analytics });
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz attempts' },
      { status: 500 }
    );
  }
} 