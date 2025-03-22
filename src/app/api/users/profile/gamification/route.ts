import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return static data to prevent any dependency on database or auth
  const mockGamificationData = {
    gamification: {
      xp: 100,
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
  };

  return NextResponse.json(mockGamificationData);
} 