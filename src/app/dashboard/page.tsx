'use client';

import { MainNav } from '@/components/MainNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Brain, Book, Target, Award, Clock, TrendingUp, History, Video, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("Dashboard page - Auth status:", user ? "authenticated" : "unauthenticated");
    
    // If not authenticated, redirect to login
    if (!loading && !user) {
      console.log("User is not authenticated, redirecting to login");
      router.push('/login');
    }
    
    // If authentication check is complete, stop loading
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.email?.split('@')[0] || 'User'}! 👋
              </h1>
              <p className="text-muted-foreground">
                Continue your medical learning journey
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="text-2xl font-bold">75%</p>
                </div>
              </div>
              <Progress value={75} className="mt-4" />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">7 days</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Study Time</p>
                  <p className="text-2xl font-bold">2.5h</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">+15%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/ai-learning" className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">AI Learning Assistant</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Get instant answers to your medical questions and engage in case-based learning.
                </p>
                <Button className="w-full">Start Learning</Button>
              </Card>
            </Link>

            <Link href="/quizzes" className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Book className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Practice Quizzes</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Test your knowledge with our adaptive quizzes and track your progress.
                </p>
                <Button className="w-full">Take a Quiz</Button>
              </Card>
            </Link>

            <Link href="/quizzes/history" className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Quiz History</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Review your past quiz attempts and track your improvement over time.
                </p>
                <Button className="w-full">View History</Button>
              </Card>
            </Link>

            <Link href="/flashcards" className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Book className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Flashcards</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Create and study flashcards with manual entry, AI generation, or PDF import.
                </p>
                <Button className="w-full">Study Flashcards</Button>
              </Card>
            </Link>
          </div>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Start New Quiz
              </Button>
              <Button className="w-full" variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Upload Notes
              </Button>
              <Button className="w-full" variant="outline">
                <Video className="mr-2 h-4 w-4" /> Watch Review
              </Button>
              <Link href="/flashcards/create" className="w-full">
                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Create Flashcards
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 