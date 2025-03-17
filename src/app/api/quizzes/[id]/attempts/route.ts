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
  try {
    console.log('PATCH request received for quiz attempt');
    
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
    
    const userId = decodedToken.uid;
    console.log('User ID:', userId);
    
    // Parse request body
    const data = await req.json();
    console.log('Request data:', JSON.stringify(data));
    
    const { attemptId, answers, isComplete } = data;
    
    if (!attemptId) {
      console.error('Missing attempt ID');
      return NextResponse.json(
        { error: 'Missing attempt ID' },
        { status: 400 }
      );
    }
    
    // Find the attempt
    const attempt = await QuizAttempt.findById(attemptId);
    console.log('Found attempt:', attempt ? 'yes' : 'no');
    
    if (!attempt) {
      console.error('Attempt not found');
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }
    
    // Verify the attempt belongs to the user
    if (attempt.userId !== userId) {
      console.error('Attempt does not belong to user');
      return NextResponse.json(
        { error: 'Unauthorized - Attempt does not belong to user' },
        { status: 403 }
      );
    }
    
    // Add answers to the attempt
    if (answers && answers.length > 0) {
      console.log('Adding answers to attempt');
      
      answers.forEach(answer => {
        const existingAnswerIndex = attempt.answers.findIndex(
          a => a.questionId.toString() === answer.questionId
        );
        
        if (existingAnswerIndex >= 0) {
          // Update existing answer
          attempt.answers[existingAnswerIndex] = {
            ...attempt.answers[existingAnswerIndex],
            ...answer
          };
        } else {
          // Add new answer
          attempt.answers.push(answer);
        }
      });
      
      attempt.questionsAttempted = attempt.answers.length;
    }
    
    // If the quiz is complete, calculate the score and mark as completed
    if (isComplete) {
      console.log('Marking attempt as complete');
      
      attempt.completedAt = new Date();
      
      // Get the quiz to calculate the score
      const { params } = context;
      const quizId = params.id;
      
      const quiz = await Quiz.findById(quizId);
      
      if (!quiz) {
        console.error('Quiz not found');
        return NextResponse.json(
          { error: 'Quiz not found' },
          { status: 404 }
        );
      }
      
      // Calculate the score
      const totalQuestions = quiz.questions.length;
      const correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
      
      // Calculate score as percentage
      const score = totalQuestions > 0 
        ? (correctAnswers / totalQuestions) * 100 
        : 0;
      
      console.log(`Score calculation: ${correctAnswers} correct out of ${totalQuestions} = ${score}%`);
      
      attempt.score = score;
      attempt.totalQuestions = totalQuestions;
      
      // Update analytics
      await updateQuizAnalytics(quizId, attempt);
    }
    
    // Save the attempt
    await attempt.save();
    console.log('Attempt saved successfully');
    
    return NextResponse.json({ 
      success: true, 
      attempt: {
        _id: attempt._id,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        questionsAttempted: attempt.questionsAttempted,
        answers: attempt.answers
      }
    });
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