import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

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
    
    // Initialize gamification data if not exists
    if (!user.gamification) {
      user.gamification = {
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
    const currentXP = user.gamification.xp || 0;
    const newXP = currentXP + amount;
    
    // Calculate level based on XP (adjust formula as needed)
    // Simple formula: level = 1 + floor(xp / 100)
    const currentLevel = user.gamification.level || 1;
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
      if (newXP >= milestone.xp && 
          (!user.gamification.achievements || 
           !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
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
      if (newLevel >= milestone.level && 
          (!user.gamification.achievements || 
           !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
        newAchievements.push({
          ...milestone,
          category: 'level',
          unlockedAt: new Date()
        });
      }
    }
    
    // Update user data
    user.gamification.xp = newXP;
    user.gamification.level = newLevel;
    
    // Add achievements if any
    if (newAchievements.length > 0) {
      if (!user.gamification.achievements) {
        user.gamification.achievements = [];
      }
      user.gamification.achievements.push(...newAchievements);
    }
    
    // Save updated user
    await user.save();
    
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