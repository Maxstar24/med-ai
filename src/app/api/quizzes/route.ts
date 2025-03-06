import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';

// GET: Fetch all quizzes or filter by topic/difficulty
export async function GET(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the session for authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');
    
    // Build query based on filters
    const query: any = {};
    
    // Filter by topic if provided
    if (topic) query.topic = topic;
    
    // Filter by difficulty if provided
    if (difficulty) query.difficulty = difficulty;
    
    // Add filter to only show public quizzes or ones created by the current user
    query.$or = [
      { isPublic: true },
      { createdBy: new mongoose.Types.ObjectId(session.user.id) }
    ];
    
    // Fetch quizzes from the database
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean();
    
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}

// POST: Create a new quiz
export async function POST(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the session for authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.description || !body.questions || !body.difficulty || !body.topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create the quiz
    const quiz = new Quiz({
      ...body,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save the quiz to the database
    await quiz.save();
    
    return NextResponse.json(
      { message: 'Quiz created successfully', quiz },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}

// PATCH: Update a quiz (we'll handle this in the [id] route)

// DELETE: Delete multiple quizzes (bulk operation)
export async function DELETE(request: Request) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the session for authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body with quiz IDs to delete
    const { quizIds } = await request.json();
    
    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid quiz IDs provided' },
        { status: 400 }
      );
    }
    
    // Only allow deletion of quizzes created by the current user
    const result = await Quiz.deleteMany({
      _id: { $in: quizIds.map(id => new mongoose.Types.ObjectId(id)) },
      createdBy: session.user.id
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'No quizzes found or you are not authorized to delete them' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} quizzes`
    });
  } catch (error) {
    console.error('Error deleting quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to delete quizzes' },
      { status: 500 }
    );
  }
}