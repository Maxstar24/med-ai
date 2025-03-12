import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import QuizResult from '@/models/QuizResult';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// Define types for question and option
interface QuizQuestion {
  _id: mongoose.Types.ObjectId | string;
  type: 'multiple-choice' | 'true-false' | 'spot' | 'saq';
  options: any[];
  correctAnswer: string | string[];
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

const quizResultSchema = z.object({
  quizId: z.string(),
  answers: z.array(answerSchema),
});

// GET: Fetch quiz results for a user (with optional quiz filter)
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Fetching quiz results for user:', decodedToken.uid);
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    
    // Build the query based on parameters
    const query: Record<string, any> = { userId: decodedToken.uid };
    if (quizId) {
      try {
        query.quizId = new mongoose.Types.ObjectId(quizId);
      } catch (error) {
        console.error('Invalid quizId format:', quizId);
        return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
      }
    }
    
    console.log('Query:', JSON.stringify(query));
    
    try {
      // Fetch results from the database
      const results = await QuizResult.find(query)
        .sort({ completedAt: -1 }) // Sort by most recent first
        .lean();
      
      console.log(`Found ${results.length} results`);
      
      // Calculate statistics
      const stats = await calculateUserStats(decodedToken.uid);
      
      return NextResponse.json({ success: true, results, stats });
    } catch (dbError: any) {
      console.error('Database query error:', dbError.message);
      
      // If there's an issue with the model schema, try a more direct approach
      if (dbError.name === 'CastError' && dbError.path === 'userId') {
        console.log('Attempting alternative query approach...');
        
        // Use the native MongoDB driver directly to bypass Mongoose schema validation
        const connection = mongoose.connection;
        if (!connection || !connection.db) {
          console.error('MongoDB connection not established');
          throw new Error('Database connection not established');
        }
        
        const db = connection.db;
        const resultsCollection = db.collection('quizresults');
        
        const rawResults = await resultsCollection.find({ userId: decodedToken.uid })
          .sort({ completedAt: -1 })
          .toArray();
        
        console.log(`Found ${rawResults.length} results using direct MongoDB query`);
        
        // Transform the results to match the expected format
        const transformedResults = rawResults.map(result => ({
          id: result._id.toString(),
          quizId: result.quizId.toString(),
          userId: result.userId,
          score: result.score,
          totalQuestions: result.totalQuestions,
          timeSpent: result.timeSpent,
          completedAt: result.completedAt,
          improvement: result.improvement,
          streak: result.streak
        }));
        
        // Calculate statistics manually
        const stats = {
          totalQuizzesTaken: transformedResults.length,
          averageScore: transformedResults.length > 0 
            ? transformedResults.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / transformedResults.length 
            : 0,
          totalTimeSpent: transformedResults.reduce((acc, r) => acc + (r.timeSpent || 0), 0),
          currentStreak: transformedResults.length > 0 ? transformedResults[0].streak : 0
        };
        
        return NextResponse.json({ success: true, results: transformedResults, stats });
      }
      
      throw dbError; // Re-throw if it's not a userId cast error
    }
  } catch (error: any) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Submit a new quiz result
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Submitting quiz result for user:', decodedToken.uid);
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate required fields
    if (!body.quizId || !body.answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the quiz exists
    let quizObjectId;
    try {
      quizObjectId = new mongoose.Types.ObjectId(body.quizId);
    } catch (error) {
      console.error('Invalid quizId format:', body.quizId);
      return NextResponse.json({ error: 'Invalid quiz ID format' }, { status: 400 });
    }
    
    const quiz = await Quiz.findById(quizObjectId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    console.log('Quiz found:', quiz);
    
    // Calculate total questions
    const totalQuestions = quiz.questions.length;
    
    // Process answers and calculate score
    const processedAnswers = [];
    let score = 0;
    
    for (let i = 0; i < body.answers.length; i++) {
      const answer = body.answers[i];
      const question = quiz.questions.find((q: QuizQuestion) => q._id.toString() === answer.questionId);
      
      if (!question) continue;
      
      let isCorrect = false;
      let userAnswer: string | null = null;
      
      // Handle different question types
      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        // For multiple choice and true/false questions
        if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
          const selectedOption = question.options.find((opt: any, idx: number) => {
            const optionId = `option-${i}-${idx}`;
            return answer.selectedOptionIds.includes(optionId);
          });
          
          userAnswer = selectedOption || '';
          isCorrect = userAnswer === question.correctAnswer;
        }
      } 
      else if (question.type === 'spot') {
        // For spot (image identification) questions
        if (answer.shortAnswer && answer.shortAnswer.trim()) {
          userAnswer = answer.shortAnswer.trim().toLowerCase();
          
          // Check against all acceptable answers
          if (Array.isArray(question.correctAnswer)) {
            isCorrect = question.correctAnswer.some(
              (correct: string) => correct.toLowerCase() === userAnswer
            );
          } else {
            isCorrect = (question.correctAnswer as string).toLowerCase() === userAnswer;
          }
        }
      }
      else if (question.type === 'saq') {
        // For short answer questions
        if (answer.shortAnswer && answer.shortAnswer.trim()) {
          userAnswer = answer.shortAnswer.trim().toLowerCase();
          
          // Check against all acceptable answers
          if (Array.isArray(question.correctAnswer)) {
            isCorrect = question.correctAnswer.some(
              (correct: string) => correct.toLowerCase() === userAnswer
            );
          } else {
            isCorrect = (question.correctAnswer as string).toLowerCase() === userAnswer;
          }
        }
      }
      
      // Add to processed answers
      processedAnswers.push({
        questionId: answer.questionId,
        userAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      });
      
      // Update score
      if (isCorrect) score++;
    }
    
    // Check if this user has previous results for this quiz
    const previousResult = await QuizResult.findOne({ 
      userId: decodedToken.uid,
      quizId: body.quizId 
    }).sort({ completedAt: -1 });
    console.log('Previous result:', previousResult);
    
    // Calculate improvement if there's a previous result
    let improvement = null;
    let streak = 1;
    
    if (previousResult) {
      const prevScore = previousResult.score / previousResult.totalQuestions;
      const currentScore = score / totalQuestions;
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
    try {
      const quizResult = new QuizResult({
        quizId: quizObjectId,
        userId: decodedToken.uid, // Using Firebase UID as string
        score,
        totalQuestions,
        timeSpent: body.timeSpent || 0,
        answers: processedAnswers,
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
        result: resultWithQuizInfo,
        resultId: quizResult._id
      }, { status: 201 });
    } catch (saveError: any) {
      console.error('Error saving quiz result:', saveError);
      
      // If there's an issue with the model schema, try a more direct approach
      if (saveError.name === 'CastError' && saveError.path === 'userId') {
        console.log('Attempting alternative save approach...');
        
        // Use the native MongoDB driver directly
        const connection = mongoose.connection;
        if (!connection || !connection.db) {
          console.error('MongoDB connection not established');
          throw new Error('Database connection not established');
        }
        
        const db = connection.db;
        const resultsCollection = db.collection('quizresults');
        
        const resultDoc = {
          quizId: quizObjectId,
          userId: decodedToken.uid,
          score,
          totalQuestions,
          timeSpent: body.timeSpent || 0,
          answers: processedAnswers,
          completedAt: new Date(),
          improvement,
          streak,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const insertResult = await resultsCollection.insertOne(resultDoc);
        console.log('Quiz result saved successfully using direct MongoDB insert');
        
        return NextResponse.json({
          message: 'Quiz result submitted successfully',
          result: {
            ...resultDoc,
            id: insertResult.insertedId.toString(),
            questions: quiz.questions
          },
          resultId: insertResult.insertedId.toString()
        }, { status: 201 });
      }
      
      throw saveError; // Re-throw if it's not a userId cast error
    }
  } catch (error: any) {
    console.error('Error submitting quiz result:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz result', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate user statistics
async function calculateUserStats(userId: string) {
  try {
    console.log('Calculating stats for user:', userId);
    
    // Get all results for this user
    const results = await QuizResult.find({ userId }).lean();
    
    console.log(`Found ${results.length} results for stats calculation`);
    
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
  } catch (error: any) {
    console.error('Error calculating user stats:', error);
    
    // If there's an issue with the model schema, try a more direct approach
    if (error.name === 'CastError' && error.path === 'userId') {
      console.log('Attempting alternative stats calculation approach...');
      
      // Use the native MongoDB driver directly
      const connection = mongoose.connection;
      if (!connection || !connection.db) {
        console.error('MongoDB connection not established');
        return {
          totalQuizzesTaken: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          currentStreak: 0
        };
      }
      
      const db = connection.db;
      const resultsCollection = db.collection('quizresults');
      
      const rawResults = await resultsCollection.find({ userId }).toArray();
      
      if (rawResults.length === 0) {
        return {
          totalQuizzesTaken: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          currentStreak: 0
        };
      }
      
      // Calculate stats manually
      const totalQuizzesTaken = rawResults.length;
      
      const totalScore = rawResults.reduce((acc, result) => {
        return acc + (result.score / result.totalQuestions);
      }, 0);
      const averageScore = totalScore / rawResults.length;
      
      const totalTimeSpent = rawResults.reduce((acc, result) => acc + (result.timeSpent || 0), 0);
      
      const sortedResults = [...rawResults].sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      
      const currentStreak = sortedResults.length > 0 ? sortedResults[0].streak : 0;
      
      return {
        totalQuizzesTaken,
        averageScore,
        totalTimeSpent,
        currentStreak
      };
    }
    
    // Return default stats on error
    return {
      totalQuizzesTaken: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      currentStreak: 0
    };
  }
}