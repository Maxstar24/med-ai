import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';
import { DecodedIdToken } from 'firebase-admin/auth';

// Define interfaces for type safety
interface IQuiz {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  isPublic: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  questions: Array<{
    _id: mongoose.Types.ObjectId | string;
    text: string;
    type: string;
    options: any[];
    correctAnswer: string | string[];
    explanation: string;
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

// GET: Fetch questions for a specific quiz
export async function GET(req, context) {
  const { params } = context;
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request?.headers?.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    
    // Find the quiz in the database
    const quiz = await Quiz.findById(quizId).lean();
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedQuiz = quiz as unknown as IQuiz;
    
    // Check if user has permission to access this quiz
    if (!typedQuiz.isPublic && typedQuiz.createdBy.toString() !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to access this quiz' },
        { status: 403 }
      );
    }
    
    // Return the questions from the quiz
    return NextResponse.json({
      questions: typedQuiz.questions
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
      { status: 500 }
    );
  }
}

// POST: Add a new question to a quiz
export async function POST(req, context) {
  const { params } = context;
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request?.headers?.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Get the request body
    let questionData = {};
    try {
      questionData = await request?.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedQuiz = quiz as unknown as IQuiz;
    
    // Check if user has permission to add questions to this quiz
    if (typedQuiz.createdBy.toString() !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this quiz' },
        { status: 403 }
      );
    }
    
    // Add the new question to the quiz
    quiz.questions.push(questionData);
    
    // Save the updated quiz
    await quiz.save();
    
    return NextResponse.json({
      message: 'Question added successfully',
      question: quiz.questions[quiz.questions.length - 1]
    });
  } catch (error) {
    console.error('Error adding question:', error);
    return NextResponse.json(
      { error: 'Failed to add question' },
      { status: 500 }
    );
  }
}

// PATCH: Update a question in a quiz
export async function PATCH(req, context) {
  const { params } = context;
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request?.headers?.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Get the request body
    let questionId, updates;
    try {
      const body = await request?.json();
      questionId = body.questionId;
      updates = body.updates;
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedQuiz = quiz as unknown as IQuiz;
    
    // Check if user has permission to update questions in this quiz
    if (typedQuiz.createdBy.toString() !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this quiz' },
        { status: 403 }
      );
    }
    
    // Find the question to update
    const questionIndex = quiz.questions.findIndex(
      (q: any) => q._id.toString() === questionId
    );
    
    if (questionIndex === -1) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Update the question
    Object.keys(updates).forEach((key) => {
      quiz.questions[questionIndex][key] = updates[key];
    });
    
    // Save the updated quiz
    await quiz.save();
    
    return NextResponse.json({
      message: 'Question updated successfully',
      question: quiz.questions[questionIndex]
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a question from a quiz
export async function DELETE(req, context) {
  const { params } = context;
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request?.headers?.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the quiz ID from the URL parameters
    const quizId = params.id;
    
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Get the question ID from the request
    let questionId = null;
    try {
      if (request?.url) {
        const { searchParams } = new URL(request.url);
        questionId = searchParams.get('questionId');
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }
    
    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Type assertion for TypeScript
    const typedQuiz = quiz as unknown as IQuiz;
    
    // Check if user has permission to delete questions from this quiz
    if (typedQuiz.createdBy.toString() !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this quiz' },
        { status: 403 }
      );
    }
    
    // Find the question to delete
    const questionIndex = quiz.questions.findIndex(
      (q: any) => q._id.toString() === questionId
    );
    
    if (questionIndex === -1) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Remove the question
    quiz.questions.splice(questionIndex, 1);
    
    // Save the updated quiz
    await quiz.save();
    
    return NextResponse.json({
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}