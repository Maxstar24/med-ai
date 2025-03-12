import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';
import User from '@/models/User';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// GET: Fetch all quizzes or filter by topic/difficulty
export async function GET(request: NextRequest) {
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
    
    console.log('Fetching quizzes for user:', decodedToken.uid);
    
    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build query based on filters
    const query: Record<string, any> = {};
    
    // Filter by topic if provided
    if (topic) query.topic = topic;
    
    // Filter by difficulty if provided
    if (difficulty) query.difficulty = difficulty;
    
    // Add filter to only show public quizzes or ones created by the current user
    query.$or = [
      { isPublic: true },
      { createdBy: user._id },
      { userFirebaseUid: decodedToken.uid }
    ];
    
    // Fetch quizzes from the database
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean();
    
    console.log(`Found ${quizzes.length} quizzes`);
    
    return NextResponse.json({ quizzes });
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new quiz
export async function POST(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Start timing the operation
    const startTime = Date.now();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Creating quiz for user:', decodedToken.uid);
    console.log('Token verification time:', Date.now() - startTime, 'ms');
    
    // Get the request body early to avoid waiting
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.description || !body.questions || !body.difficulty || !body.topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the user by Firebase UID
    const userStartTime = Date.now();
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log('User lookup time:', Date.now() - userStartTime, 'ms');
    
    let userId;
    
    if (!user) {
      console.log('User not found in database, creating new user');
      
      // Create the user
      const createUserStartTime = Date.now();
      const newUser = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        role: 'user',
      });
      
      await newUser.save();
      userId = newUser._id;
      console.log('User creation time:', Date.now() - createUserStartTime, 'ms');
    } else {
      userId = user._id;
    }
    
    // Create the quiz
    const quizStartTime = Date.now();
    const quiz = new Quiz({
      ...body,
      createdBy: userId,
      userFirebaseUid: decodedToken.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save the quiz to the database
    await quiz.save();
    console.log('Quiz creation time:', Date.now() - quizStartTime, 'ms');
    console.log('Quiz created successfully:', quiz._id);
    console.log('Total operation time:', Date.now() - startTime, 'ms');
    
    return NextResponse.json(
      { message: 'Quiz created successfully', quiz },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete multiple quizzes (bulk operation)
export async function DELETE(request: NextRequest) {
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
    
    console.log('Deleting quizzes for user:', decodedToken.uid);
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the request body with quiz IDs to delete
    const { quizIds } = await request.json() as { quizIds: string[] };
    
    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid quiz IDs provided' },
        { status: 400 }
      );
    }
    
    // Only allow deletion of quizzes created by the current user
    const result = await Quiz.deleteMany({
      _id: { $in: quizIds.map(id => new mongoose.Types.ObjectId(id)) },
      $or: [
        { createdBy: user._id },
        { userFirebaseUid: decodedToken.uid }
      ]
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'No quizzes found or you are not authorized to delete them' },
        { status: 404 }
      );
    }
    
    console.log(`Successfully deleted ${result.deletedCount} quizzes`);
    
    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} quizzes`
    });
  } catch (error: any) {
    console.error('Error deleting quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to delete quizzes', details: error.message },
      { status: 500 }
    );
  }
}