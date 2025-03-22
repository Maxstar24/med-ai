'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { MainNav } from '@/components/MainNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Award, Trophy, Calendar, Clock, Brain, Book, ChevronRight, Upload, Edit2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { gamification, loadingGamification, refreshGamificationData } = useGamification();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    experience: '',
    bio: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      refreshGamificationData();
      setFormData({
        name: user.name || '',
        specialty: user.profile?.specialty || '',
        experience: user.profile?.experience || '',
        bio: user.profile?.bio || ''
      });
    }
  }, [authLoading, user, router, refreshGamificationData]);

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

  const getUserInitials = () => {
    if (!user || !user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to update user profile
    alert('Profile updated successfully!');
  };

  // Group achievements by category
  const groupAchievementsByCategory = () => {
    if (!gamification.achievements || gamification.achievements.length === 0) {
      return {};
    }

    return gamification.achievements.reduce((groups: Record<string, any[]>, achievement) => {
      const category = achievement.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(achievement);
      return groups;
    }, {});
  };

  if (authLoading || loadingGamification) {
    return (
      <div className="min-h-screen flex flex-col">
        <MainNav />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">User Profile</h1>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="stats">Stats & Progress</TabsTrigger>
            <TabsTrigger value="edit">Edit Profile</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={profileImage || undefined} />
                    <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{user?.name || user?.email?.split('@')[0]}</h3>
                    <p className="text-muted-foreground">{formData.specialty || 'Medical Student'}</p>
                  </div>
                  <div className="w-full">
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Experience:</span>
                      <span className="text-sm">{formData.experience || 'Not specified'}</span>
                    </div>
                    <Separator className="my-2" />
                    {formData.bio && (
                      <>
                        <p className="text-sm">{formData.bio}</p>
                        <Separator className="my-2" />
                      </>
                    )}
                    <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                      <a href="#edit">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Level & XP Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Level & Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-36 h-36 rounded-full border-8 border-primary/20 flex items-center justify-center">
                        <span className="text-4xl font-bold">{gamification.level}</span>
                      </div>
                      <Badge className="absolute -top-2 right-0 px-2 py-1">
                        <Trophy className="h-4 w-4 mr-1 text-yellow-500" />
                        Level {gamification.level}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>XP: {gamification.xp}</span>
                      <span>Next: {(gamification.level * 100)}</span>
                    </div>
                    <Progress value={calculateLevelProgress()} className="h-3" />
                    <p className="text-xs text-center text-muted-foreground">
                      {100 - calculateLevelProgress()}% to Level {gamification.level + 1}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-secondary p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold">{gamification.currentStreak}</div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold">{gamification.longestStreak}</div>
                      <div className="text-xs text-muted-foreground">Longest Streak</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Activity Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary p-3 rounded-lg flex items-center space-x-3">
                      <div className="p-2 bg-primary/20 rounded-full">
                        <Book className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{gamification.totalCardsStudied}</div>
                        <div className="text-xs text-muted-foreground">Cards Studied</div>
                      </div>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg flex items-center space-x-3">
                      <div className="p-2 bg-primary/20 rounded-full">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{gamification.totalQuizzesTaken}</div>
                        <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Accuracy</span>
                      <span className="text-sm font-semibold">{gamification.averageAccuracy}%</span>
                    </div>
                    <Progress value={gamification.averageAccuracy} className="h-2" />
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Daily Goal</span>
                      <span className="text-sm font-semibold">{gamification.dailyProgress}/{gamification.dailyGoal} cards</span>
                    </div>
                    <Progress 
                      value={(gamification.dailyProgress / gamification.dailyGoal) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>Total Study Time</span>
                    </div>
                    <span className="font-semibold">{gamification.studyTime} min</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Achievements */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                {gamification.achievements && gamification.achievements.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[...gamification.achievements]
                      .sort((a, b) => {
                        const dateA = a.unlockedAt instanceof Date ? a.unlockedAt : new Date(a.unlockedAt);
                        const dateB = b.unlockedAt instanceof Date ? b.unlockedAt : new Date(b.unlockedAt);
                        return dateB.getTime() - dateA.getTime();
                      })
                      .slice(0, 6)
                      .map(achievement => (
                        <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div>
                            <div className="font-medium">{achievement.name}</div>
                            <div className="text-xs text-muted-foreground">{achievement.description}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>You haven't unlocked any achievements yet. Keep studying!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Achievements</CardTitle>
                <CardDescription>Track your progress and complete achievements to earn badges</CardDescription>
              </CardHeader>
              <CardContent>
                {gamification.achievements && gamification.achievements.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupAchievementsByCategory()).map(([category, achievements]) => (
                      <div key={category} className="space-y-3">
                        <h3 className="text-lg font-semibold capitalize">{category} Achievements</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {achievements.map(achievement => (
                            <div key={achievement.id} className="flex items-center space-x-3 p-4 bg-secondary rounded-lg">
                              <div className="text-3xl">{achievement.icon}</div>
                              <div>
                                <div className="font-medium">{achievement.name}</div>
                                <div className="text-xs text-muted-foreground">{achievement.description}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No achievements yet</p>
                    <p>Start studying flashcards and taking quizzes to earn achievements!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Total Cards Studied</div>
                      <div className="text-3xl font-bold">{gamification.totalCardsStudied}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Quizzes Completed</div>
                      <div className="text-3xl font-bold">{gamification.totalQuizzesTaken}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Correct Answers</div>
                      <div className="text-3xl font-bold">{gamification.totalCorrectAnswers}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Incorrect Answers</div>
                      <div className="text-3xl font-bold">{gamification.totalIncorrectAnswers}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Accuracy</span>
                      <span className="font-medium">{gamification.averageAccuracy}%</span>
                    </div>
                    <Progress value={gamification.averageAccuracy} className="h-2" />
                    
                    <div className="flex justify-between mt-4">
                      <span className="text-sm text-muted-foreground">Total Study Time</span>
                      <span className="font-medium">{gamification.studyTime} minutes</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Daily Goal Progress</span>
                      <span className="font-medium">{gamification.dailyProgress}/{gamification.dailyGoal}</span>
                    </div>
                    <Progress 
                      value={(gamification.dailyProgress / gamification.dailyGoal) * 100} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Streak Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-secondary rounded-lg p-6 text-center">
                      <div className="text-5xl font-bold">{gamification.currentStreak}</div>
                      <div className="text-sm text-muted-foreground mt-2">Current Streak</div>
                    </div>
                    <div className="bg-secondary rounded-lg p-6 text-center">
                      <div className="text-5xl font-bold">{gamification.longestStreak}</div>
                      <div className="text-sm text-muted-foreground mt-2">Longest Streak</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-medium mb-2">Streak Milestones</h4>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                          <span className="text-xs">3</span>
                        </div>
                        <span>3 Day Streak - "On Fire" achievement</span>
                        {gamification.currentStreak >= 3 && <ChevronRight className="ml-auto h-4 w-4 text-green-500" />}
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                          <span className="text-xs">7</span>
                        </div>
                        <span>7 Day Streak - "Week Warrior" achievement</span>
                        {gamification.currentStreak >= 7 && <ChevronRight className="ml-auto h-4 w-4 text-green-500" />}
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                          <span className="text-xs">30</span>
                        </div>
                        <span>30 Day Streak - "Monthly Dedication" achievement</span>
                        {gamification.currentStreak >= 30 && <ChevronRight className="ml-auto h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Edit Profile Tab */}
          <TabsContent value="edit" className="space-y-6">
            <Card id="edit">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col items-center space-y-4">
                      <Avatar className="h-24 w-24 border-4 border-primary">
                        <AvatarImage src={profileImage || undefined} />
                        <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center">
                        <Label 
                          htmlFor="profile-image" 
                          className="cursor-pointer bg-secondary text-sm px-3 py-2 rounded-md inline-flex items-center"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Label>
                        <Input 
                          id="profile-image" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleFormChange} 
                          placeholder="Your name" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty/Focus</Label>
                        <Input 
                          id="specialty" 
                          name="specialty" 
                          value={formData.specialty} 
                          onChange={handleFormChange} 
                          placeholder="e.g. Cardiology, General Medicine" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="experience">Experience Level</Label>
                        <Input 
                          id="experience" 
                          name="experience" 
                          value={formData.experience} 
                          onChange={handleFormChange} 
                          placeholder="e.g. Medical Student, Resident, 5+ years" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      name="bio" 
                      value={formData.bio} 
                      onChange={handleFormChange} 
                      placeholder="Tell us about yourself..." 
                      rows={4} 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 