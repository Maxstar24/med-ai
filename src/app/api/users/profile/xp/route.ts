import { NextRequest } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';

interface RouteContext {
  params: {
    id: string;
  };
}

// POST /api/users/profile/xp
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
    const { amount, reason } = body;
    
    if (typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid XP amount' }), {
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
    
    // Add XP to user
    const currentXP = userData.gamification.xp || 0;
    const newXP = currentXP + amount;
    
    // Calculate level based on XP (adjust formula as needed)
    // Simple formula: level = 1 + floor(xp / 100)
    const currentLevel = userData.gamification.level || 1;
    const newLevel = 1 + Math.floor(newXP / 100);
    const leveledUp = newLevel > currentLevel;
    
    // Check for achievements
    const newAchievements = [];
    
    // XP milestone achievements
    const xpMilestones = [
      { id: 'xp-100', name: 'Beginner Learner', description: 'Earn 100 XP', xp: 100, icon: '🌱' },
      { id: 'xp-500', name: 'Dedicated Student', description: 'Earn 500 XP', xp: 500, icon: '📚' },
      { id: 'xp-1000', name: 'Knowledge Seeker', description: 'Earn 1,000 XP', xp: 1000, icon: '🔍' },
      { id: 'xp-5000', name: 'Medical Scholar', description: 'Earn 5,000 XP', xp: 5000, icon: '🧠' },
      { id: 'xp-10000', name: 'Future Doctor', description: 'Earn 10,000 XP', xp: 10000, icon: '⚕️' }
    ];
    
    // Check if user unlocked any XP milestones
    for (const milestone of xpMilestones) {
      if (newXP >= milestone.xp && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
        newAchievements.push({
          ...milestone,
          category: 'xp',
          unlockedAt: new Date()
        });
      }
    }
    
    // Level milestone achievements
    const levelMilestones = [
      { id: 'level-5', name: 'Rising Star', description: 'Reach level 5', level: 5, icon: '⭐' },
      { id: 'level-10', name: 'Dedicated Learner', description: 'Reach level 10', level: 10, icon: '🌟' },
      { id: 'level-25', name: 'Medical Expert', description: 'Reach level 25', level: 25, icon: '🏆' },
      { id: 'level-50', name: 'Medical Virtuoso', description: 'Reach level 50', level: 50, icon: '👨‍⚕️' },
      { id: 'level-100', name: 'Medical Legend', description: 'Reach level 100', level: 100, icon: '🌠' }
    ];
    
    // Check if user unlocked any level milestones
    for (const milestone of levelMilestones) {
      if (newLevel >= milestone.level && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
        newAchievements.push({
          ...milestone,
          category: 'level',
          unlockedAt: new Date()
        });
      }
    }
    
    // Prepare update object
    const updateData: Record<string, any> = {
      'gamification.xp': newXP,
      'gamification.level': newLevel
    };
    
    // Add achievements if any
    if (newAchievements.length > 0) {
      // For firebase-admin, we need to use FieldValue.arrayUnion
      await userRef.update({
        ...updateData,
        'gamification.achievements': FieldValue.arrayUnion(...newAchievements)
      });
    } else {
      await userRef.update(updateData);
    }
    
    // Return updated values
    return new Response(JSON.stringify({
      newXP,
      newLevel,
      leveledUp,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in XP POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 