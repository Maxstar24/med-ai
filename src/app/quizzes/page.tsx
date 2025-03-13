'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Search, Brain, Award, Clock, Plus } from 'lucide-react';

interface Quiz {
  _id?: string;
  id?: string; 
  title: string;
  description: string;
  questionCount?: number;
  questions?: any[];
  difficulty: string;
  topic: string;
  createdAt: string;
  isPublic: boolean;
}

// Loading component
function QuizzesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-center mb-2">Loading Quizzes</h2>
            <p className="text-muted-foreground text-center">Please wait while we fetch available quizzes</p>
          </motion.div>
          
          <div className="relative w-32 h-32">
            <motion.div 
              className="absolute inset-0 rounded-full border-4 border-primary/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div 
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Brain className="h-12 w-12" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function QuizzesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes');
    }
  }, [user, authLoading, router]);

  // Fetch topics from the API
  const fetchTopics = async () => {
    try {
      const idToken = await user?.getIdToken(true);
      
      const response = await fetch('/api/topics', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAvailableTopics(data.topics);
      } else {
        console.error('Failed to fetch topics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  // Fetch quizzes from the API
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const idToken = await user?.getIdToken(true);
      
      const response = await fetch('/api/quizzes', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setQuizzes(data.quizzes);
        // We now fetch topics separately
      } else {
        console.error('Failed to fetch quizzes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    if (user) {
      fetchQuizzes();
      fetchTopics();
    }
  }, [user]);

  // Check for specific quiz ID in URL params
  useEffect(() => {
    const quizId = searchParams.get('id');
    if (quizId && user) {
      router.push(`/quizzes/${quizId}`);
    }
  }, [searchParams, user, router]);

  // Helper function to get the correct quiz ID
  const getQuizId = (quiz: Quiz) => quiz._id || quiz.id;

  // Helper to get the number of questions in a quiz
  const getQuestionCount = (quiz: Quiz) => quiz.questionCount || quiz.questions?.length || 0;

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return <QuizzesLoading />;
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <motion.h1 
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Available Quizzes
              </motion.h1>
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Take quizzes to test your knowledge and track your progress
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/quizzes/create">
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-md hover:shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quiz
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div 
            className="flex flex-wrap gap-4 mb-8 p-4 bg-secondary/30 rounded-lg border border-secondary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes..."
                  className="pl-10 bg-background border-primary/20 focus-visible:ring-primary/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full md:w-[200px]">
              <Select
                defaultValue="all"
                onValueChange={setSelectedTopic}
              >
                <SelectTrigger className="bg-background border-primary/20 focus:ring-primary/30">
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-[200px]">
              <Select
                defaultValue="all"
                onValueChange={setSelectedDifficulty}
              >
                <SelectTrigger className="bg-background border-primary/20 focus:ring-primary/30">
                  <SelectValue placeholder="Select Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-10">
              <motion.div 
                className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz, index) => {
                const quizId = getQuizId(quiz);
                const difficultyColors = {
                  beginner: "from-green-50 to-background border-green-200 dark:from-green-950/20 dark:to-background dark:border-green-800/30",
                  intermediate: "from-blue-50 to-background border-blue-200 dark:from-blue-950/20 dark:to-background dark:border-blue-800/30",
                  advanced: "from-red-50 to-background border-red-200 dark:from-red-950/20 dark:to-background dark:border-red-800/30"
                };
                
                const difficultyIconColors = {
                  beginner: "text-green-500 bg-green-100 dark:bg-green-900/30",
                  intermediate: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
                  advanced: "text-red-500 bg-red-100 dark:bg-red-900/30"
                };
                
                return (
                  <motion.div
                    key={quizId || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Link href={`/quizzes/${quizId}`}>
                      <Card className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-lg bg-gradient-to-br ${difficultyColors[quiz.difficulty as keyof typeof difficultyColors] || "from-gray-50 to-background border-gray-200 dark:from-gray-900/20 dark:to-background dark:border-gray-800/30"}`}>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold">{quiz.title}</h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                              quiz.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              quiz.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {quiz.difficulty}
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground mb-4 line-clamp-2 h-12">
                            {quiz.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-auto">
                            <div className="flex items-center gap-2 bg-secondary/50 px-2 py-1 rounded-md">
                              <Brain className="w-4 h-4 text-primary" />
                              <span className="text-sm">{quiz.topic}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-secondary/50 px-2 py-1 rounded-md">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="text-sm">{getQuestionCount(quiz)} questions</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                            <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10 -mr-2 -mb-2">
                              Take Quiz →
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              className="text-center py-10 bg-secondary/20 rounded-lg border border-secondary/50 p-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              >
                <Search className="h-10 w-10 text-primary/70" />
              </motion.div>
              
              <motion.h3 
                className="text-xl font-medium mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                No quizzes found
              </motion.h3>
              
              <motion.p 
                className="text-muted-foreground mb-6 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                No quizzes match your search criteria. Try adjusting your filters or create a new quiz.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/quizzes/create">
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Quiz
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Main export that wraps the content in Suspense
export default function QuizzesPage() {
  return (
    <Suspense fallback={<QuizzesLoading />}>
      <QuizzesContent />
    </Suspense>
  );
}