import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

// POST /api/users/profile/streak
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
    
    // Get current date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get last active date
    let lastActive = user.gamification.lastActive ? new Date(user.gamification.lastActive) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }
    
    let currentStreak = user.gamification.currentStreak || 0;
    let longestStreak = user.gamification.longestStreak || 0;
    let streakMilestone = false;
    let newAchievements: any[] = [];
    
    // If first time or not active yesterday, reset streak
    if (!lastActive || (today.getTime() - lastActive.getTime() > 24 * 60 * 60 * 1000)) {
      // More than a day gap, reset streak to 1 (today)
      currentStreak = 1;
    } else if (today.getTime() > lastActive.getTime()) {
      // Active yesterday or same day, increment streak
      currentStreak += 1;
      
      // Check if we've hit a new streak record
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      
      // Check for streak milestones
      const streakMilestones = [
        { days: 3, name: 'On Fire', id: 'streak-3', description: 'Study 3 days in a row', icon: '🔥' },
        { days: 7, name: 'Week Warrior', id: 'streak-7', description: 'Study 7 days in a row', icon: '📅' },
        { days: 30, name: 'Monthly Dedication', id: 'streak-30', description: 'Study 30 days in a row', icon: '📊' },
        { days: 100, name: 'Century Club', id: 'streak-100', description: 'Study 100 days in a row', icon: '🌟' },
        { days: 365, name: 'Year of Knowledge', id: 'streak-365', description: 'Study 365 days in a row', icon: '🏆' }
      ];
      
      // Check if we've hit any streak milestones
      for (const milestone of streakMilestones) {
        if (currentStreak === milestone.days && 
            (!user.gamification.achievements || 
             !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
          newAchievements.push({
            id: milestone.id,
            name: milestone.name,
            description: milestone.description,
            category: 'streak',
            icon: milestone.icon,
            unlockedAt: new Date()
          });
          
          streakMilestone = true;
        }
      }
    }
    
    // Update user data
    user.gamification.currentStreak = currentStreak;
    user.gamification.longestStreak = longestStreak;
    user.gamification.lastActive = new Date();
    
    // Add achievements if any
    if (newAchievements.length > 0) {
      // Add new achievements to existing ones
      if (!user.gamification.achievements) {
        user.gamification.achievements = [];
      }
      user.gamification.achievements.push(...newAchievements);
    }
    
    // Save updated user
    await user.save();
    
    // Return updated values
    return new Response(JSON.stringify({
      currentStreak,
      longestStreak,
      streakMilestone,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in streak POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 