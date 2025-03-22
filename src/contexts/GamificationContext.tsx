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

    try {
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/xp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to add XP');
      }

      const data = await response.json();
      
      // Update local state
      setGamification(prevState => ({
        ...prevState,
        xp: data.newXP,
        level: data.newLevel
      }));
      
      // Check if user leveled up
      if (data.leveledUp) {
        toast({
          title: "Level Up!",
          description: `You've reached level ${data.newLevel}!`,
          variant: "default"
        });
      }
      
      // Update recent achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setRecentAchievements(prev => [...prev, ...data.newAchievements]);
        
        // Toast the most recent achievement
        const latestAchievement = data.newAchievements[0];
        toast({
          title: "Achievement Unlocked!",
          description: `${latestAchievement.name}: ${latestAchievement.description}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  };

  // Update user streak
  const updateStreak = async () => {
    if (!user) return;

    try {
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/streak', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update streak');
      }

      const data = await response.json();
      
      // Update local state
      setGamification(prevState => ({
        ...prevState,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak
      }));
      
      // If streak milestone reached, show toast
      if (data.streakMilestone) {
        toast({
          title: "Streak Milestone!",
          description: `You've maintained a ${data.currentStreak} day streak!`,
          variant: "default"
        });
      }
      
      // Update recent achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setRecentAchievements(prev => [...prev, ...data.newAchievements]);
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  // Track flashcard study activity
  const trackCardStudied = async (isCorrect: boolean) => {
    if (!user) return;

    try {
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          activityType: 'flashcard',
          isCorrect
        })
      });

      if (!response.ok) {
        throw new Error('Failed to track card activity');
      }

      const data = await response.json();
      
      // Update local state
      setGamification(prevState => ({
        ...prevState,
        totalCardsStudied: data.totalCardsStudied,
        totalCorrectAnswers: data.totalCorrectAnswers,
        totalIncorrectAnswers: data.totalIncorrectAnswers,
        averageAccuracy: data.averageAccuracy,
        dailyProgress: data.dailyProgress,
        xp: data.xp,
        level: data.level
      }));
      
      // Update recent achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setRecentAchievements(prev => [...prev, ...data.newAchievements]);
      }
      
      // Daily goal completed
      if (data.dailyGoalMet) {
        toast({
          title: "Daily Goal Complete!",
          description: `You've met your daily study goal!`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error tracking card study:', error);
    }
  };

  // Track quiz completion
  const trackQuizCompleted = async (correctAnswers: number, totalQuestions: number) => {
    if (!user) return;

    try {
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          activityType: 'quiz',
          correctAnswers,
          totalQuestions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to track quiz activity');
      }

      const data = await response.json();
      
      // Update local state
      setGamification(prevState => ({
        ...prevState,
        totalQuizzesTaken: data.totalQuizzesTaken,
        totalCorrectAnswers: data.totalCorrectAnswers,
        totalIncorrectAnswers: data.totalIncorrectAnswers,
        averageAccuracy: data.averageAccuracy,
        xp: data.xp,
        level: data.level
      }));
      
      // Update recent achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setRecentAchievements(prev => [...prev, ...data.newAchievements]);
      }
    } catch (error) {
      console.error('Error tracking quiz completion:', error);
    }
  };

  // Track study time
  const trackStudyTime = async (minutes: number) => {
    if (!user || minutes <= 0) return;

    try {
      const token = await refreshToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/users/profile/study-time', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minutes })
      });

      if (!response.ok) {
        throw new Error('Failed to track study time');
      }

      const data = await response.json();
      
      // Update local state
      setGamification(prevState => ({
        ...prevState,
        studyTime: data.totalStudyTime,
        xp: data.xp,
        level: data.level
      }));
      
      // Update recent achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setRecentAchievements(prev => [...prev, ...data.newAchievements]);
      }
    } catch (error) {
      console.error('Error tracking study time:', error);
    }
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

  // Update streak when user is active
  useEffect(() => {
    if (user) {
      updateStreak();
    }
  }, [user]);

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