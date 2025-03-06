import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import mongoose from 'mongoose';

// GET: Fetch quizzes created by the current user
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
    const query: any = {
      createdBy: new mongoose.Types.ObjectId(session.user.id)
    };
    
    // Filter by topic if provided
    if (topic && topic !== 'all') query.topic = topic;
    
    // Filter by difficulty if provided
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    
    // Fetch quizzes from the database
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 }) // Sort by most recent first
      .lean();
    
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching user quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}