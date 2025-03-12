import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import mongoose from 'mongoose';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// GET: Fetch a specific quiz by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    console.log('Params:', params);
    // Properly await params before using it
    const resolvedParams = await params;
    const id = resolvedParams.id;
    console.log('Quiz ID:', id);
    
    if (!id || id === 'undefined') {
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
    
    // Check if user has permission to view this quiz
    // Quiz is accessible if:
    // 1. It's public, or
    // 2. The user created it (check both MongoDB ID and Firebase UID)
    if (!quiz.isPublic && 
        quiz.createdBy.toString() !== user._id.toString() && 
        quiz.userFirebaseUid !== decodedToken.uid) {
      console.log('Access denied. Quiz is not public and user is not the creator.');
      console.log('Quiz createdBy:', quiz.createdBy.toString());
      console.log('User _id:', user._id.toString());
      console.log('Quiz userFirebaseUid:', quiz.userFirebaseUid);
      console.log('User firebaseUid:', decodedToken.uid);
      
      return NextResponse.json(
        { error: 'You do not have permission to view this quiz' },
        { status: 403 }
      );
    }
    
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
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
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
    const data = await request.json();
    
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
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific quiz by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
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
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}