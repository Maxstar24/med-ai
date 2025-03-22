'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  category: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface SpecialtyProgress {
  specialtyId: string;
  name: string;
  progress: number;
  cardsCompleted: number;
  quizzesCompleted: number;
  lastStudied?: Date;
}

interface GamificationState {
  xp: number;
  level: number;
  achievements: Achievement[];
  badges: Badge[];
  specialtyProgress: SpecialtyProgress[];
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  dailyProgress: number;
  totalCardsStudied: number;
  totalQuizzesTaken: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  averageAccuracy: number;
  studyTime: number;
}

interface GamificationContextType {
  gamification: GamificationState;
  loadingGamification: boolean;
  addXP: (amount: number, reason?: string) => Promise<void>;
  updateStreak: () => Promise<void>;
  trackCardStudied: (isCorrect: boolean) => Promise<void>;
  trackQuizCompleted: (correctAnswers: number, totalQuestions: number) => Promise<void>;
  trackStudyTime: (minutes: number) => Promise<void>;
  refreshGamificationData: () => Promise<void>;
  recentAchievements: Achievement[];
  clearRecentAchievements: () => void;
}

const defaultGamificationState: GamificationState = {
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

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};

// Create stub functions that do nothing
const noopAsync = async () => {};
const noop = () => {};

export function GamificationProvider({ children }: { children: ReactNode }) {
  // Use static default state without any API calls
  const [gamification] = useState<GamificationState>(defaultGamificationState);
  const [loadingGamification] = useState(false);
  const [recentAchievements] = useState<Achievement[]>([]);

  // Provide stub implementations that don't make API calls
  const value = {
    gamification,
    loadingGamification,
    addXP: noopAsync,
    updateStreak: noopAsync,
    trackCardStudied: noopAsync,
    trackQuizCompleted: noopAsync,
    trackStudyTime: noopAsync,
    refreshGamificationData: noopAsync,
    recentAchievements,
    clearRecentAchievements: noop
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
} 