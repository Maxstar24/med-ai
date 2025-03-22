'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Award, User, LogOut, Settings, Crown } from 'lucide-react';
import { Badge } from './ui/badge';

export function UserProfile() {
  const { user, logout } = useAuth();
  const { gamification } = useGamification();

  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium">
        Login
      </Link>
    );
  }

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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  // Get the most recent achievements (up to 3)
  const getRecentAchievements = () => {
    if (!gamification.achievements || gamification.achievements.length === 0) {
      return [];
    }

    return [...gamification.achievements]
      .sort((a, b) => {
        const dateA = a.unlockedAt instanceof Date ? a.unlockedAt : new Date(a.unlockedAt);
        const dateB = b.unlockedAt instanceof Date ? b.unlockedAt : new Date(b.unlockedAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  };

  const recentAchievements = getRecentAchievements();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <Avatar className="h-8 w-8 border-2 border-primary">
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium">{user.email?.split('@')[0]}</div>
            <div className="text-xs text-muted-foreground">Level {gamification.level}</div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.email}</p>
            <div className="flex items-center">
              <Crown className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm">Level {gamification.level}</span>
            </div>
            <div className="flex flex-col space-y-1 mt-1">
              <div className="flex justify-between text-xs">
                <span>{gamification.xp} XP</span>
                <span>{(gamification.level * 100)} XP</span>
              </div>
              <Progress value={calculateLevelProgress()} className="h-2" />
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentAchievements.length > 0 && (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                <span>Recent Achievements</span>
              </div>
            </DropdownMenuLabel>
            <div className="px-2 py-1 space-y-1">
              {recentAchievements.map(achievement => (
                <Badge 
                  key={achievement.id} 
                  variant="secondary"
                  className="w-full justify-start py-1 px-2 text-xs"
                >
                  <span className="mr-1">{achievement.icon}</span>
                  {achievement.name}
                </Badge>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 