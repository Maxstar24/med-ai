import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

// POST /api/users/profile/activity
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
    const { activityType, isCorrect, correctAnswers, totalQuestions } = body;
    
    if (!activityType || !['flashcard', 'quiz'].includes(activityType)) {
      return new Response(JSON.stringify({ error: 'Invalid activity type' }), {
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
    
    // Update activity based on type
    let xpEarned = 0;
    
    if (activityType === 'flashcard') {
      // Increment total cards studied
      user.gamification.totalCardsStudied = (user.gamification.totalCardsStudied || 0) + 1;
      
      // Update daily progress
      user.gamification.dailyProgress = (user.gamification.dailyProgress || 0) + 1;
      
      // Award XP based on rating
      if (isCorrect) {
        user.gamification.totalCorrectAnswers = (user.gamification.totalCorrectAnswers || 0) + 1;
        xpEarned = 10; // 10 XP for correct flashcard
      } else {
        user.gamification.totalIncorrectAnswers = (user.gamification.totalIncorrectAnswers || 0) + 1;
        xpEarned = 2; // 2 XP for reviewing a flashcard even if incorrect
      }
    } else if (activityType === 'quiz') {
      // Increment total quizzes taken
      user.gamification.totalQuizzesTaken = (user.gamification.totalQuizzesTaken || 0) + 1;
      
      // Update daily progress (count quiz as 5 cards)
      user.gamification.dailyProgress = (user.gamification.dailyProgress || 0) + 5;
      
      // Calculate score and XP
      if (correctAnswers !== undefined && totalQuestions !== undefined) {
        const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Award XP based on score
        xpEarned = Math.round(scorePercentage / 10) * 5; // 0-50 XP based on score
        
        // Update correct/incorrect answers
        user.gamification.totalCorrectAnswers = (user.gamification.totalCorrectAnswers || 0) + correctAnswers;
        user.gamification.totalIncorrectAnswers = (user.gamification.totalIncorrectAnswers || 0) + (totalQuestions - correctAnswers);
      } else {
        // If no score details, award base XP
        xpEarned = 15; // Base XP for quiz completion
      }
    }
    
    // Update XP
    user.gamification.xp = (user.gamification.xp || 0) + xpEarned;
    
    // Calculate level
    user.gamification.level = 1 + Math.floor(user.gamification.xp / 100);
    
    // Calculate accuracy
    const totalAnswers = (user.gamification.totalCorrectAnswers || 0) + (user.gamification.totalIncorrectAnswers || 0);
    if (totalAnswers > 0) {
      user.gamification.averageAccuracy = Math.round((user.gamification.totalCorrectAnswers || 0) * 100 / totalAnswers);
    }
    
    // Check if daily goal is met
    const dailyGoalMet = (user.gamification.dailyProgress || 0) >= (user.gamification.dailyGoal || 10);
    
    // Update streak if needed
    // If this is first activity of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastActive = user.gamification.lastActive ? new Date(user.gamification.lastActive) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }
    
    let streakUpdated = false;
    let currentStreak = user.gamification.currentStreak || 0;
    let longestStreak = user.gamification.longestStreak || 0;
    
    // If first time or not active yesterday, reset streak
    if (!lastActive || (today.getTime() - lastActive.getTime() > 24 * 60 * 60 * 1000)) {
      // More than a day gap, reset streak to 1 (today)
      currentStreak = 1;
      streakUpdated = true;
    } else if (today.getTime() > lastActive.getTime()) {
      // Active yesterday, increment streak
      currentStreak += 1;
      streakUpdated = true;
      
      // Check if we've hit a new streak record
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }
    
    if (streakUpdated) {
      user.gamification.currentStreak = currentStreak;
      user.gamification.longestStreak = longestStreak;
    }
    
    // Always update last active time
    user.gamification.lastActive = new Date();
    
    // Check for unlockable achievements
    const newAchievements = [];
    
    // Activity achievements
    if (activityType === 'flashcard') {
      const flashcardMilestones = [
        { id: 'cards-10', name: 'Flashcard Novice', description: 'Study 10 flashcards', count: 10, icon: '🃏' },
        { id: 'cards-50', name: 'Flashcard Enthusiast', description: 'Study 50 flashcards', count: 50, icon: '🎴' },
        { id: 'cards-100', name: 'Flashcard Expert', description: 'Study 100 flashcards', count: 100, icon: '📇' },
        { id: 'cards-500', name: 'Flashcard Master', description: 'Study 500 flashcards', count: 500, icon: '🏅' },
        { id: 'cards-1000', name: 'Flashcard Guru', description: 'Study 1,000 flashcards', count: 1000, icon: '🏆' }
      ];
      
      // Check card milestones
      for (const milestone of flashcardMilestones) {
        if (user.gamification.totalCardsStudied >= milestone.count && 
            (!user.gamification.achievements || 
             !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
          newAchievements.push({
            id: milestone.id,
            name: milestone.name,
            description: milestone.description,
            category: 'flashcards',
            icon: milestone.icon,
            unlockedAt: new Date()
          });
        }
      }
    } else if (activityType === 'quiz') {
      const quizMilestones = [
        { id: 'quiz-5', name: 'Quiz Taker', description: 'Complete 5 quizzes', count: 5, icon: '📝' },
        { id: 'quiz-10', name: 'Quiz Enthusiast', description: 'Complete 10 quizzes', count: 10, icon: '📋' },
        { id: 'quiz-25', name: 'Quiz Expert', description: 'Complete 25 quizzes', count: 25, icon: '📊' },
        { id: 'quiz-50', name: 'Quiz Master', description: 'Complete 50 quizzes', count: 50, icon: '🎓' },
        { id: 'quiz-100', name: 'Quiz Champion', description: 'Complete 100 quizzes', count: 100, icon: '🏆' }
      ];
      
      // Check quiz milestones
      for (const milestone of quizMilestones) {
        if (user.gamification.totalQuizzesTaken >= milestone.count && 
            (!user.gamification.achievements || 
             !user.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
          newAchievements.push({
            id: milestone.id,
            name: milestone.name,
            description: milestone.description,
            category: 'quizzes',
            icon: milestone.icon,
            unlockedAt: new Date()
          });
        }
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
      updated: true,
      xpEarned,
      newLevel: user.gamification.level,
      dailyGoalMet,
      streakUpdated: streakUpdated ? {
        currentStreak,
        longestStreak
      } : undefined,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in activity POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 