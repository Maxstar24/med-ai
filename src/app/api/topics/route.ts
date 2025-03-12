import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// GET: Fetch all unique topics
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
    
    console.log('Fetching topics for user:', decodedToken.uid);
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('User not found in database:', decodedToken.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Aggregate all unique topics from quizzes
    const topicsAggregation = await Quiz.aggregate([
      {
        $match: {
          $or: [
            { isPublic: true },
            { createdBy: user._id },
            { userFirebaseUid: decodedToken.uid }
          ]
        }
      },
      {
        $group: {
          _id: null,
          topics: { $addToSet: '$topic' }
        }
      }
    ]);
    
    // Extract topics from aggregation result
    const topics = topicsAggregation.length > 0 ? topicsAggregation[0].topics : [];
    
    // Sort topics alphabetically
    const sortedTopics = topics.sort();
    
    console.log(`Found ${sortedTopics.length} unique topics`);
    
    return NextResponse.json({ topics: sortedTopics });
  } catch (error: any) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Add a new custom topic
export async function POST(request: NextRequest) {
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
    
    // Get the request body
    const { topic } = await request.json();
    
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid topic provided' },
        { status: 400 }
      );
    }
    
    console.log('Adding new topic:', topic);
    
    // We don't actually need to store topics separately since they're part of quizzes
    // This endpoint is mainly for validation and future extensibility
    
    return NextResponse.json(
      { message: 'Topic added successfully', topic },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding topic:', error);
    return NextResponse.json(
      { error: 'Failed to add topic', details: error.message },
      { status: 500 }
    );
  }
} 