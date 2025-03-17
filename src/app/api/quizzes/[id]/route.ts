import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import mongoose from 'mongoose';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// GET: Fetch a specific quiz by ID
export async function GET(req, context) {
  try {
    console.log('GET request received for quiz');
    
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization') || '';
    console.log('Authorization header present:', !!authHeader);
    
    const decodedToken = await verifyFirebaseToken(authHeader);
    console.log('Token verification result:', decodedToken ? 'success' : 'failure');
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const { params } = context;
    console.log('Params:', params);
    const id = params.id;
    console.log('Quiz ID:', id);
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Find the quiz in the database
    console.log('Finding quiz in database...');
    const quiz = await Quiz.findById(id);
    console.log('Quiz found:', quiz ? 'yes' : 'no');
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has permission to access this quiz
    console.log('Finding user with Firebase UID:', decodedToken.uid);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log('User found:', user ? user._id : 'no');
    
    console.log('Checking quiz permissions...');
    console.log('Quiz public:', quiz.public);
    console.log('Quiz createdBy:', quiz.createdBy);
    console.log('User _id:', user?._id);
    console.log('Quiz userFirebaseUid:', quiz.userFirebaseUid);
    console.log('User firebaseUid:', user?.firebaseUid);
    
    // Allow access if the quiz is public or if the user created it
    if (!quiz.public && 
        (!user || 
         (quiz.createdBy && quiz.createdBy.toString() !== user._id.toString() && 
          quiz.userFirebaseUid !== user.firebaseUid))) {
      return NextResponse.json(
        { error: 'Unauthorized to access this quiz' },
        { status: 403 }
      );
    }
    
    console.log('Access granted - returning quiz');
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

// PATCH: Update a specific quiz by ID
export async function PATCH(req, context) {
  const { params } = context;
  try {
    // Defensive check for request object
    if (!req || !req.headers) {
      console.error('Request or headers object is undefined');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Find the quiz in the database
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has permission to update this quiz
    if (quiz.createdBy.toString() !== user._id.toString() && 
        quiz.userFirebaseUid !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to update this quiz' },
        { status: 403 }
      );
    }
    
    // Get the updated quiz data from the request body
    let data = {};
    try {
      data = await req.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Update the quiz in the database
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { 
        ...data,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('Detailed error in quiz update:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { 
          error: 'Failed to update quiz',
          details: {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        },
        { status: 500 }
      );
    }
    // If it's not an Error instance, just log what we can
    console.error('Unknown error:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific quiz by ID
export async function DELETE(req, context) {
  const { params } = context;
  try {
    // Defensive check for request object
    if (!req || !req.headers) {
      console.error('Request or headers object is undefined');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = req.headers.get('authorization') || '';
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Find the quiz in the database
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has permission to delete this quiz
    if (quiz.createdBy.toString() !== user._id.toString() && 
        quiz.userFirebaseUid !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this quiz' },
        { status: 403 }
      );
    }
    
    // Delete the quiz from the database
    await Quiz.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Quiz deleted successfully' });
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('Detailed error in quiz deletion:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { 
          error: 'Failed to delete quiz',
          details: {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        },
        { status: 500 }
      );
    }
    // If it's not an Error instance, just log what we can
    console.error('Unknown error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}