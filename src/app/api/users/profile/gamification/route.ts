import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET /api/users/profile/gamification
export async function GET(req: NextRequest) {
  try {
    // Extract authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    
    // Verify the token and get user id
    const decodedToken = await verifyFirebaseToken(authHeader);
    if (!decodedToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const uid = decodedToken.uid;
    
    if (!uid) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If no gamification data exists yet, return default values
    if (!user.gamification) {
      return new Response(JSON.stringify({
        gamification: {
          xp: 0,
          level: 1,
          achievements: [],
          badges: [],
          specialtyProgress: [],
          currentStreak: 0,
          longestStreak: 0,
          dailyGoal: 10,
          dailyProgress: 0,
          totalCardsStudied: 0,
          totalQuizzesTaken: 0,
          totalCorrectAnswers: 0,
          totalIncorrectAnswers: 0,
          averageAccuracy: 0,
          studyTime: 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return gamification data
    return new Response(JSON.stringify({
      gamification: user.gamification
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in gamification GET:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 