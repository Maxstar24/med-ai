import { NextRequest } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';

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
    
    // Get user document from Firestore
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userData = userDoc.data();
    if (!userData) {
      return new Response(JSON.stringify({ error: 'User data not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If no gamification data exists yet, return default values
    if (!userData.gamification) {
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
      gamification: userData.gamification
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