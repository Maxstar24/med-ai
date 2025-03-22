import { NextRequest } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';

// POST /api/users/profile/study-time
export async function POST(req: NextRequest) {
  try {
    // Extract authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { minutes } = body;
    
    if (typeof minutes !== 'number' || minutes <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid study time' }), {
        status: 400,
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
    
    // Initialize gamification data if not exists
    if (!userData.gamification) {
      userData.gamification = {
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
      };
    }
    
    // Update study time
    const currentStudyTime = userData.gamification.studyTime || 0;
    const totalStudyTime = currentStudyTime + minutes;
    
    // Award XP: 1 XP per minute of study time
    const gainedXP = minutes;
    
    // Check for study time achievements
    const newAchievements: any[] = [];
    const studyTimeMilestones = [
      { id: 'time-60', name: 'Hour Scholar', description: 'Study for 1 hour', minutes: 60, icon: '⏱️' },
      { id: 'time-300', name: 'Dedicated Learner', description: 'Study for 5 hours', minutes: 300, icon: '⏰' },
      { id: 'time-600', name: 'Study Enthusiast', description: 'Study for 10 hours', minutes: 600, icon: '⌚' },
      { id: 'time-1200', name: 'Knowledge Devotee', description: 'Study for 20 hours', minutes: 1200, icon: '📚' },
      { id: 'time-3000', name: 'Medical Scholar', description: 'Study for 50 hours', minutes: 3000, icon: '👨‍⚕️' }
    ];
    
    // Check if user unlocked any study time milestones
    for (const milestone of studyTimeMilestones) {
      if (totalStudyTime >= milestone.minutes && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
        newAchievements.push({
          ...milestone,
          category: 'time',
          unlockedAt: new Date()
        });
      }
    }
    
    // Add XP
    const currentXP = userData.gamification.xp || 0;
    const newXP = currentXP + gainedXP;
    const currentLevel = userData.gamification.level || 1;
    const newLevel = 1 + Math.floor(newXP / 100);
    
    // Prepare update object
    const updateData: Record<string, any> = {
      'gamification.studyTime': totalStudyTime,
      'gamification.xp': newXP,
      'gamification.level': newLevel
    };
    
    // Apply updates
    if (newAchievements.length > 0) {
      await userRef.update({
        ...updateData,
        'gamification.achievements': FieldValue.arrayUnion(...newAchievements)
      });
    } else {
      await userRef.update(updateData);
    }
    
    // Return updated values
    return new Response(JSON.stringify({
      totalStudyTime,
      xp: newXP,
      level: newLevel,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in study time POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 