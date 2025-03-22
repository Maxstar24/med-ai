'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Award, Clock, BookOpen, GraduationCap, BrainCircuit } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { gamification, loadingGamification, refreshGamificationData } = useGamification();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      refreshGamificationData();
    }
  }, [user, authLoading, router, refreshGamificationData]);

  // Helper to format study time (from minutes to hours and minutes)
  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hours`;
    return `${hours} hours, ${mins} minutes`;
  };

  // Helper to calculate progress to next level
  const calculateLevelProgress = () => {
    if (!gamification) return 0;
    const currentXP = gamification.xp;
    const currentLevel = gamification.level;
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const xpForNextLevel = currentLevel * 100;
    const xpInCurrentLevel = currentXP - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    return Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);
  };

  // Group achievements by category for display
  const getAchievementsByCategory = () => {
    if (!gamification || !gamification.achievements || gamification.achievements.length === 0) {
      return {};
    }

    const categories: Record<string, Array<any>> = {};
    gamification.achievements.forEach(achievement => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = [];
      }
      categories[achievement.category].push(achievement);
    });

    return categories;
  };

  const achievementCategories = getAchievementsByCategory();

  // Loading skeleton
  if (authLoading || loadingGamification) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold">User Profile</h1>
      
      {/* User info and level */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>User Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.uid.slice(0, 8)}...</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Level {gamification.level}</CardTitle>
            <CardDescription>{gamification.xp} XP total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={calculateLevelProgress()} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {100 - calculateLevelProgress()} XP to Level {gamification.level + 1}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Streak</CardTitle>
            <CardDescription>Your learning consistency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-orange-500" />
                <p><strong>Current Streak:</strong> {gamification.currentStreak} days</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <p><strong>Longest Streak:</strong> {gamification.longestStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Stats and achievements tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Study Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p><strong>Cards Studied:</strong> {gamification.totalCardsStudied || 0}</p>
                  <p><strong>Quizzes Taken:</strong> {gamification.totalQuizzesTaken || 0}</p>
                  <p><strong>Daily Goal:</strong> {gamification.dailyProgress || 0}/{gamification.dailyGoal || 10} cards</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-purple-500" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p><strong>Correct Answers:</strong> {gamification.totalCorrectAnswers || 0}</p>
                  <p><strong>Incorrect Answers:</strong> {gamification.totalIncorrectAnswers || 0}</p>
                  <p><strong>Accuracy:</strong> {gamification.averageAccuracy || 0}%</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  Study Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p><strong>Total Time:</strong> {formatStudyTime(gamification.studyTime || 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="achievements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>
                You've unlocked {gamification.achievements?.length || 0} achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(achievementCategories).length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <p className="mt-4 text-lg text-muted-foreground">
                    No achievements unlocked yet. Keep studying!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(achievementCategories).map(([category, achievements]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="text-lg font-semibold capitalize">{category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {achievements.map((achievement) => (
                          <Badge 
                            key={achievement.id} 
                            variant="secondary"
                            className="px-3 py-1 text-sm"
                          >
                            <span className="mr-1">{achievement.icon}</span>
                            {achievement.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 