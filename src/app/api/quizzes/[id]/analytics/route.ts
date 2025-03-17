import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';

interface AnalyticsContext {
  params: {
    id: string;
  };
}

interface QuestionStat {
  questionId: string;
  successRate: number;
  averageTimeSpent: number;
  skipRate: number;
}

interface UserPerformance {
  percentile: number;
  rank: string;
  fastestTime: boolean;
  highestAccuracy: boolean;
}

interface AccuracyTrendPoint {
  date: string;
  score: number;
}

// Helper function to verify Firebase token
async function verifyFirebaseToken(authHeader: string | null) {
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

// GET: Fetch analytics for a specific quiz
export async function GET(req: NextRequest, context: AnalyticsContext) {
  const { params } = context;
  const quizId = params.id;
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = decodedToken.uid;
    
    // Validate quizId
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
    }
    
    // Fetch the quiz to ensure it exists
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Fetch all attempts for this quiz
    const allAttempts = await QuizResult.find({ quizId: new mongoose.Types.ObjectId(quizId) });
    
    if (!allAttempts || allAttempts.length === 0) {
      return NextResponse.json({ 
        analytics: {
          totalAttempts: 0,
          completionRate: 0,
          averageScore: 0,
          averageTimeSpent: 0,
          questionStats: [],
          userPerformance: null,
          accuracyTrend: []
        }
      });
    }
    
    // Calculate basic analytics
    const totalAttempts = allAttempts.length;
    const completedAttempts = allAttempts.filter(attempt => attempt.completedAt).length;
    const completionRate = (completedAttempts / totalAttempts) * 100;
    
    const scores = allAttempts.map(attempt => attempt.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const timeSpents = allAttempts.map(attempt => attempt.timeSpent);
    const averageTimeSpent = timeSpents.reduce((sum, time) => sum + time, 0) / timeSpents.length;
    
    // Calculate question-specific stats
    const questionStats: QuestionStat[] = [];
    
    // Get all unique question IDs from the quiz
    const questionIds = quiz.questions.map((q: any) => q._id.toString());
    
    // For each question, calculate success rate, average time, and skip rate
    for (const questionId of questionIds) {
      const questionAttempts = allAttempts.flatMap(attempt => 
        attempt.answers.filter((answer: any) => answer.questionId.toString() === questionId)
      );
      
      if (questionAttempts.length === 0) {
        questionStats.push({
          questionId,
          successRate: 0,
          averageTimeSpent: 0,
          skipRate: 100
        });
        continue;
      }
      
      const correctAnswers = questionAttempts.filter(answer => answer.isCorrect).length;
      const successRate = (correctAnswers / questionAttempts.length) * 100;
      
      const answeredQuestions = questionAttempts.filter(answer => answer.timeSpent);
      const skipRate = ((questionAttempts.length - answeredQuestions.length) / questionAttempts.length) * 100;
      
      const timeSpents = answeredQuestions.map(answer => answer.timeSpent || 0);
      const averageTimeSpent = timeSpents.length > 0 
        ? timeSpents.reduce((sum, time) => sum + time, 0) / timeSpents.length 
        : 0;
      
      questionStats.push({
        questionId,
        successRate,
        averageTimeSpent,
        skipRate
      });
    }
    
    // Get user's attempts for this quiz
    const userAttempts = allAttempts.filter(attempt => attempt.userId === userId);
    
    // Calculate user performance metrics
    let userPerformance: UserPerformance | null = null;
    let accuracyTrend: AccuracyTrendPoint[] = [];
    
    if (userAttempts.length > 0) {
      // Get the user's most recent attempt
      const latestAttempt = userAttempts.sort((a, b) => 
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      )[0];
      
      // Calculate percentile
      const userScore = latestAttempt.score;
      const lowerScores = scores.filter(score => score < userScore).length;
      const percentile = Math.round((lowerScores / scores.length) * 100);
      
      // Determine rank based on percentile
      let rank = 'Beginner';
      if (percentile >= 95) rank = 'Expert';
      else if (percentile >= 80) rank = 'Advanced';
      else if (percentile >= 60) rank = 'Intermediate';
      else if (percentile >= 40) rank = 'Novice';
      
      // Check if user has fastest time or highest accuracy
      const fastestTime = latestAttempt.timeSpent === Math.min(...timeSpents);
      const highestAccuracy = userScore === Math.max(...scores);
      
      userPerformance = {
        percentile,
        rank,
        fastestTime,
        highestAccuracy
      };
      
      // Generate accuracy trend from user's attempts
      accuracyTrend = userAttempts
        .filter(attempt => attempt.completedAt)
        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
        .map(attempt => ({
          date: attempt.completedAt.toISOString(),
          score: attempt.score
        }));
    }
    
    // Return the analytics data
    return NextResponse.json({
      analytics: {
        totalAttempts,
        completionRate,
        averageScore,
        averageTimeSpent,
        questionStats,
        userPerformance,
        accuracyTrend
      }
    });
    
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz analytics' }, { status: 500 });
  }
} 