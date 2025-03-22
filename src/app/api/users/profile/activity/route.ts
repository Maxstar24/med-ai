import { NextRequest } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin, verifyFirebaseToken } from '@/lib/firebase-admin';

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
    
    // Track activity based on type
    let updateData: Record<string, any> = {};
    let gainedXP = 0;
    let newAchievements: any[] = [];
    
    if (activityType === 'flashcard') {
      // Validate parameters
      if (typeof isCorrect !== 'boolean') {
        return new Response(JSON.stringify({ error: 'isCorrect parameter is required for flashcard activity' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Update card counts
      const totalCardsStudied = (userData.gamification.totalCardsStudied || 0) + 1;
      const totalCorrectAnswers = (userData.gamification.totalCorrectAnswers || 0) + (isCorrect ? 1 : 0);
      const totalIncorrectAnswers = (userData.gamification.totalIncorrectAnswers || 0) + (isCorrect ? 0 : 1);
      
      // Calculate accuracy
      const accuracyDenominator = totalCorrectAnswers + totalIncorrectAnswers;
      const averageAccuracy = accuracyDenominator > 0 
        ? Math.round((totalCorrectAnswers / accuracyDenominator) * 100) 
        : 0;
      
      // Update daily progress
      const dailyProgress = (userData.gamification.dailyProgress || 0) + 1;
      const dailyGoal = userData.gamification.dailyGoal || 10;
      const dailyGoalMet = dailyProgress >= dailyGoal;
      
      // Award XP: 5 for correct, 1 for incorrect
      gainedXP = isCorrect ? 5 : 1;
      
      // Prepare update data
      updateData = {
        'gamification.totalCardsStudied': totalCardsStudied,
        'gamification.totalCorrectAnswers': totalCorrectAnswers,
        'gamification.totalIncorrectAnswers': totalIncorrectAnswers,
        'gamification.averageAccuracy': averageAccuracy,
        'gamification.dailyProgress': dailyProgress
      };
      
      // Check for card count achievements
      const cardMilestones = [
        { id: 'cards-10', name: 'Getting Started', description: 'Study 10 flashcards', count: 10, icon: '🔄' },
        { id: 'cards-100', name: 'Learning Basics', description: 'Study 100 flashcards', count: 100, icon: '📝' },
        { id: 'cards-500', name: 'Memory Master', description: 'Study 500 flashcards', count: 500, icon: '🧠' },
        { id: 'cards-1000', name: 'Study Champion', description: 'Study 1,000 flashcards', count: 1000, icon: '🏅' },
        { id: 'cards-5000', name: 'Flashcard Legend', description: 'Study 5,000 flashcards', count: 5000, icon: '👑' }
      ];
      
      // Check if user unlocked any card milestones
      for (const milestone of cardMilestones) {
        if (totalCardsStudied >= milestone.count && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
          newAchievements.push({
            ...milestone,
            category: 'cards',
            unlockedAt: new Date()
          });
        }
      }
      
      // Check for accuracy achievements
      if (totalCardsStudied >= 100) {
        const accuracyAchievements = [
          { id: 'accuracy-70', name: 'Above Average', description: 'Maintain 70% accuracy after 100+ cards', threshold: 70, icon: '📈' },
          { id: 'accuracy-80', name: 'High Performer', description: 'Maintain 80% accuracy after 100+ cards', threshold: 80, icon: '📊' },
          { id: 'accuracy-90', name: 'Excellence', description: 'Maintain 90% accuracy after 100+ cards', threshold: 90, icon: '🎯' },
          { id: 'accuracy-95', name: 'Near Perfect', description: 'Maintain 95% accuracy after 100+ cards', threshold: 95, icon: '⭐' },
          { id: 'accuracy-100', name: 'Perfect Recall', description: 'Maintain 100% accuracy after 100+ cards', threshold: 100, icon: '🌟' }
        ];
        
        // Check if user unlocked any accuracy achievements
        for (const achievement of accuracyAchievements) {
          if (averageAccuracy >= achievement.threshold && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === achievement.id))) {
            newAchievements.push({
              ...achievement,
              category: 'accuracy',
              unlockedAt: new Date()
            });
          }
        }
      }
      
      // Check for daily goal achievements
      if (dailyGoalMet && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === 'daily-goal'))) {
        newAchievements.push({
          id: 'daily-goal',
          name: 'Goal Crusher',
          description: 'Complete your daily study goal',
          category: 'daily',
          icon: '🎯',
          unlockedAt: new Date()
        });
        // Bonus XP for meeting daily goal
        gainedXP += 20;
      }
      
      // Return data to include in response
      const returnData = {
        totalCardsStudied,
        totalCorrectAnswers,
        totalIncorrectAnswers,
        averageAccuracy,
        dailyProgress,
        dailyGoalMet
      };
      
      // Add XP
      const currentXP = userData.gamification.xp || 0;
      const newXP = currentXP + gainedXP;
      const currentLevel = userData.gamification.level || 1;
      const newLevel = 1 + Math.floor(newXP / 100);
      
      updateData['gamification.xp'] = newXP;
      updateData['gamification.level'] = newLevel;
      
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
        ...returnData,
        xp: newXP,
        level: newLevel,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (activityType === 'quiz') {
      // Validate parameters
      if (typeof correctAnswers !== 'number' || typeof totalQuestions !== 'number') {
        return new Response(JSON.stringify({ error: 'correctAnswers and totalQuestions parameters are required for quiz activity' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Update quiz counts
      const totalQuizzesTaken = (userData.gamification.totalQuizzesTaken || 0) + 1;
      const newTotalCorrectAnswers = (userData.gamification.totalCorrectAnswers || 0) + correctAnswers;
      const newTotalIncorrectAnswers = (userData.gamification.totalIncorrectAnswers || 0) + (totalQuestions - correctAnswers);
      
      // Calculate accuracy
      const accuracyDenominator = newTotalCorrectAnswers + newTotalIncorrectAnswers;
      const averageAccuracy = accuracyDenominator > 0 
        ? Math.round((newTotalCorrectAnswers / accuracyDenominator) * 100) 
        : 0;
      
      // Award XP: 10 base + 5 per correct answer
      gainedXP = 10 + (correctAnswers * 5);
      
      // Prepare update data
      updateData = {
        'gamification.totalQuizzesTaken': totalQuizzesTaken,
        'gamification.totalCorrectAnswers': newTotalCorrectAnswers,
        'gamification.totalIncorrectAnswers': newTotalIncorrectAnswers,
        'gamification.averageAccuracy': averageAccuracy
      };
      
      // Check for quiz count achievements
      const quizMilestones = [
        { id: 'quiz-1', name: 'Quiz Taker', description: 'Complete your first quiz', count: 1, icon: '📝' },
        { id: 'quiz-10', name: 'Quiz Regular', description: 'Complete 10 quizzes', count: 10, icon: '📊' },
        { id: 'quiz-50', name: 'Quiz Expert', description: 'Complete 50 quizzes', count: 50, icon: '🧩' },
        { id: 'quiz-100', name: 'Quiz Master', description: 'Complete 100 quizzes', count: 100, icon: '🏆' }
      ];
      
      // Check if user unlocked any quiz milestones
      for (const milestone of quizMilestones) {
        if (totalQuizzesTaken >= milestone.count && (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === milestone.id))) {
          newAchievements.push({
            ...milestone,
            category: 'quiz',
            unlockedAt: new Date()
          });
        }
      }
      
      // Check for perfect score achievements
      if (correctAnswers === totalQuestions && totalQuestions >= 5) {
        const perfectScoreId = 'quiz-perfect';
        if (!userData.gamification.achievements || !userData.gamification.achievements.some((a: { id: string }) => a.id === perfectScoreId)) {
          newAchievements.push({
            id: perfectScoreId,
            name: 'Perfect Score',
            description: 'Get all questions correct in a quiz',
            category: 'quiz',
            icon: '🎯',
            unlockedAt: new Date()
          });
          // Bonus XP for perfect score
          gainedXP += 25;
        }
      }
      
      // Add XP
      const currentXP = userData.gamification.xp || 0;
      const newXP = currentXP + gainedXP;
      const currentLevel = userData.gamification.level || 1;
      const newLevel = 1 + Math.floor(newXP / 100);
      
      updateData['gamification.xp'] = newXP;
      updateData['gamification.level'] = newLevel;
      
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
        totalQuizzesTaken,
        totalCorrectAnswers: newTotalCorrectAnswers,
        totalIncorrectAnswers: newTotalIncorrectAnswers,
        averageAccuracy,
        xp: newXP,
        level: newLevel,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // This shouldn't be reached due to validation at the beginning
    return new Response(JSON.stringify({ error: 'Invalid activity type' }), {
      status: 400,
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