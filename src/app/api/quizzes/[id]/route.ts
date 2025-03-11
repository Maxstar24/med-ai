import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';
import { DecodedIdToken } from 'firebase-admin/auth';

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
    
    // Check if user has permission to view this quiz
    if (!quiz.isPublic && quiz.createdBy.toString() !== decodedToken.uid) {
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
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Get the request body
    const updates = await request.json();
    
    // Find the quiz
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update this quiz
    if (quiz.createdBy.toString() !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to update this quiz' },
        { status: 403 }
      );
    }
    
    console.log('Request body:', updates);
    console.log('Quiz before update:', quiz);
    
    // Apply updates
    Object.keys(updates).forEach((key) => {
      // Prevent changing createdBy field
      if (key !== 'createdBy' && key !== '_id' && key !== 'id') {
        (quiz as any)[key] = updates[key];
      }
    });
    
    // Update the updatedAt timestamp
    quiz.updatedAt = new Date();
    
    // Save the updated quiz
    await quiz.save();
    
    return NextResponse.json({
      message: 'Quiz updated successfully',
      quiz
    });
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
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid quiz ID' },
        { status: 400 }
      );
    }
    
    // Find and delete the quiz only if it belongs to the current user
    const result = await Quiz.findOneAndDelete({
      _id: id,
      createdBy: decodedToken.uid
    });
    
    if (!result) {
      return NextResponse.json(
        { error: 'Quiz not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}