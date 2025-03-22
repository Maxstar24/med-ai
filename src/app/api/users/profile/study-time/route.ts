import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

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
    
    // Update study time
    const currentStudyTime = user.gamification.studyTime || 0;
    const newStudyTime = currentStudyTime + minutes;
    
    // Calculate XP: 2 XP per minute of study time
    const xpEarned = Math.round(minutes * 2);
    
    // Update user data
    user.gamification.studyTime = newStudyTime;
    user.gamification.xp = (user.gamification.xp || 0) + xpEarned;
    
    // Calculate level
    user.gamification.level = 1 + Math.floor(user.gamification.xp / 100);
    
    // Check for study time achievements
    const newAchievements = [];
    
    // Study time milestones (in minutes)
    const timeMillestones = [
      { id: 'time-60', name: 'Study Hour', description: 'Study for 1 hour total', minutes: 60, icon: '⏱️' },
      { id: 'time-300', name: 'Study Dedication', description: 'Study for 5 hours total', minutes: 300, icon: '⏰' },
      { id: 'time-600', name: 'Study Enthusiast', description: 'Study for 10 hours total', minutes: 600, icon: '🕙' },
      { id: 'time-1800', name: 'Study Devotee', description: 'Study for 30 hours total', minutes: 1800, icon: '📚' },
      { id: 'time-3600', name: 'Study Master', description: 'Study for 60 hours total', minutes: 3600, icon: '🧠' }
    ];
    
    // Check if user unlocked any time milestones
    for (const milestone of timeMillestones) {
      if (newStudyTime >= milestone.minutes && 
          (!user.gamification.achievements || 
           !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
        newAchievements.push({
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          category: 'study-time',
          icon: milestone.icon,
          unlockedAt: new Date()
        });
      }
    }
    
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
      studyTime: newStudyTime,
      xpEarned,
      level: user.gamification.level,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in study-time POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 