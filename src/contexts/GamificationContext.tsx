'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

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

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, refreshToken } = useAuth();
  const { toast } = useToast();
  const [gamification, setGamification] = useState<GamificationState>(defaultGamificationState);
  const [loadingGamification, setLoadingGamification] = useState(true);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);

  // Fetch user's gamification data
  const refreshGamificationData = async () => {
    if (!user) {
      setLoadingGamification(false);
      return;
    }

    try {
      setLoadingGamification(true);
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/gamification', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gamification data');
      }

      const data = await response.json();
      setGamification(data.gamification);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoadingGamification(false);
    }
  };

  // Add XP and potentially level up
  const addXP = async (amount: number, reason?: string) => {
    if (!user) return;
    // Implementation would go here
  };

  // Update user streak
  const updateStreak = async () => {
    if (!user) return;
    // Implementation would go here
  };

  // Track flashcard study activity
  const trackCardStudied = async (isCorrect: boolean) => {
    if (!user) return;
    // Implementation would go here
  };

  // Track quiz completion
  const trackQuizCompleted = async (correctAnswers: number, totalQuestions: number) => {
    if (!user) return;
    // Implementation would go here
  };

  // Track study time
  const trackStudyTime = async (minutes: number) => {
    if (!user || minutes <= 0) return;
    // Implementation would go here
  };

  // Clear recent achievements
  const clearRecentAchievements = () => {
    setRecentAchievements([]);
  };

  // Load gamification data on auth state change
  useEffect(() => {
    if (!authLoading && user) {
      refreshGamificationData();
    } else if (!authLoading && !user) {
      setGamification(defaultGamificationState);
      setLoadingGamification(false);
    }
  }, [user, authLoading]);

  const value = {
    gamification,
    loadingGamification,
    addXP,
    updateStreak,
    trackCardStudied,
    trackQuizCompleted,
    trackStudyTime,
    refreshGamificationData,
    recentAchievements,
    clearRecentAchievements
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
} 