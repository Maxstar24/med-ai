'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Trash, 
  Edit, 
  Copy, 
  Eye, 
  Brain, 
  Award, 
  Clock, 
  MoreHorizontal,
  Globe,
  Lock
} from 'lucide-react';
import Link from 'next/link';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  difficulty: string;
  topic: string;
  createdAt: string;
  isPublic: boolean;
}

export default function ManageQuizzesPage() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [activeTab, setActiveTab] = useState('my-quizzes');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  // Fetch quizzes
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      
      // Different endpoint based on the active tab
      const endpoint = activeTab === 'my-quizzes' 
        ? '/api/quizzes/mine' 
        : '/api/quizzes';
      
      const params = new URLSearchParams();
      if (selectedTopic !== 'all') params.append('topic', selectedTopic);
      if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
      
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuizzes(data.quizzes);
      } else {
        console.error('Failed to fetch quizzes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTopic, selectedDifficulty]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchQuizzes();
    }
  }, [status, fetchQuizzes]);

  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Delete quiz handler
  const handleDeleteQuiz = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/quizzes/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Remove the quiz from the state
          setQuizzes(current => current.filter(quiz => quiz.id !== id));
        } else {
          const data = await response.json();
          console.error('Failed to delete quiz:', data.error);
        }
      } catch (error) {
        console.error('Error deleting quiz:', error);
      }
    }
  };

  // Toggle quiz publicity
  const toggleQuizPublicity = async (id: string, isCurrentlyPublic: boolean) => {
    try {
      const response = await fetch(`/api/quizzes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !isCurrentlyPublic })
      });
      
      if (response.ok) {
        // Update the quiz in the state
        setQuizzes(current => 
          current.map(quiz => 
            quiz.id === id ? { ...quiz, isPublic: !isCurrentlyPublic } : quiz
          )
        );
      } else {
        const data = await response.json();
        console.error('Failed to update quiz publicity:', data.error);
      }
    } catch (error) {
      console.error('Error updating quiz publicity:', error);
    }
  };

  // Create a copy of a quiz
  const duplicateQuiz = async (quizId: string) => {
    try {
      // First fetch the quiz details
      const response = await fetch(`/api/quizzes/${quizId}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch quiz to duplicate:', data.error);
        return;
      }
      
      // Create a new quiz as a copy
      const { quiz } = data;
      const newQuizData = {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        questions: quiz.questions,
        difficulty: quiz.difficulty,
        topic: quiz.topic,
        isPublic: false
      };
      
      const createResponse = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuizData)
      });
      
      const createData = await createResponse.json();
      
      if (createResponse.ok) {
        // Add the new quiz to the state
        setQuizzes(current => [createData.quiz, ...current]);
      } else {
        console.error('Failed to create quiz copy:', createData.error);
      }
    } catch (error) {
      console.error('Error duplicating quiz:', error);
    }
  };

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
            <h1 className="text-4xl font-bold">Manage Quizzes</h1>
            <Link href="/quizzes/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="my-quizzes" onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="my-quizzes">My Quizzes</TabsTrigger>
              <TabsTrigger value="all-quizzes">All Quizzes</TabsTrigger>
            </TabsList>
            <TabsContent value="my-quizzes">
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
                  {filteredQuizzes.map((quiz, index) => (
                    <motion.div
                      key={quiz.id || index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold">{quiz.title}</h3>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleQuizPublicity(quiz.id, quiz.isPublic)}
                              title={quiz.isPublic ? "Make Private" : "Make Public"}
                            >
                              {quiz.isPublic ? (
                                <Globe className="h-4 w-4 text-green-500" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 line-clamp-2">{quiz.description}</p>
                        <div className="flex items-center gap-4 mb-4">
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
                            <span className="text-sm">{quiz.questionCount} questions</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Link href={`/quizzes/edit/${quiz.id}`} passHref>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => duplicateQuiz(quiz.id)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <h3 className="text-xl font-medium mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't created any quizzes yet or none match your filters.
                  </p>
                  <Link href="/quizzes/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Quiz
                    </Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-quizzes">
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
                  {filteredQuizzes.map((quiz, index) => (
                    <motion.div
                      key={quiz.id || index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">{quiz.description}</p>
                        <div className="flex items-center gap-4 mb-4">
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
                            <span className="text-sm">{quiz.questionCount} questions</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-2">
                          <Link href={`/quizzes?id=${quiz.id}`} passHref>
                            <Button size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Take Quiz
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => duplicateQuiz(quiz.id)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <h3 className="text-xl font-medium mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground mb-6">
                    No quizzes match your filters.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}