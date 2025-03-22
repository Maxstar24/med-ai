'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  xp: 250,
  level: 2,
  achievements: [{
    id: '1',
    name: 'First Steps',
    description: 'Completed your first study session',
    icon: '🚀',
    unlockedAt: new Date(),
    category: 'general'
  }],
  badges: [{
    id: '1',
    name: 'Beginner',
    description: 'Started your learning journey',
    icon: '🥉',
    tier: 'bronze'
  }],
  specialtyProgress: [],
  currentStreak: 5,
  longestStreak: 10,
  dailyGoal: 10,
  dailyProgress: 5,
  totalCardsStudied: 120,
  totalQuizzesTaken: 15,
  totalCorrectAnswers: 95,
  totalIncorrectAnswers: 25,
  averageAccuracy: 85,
  studyTime: 180
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
  const { user, loading: authLoading } = useAuth();
  const [gamification, setGamification] = useState<GamificationState>(defaultGamificationState);
  const [loadingGamification, setLoadingGamification] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const hasInitialized = useRef(false);

  // Safely fetch gamification data only once when the component mounts or user changes
  const refreshGamificationData = async () => {
    if (!user || hasInitialized.current) return;
    
    try {
      setLoadingGamification(true);
      
      // In a real implementation, this would be a fetch call to the API
      // For now, use the default data
      setGamification(defaultGamificationState);
      hasInitialized.current = true;
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoadingGamification(false);
    }
  };

  // Simplified stubs for the other methods
  const addXP = async (amount: number, reason?: string) => {
    if (!user) return;
    
    setGamification(prev => ({
      ...prev,
      xp: prev.xp + amount,
      level: 1 + Math.floor(Math.sqrt((prev.xp + amount) / 100))
    }));
  };

  const updateStreak = async () => {
    if (!user) return;
    // Implementation would go here
  };

  const trackCardStudied = async (isCorrect: boolean) => {
    if (!user) return;
    // Implementation would go here
  };

  const trackQuizCompleted = async (correctAnswers: number, totalQuestions: number) => {
    if (!user) return;
    // Implementation would go here
  };

  const trackStudyTime = async (minutes: number) => {
    if (!user || minutes <= 0) return;
    // Implementation would go here
  };

  const clearRecentAchievements = () => {
    setRecentAchievements([]);
  };

  // Safely initialize on mount or user change
  useEffect(() => {
    if (!authLoading && user) {
      hasInitialized.current = false;
      refreshGamificationData();
    } else if (!authLoading && !user) {
      setGamification(defaultGamificationState);
      setLoadingGamification(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // Deliberately omit refreshGamificationData

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