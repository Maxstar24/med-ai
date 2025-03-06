import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import { IQuiz } from '@/types/models';

// GET: Fetch a specific quiz by ID
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
    console.log('Params:', params);
    const id = params.id;
    console.log('Quiz ID:', id);
    
    // Find the quiz in the database
    const quiz: IQuiz | null = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to view this quiz
    if (!quiz.isPublic && quiz.createdBy.toString() !== session.user.id) {
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
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const id = params.id;
    
    // Get the request body
    const updates = await request.json();
    
    // Find the quiz
    const quiz: IQuiz | null = await Quiz.findById(id);
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update this quiz
    if (quiz.createdBy.toString() !== session.user.id) {
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
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the quiz ID from the URL parameters
    const id = params.id;
    
    // Find and delete the quiz only if it belongs to the current user
    const result = await Quiz.findOneAndDelete({
      _id: id,
      createdBy: session.user.id
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