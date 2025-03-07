'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

export default function QuizzesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (status !== 'authenticated') return;

      try {
        const params = new URLSearchParams();
        if (selectedTopic !== 'all') params.append('topic', selectedTopic);
        if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);

        const response = await fetch(`/api/quizzes?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setQuizzes(data.quizzes);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [status, selectedTopic, selectedDifficulty]);

  // Check for specific quiz ID in URL params
  useEffect(() => {
    const quizId = searchParams.get('id');
    if (quizId && status === 'authenticated') {
      router.push(`/quizzes/${quizId}`);
    }
  }, [searchParams, status, router]);

  // Helper function to get the correct quiz ID
  const getQuizId = (quiz: Quiz) => quiz._id || quiz.id;

  // Helper to get the number of questions in a quiz
  const getQuestionCount = (quiz: Quiz) => quiz.questionCount || quiz.questions?.length || 0;

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
          </div>
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
              <h1 className="text-4xl font-bold mb-2">Available Quizzes</h1>
              <p className="text-muted-foreground">
                Take quizzes to test your knowledge and track your progress
              </p>
            </div>
            <Link href="/quizzes/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="w-[200px]">
              <Select
                defaultValue="all"
                onValueChange={setSelectedTopic}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Pharmacology">Pharmacology</SelectItem>
                  <SelectItem value="Neurology">Neurology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Select
                defaultValue="all"
                onValueChange={setSelectedDifficulty}
              >
                <SelectTrigger>
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
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz, index) => {
                const quizId = getQuizId(quiz);
                console.log('Quiz ID:', quizId);
                return (
                  <motion.div
                    key={quizId || index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link href={`/quizzes/${quizId}`}>
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                        <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {quiz.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            <span className="text-sm">{quiz.topic}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            <span className="text-sm capitalize">{quiz.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{getQuestionCount(quiz)} questions</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-xl font-medium mb-2">No quizzes found</h3>
              <p className="text-muted-foreground mb-6">
                No quizzes match your search criteria. Try adjusting your filters.
              </p>
              <Link href="/quizzes/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create a Quiz
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}