'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MainNav } from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, Award, Clock, ChevronLeft, Play } from 'lucide-react';

interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  questions: any[];
  difficulty: string;
  topic: string;
  createdAt: string;
  createdBy: string;
  isPublic: boolean;
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use the id from useParams hook
  const quizId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Fetch quiz data once authenticated
    if (status === 'authenticated' && quizId && quizId !== 'undefined') {
      const fetchQuiz = async () => {
        try {
          console.log('Fetching quiz with ID:', quizId);
          const response = await fetch(`/api/quizzes/${quizId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch quiz (Status: ${response.status})`);
          }
          
          const data = await response.json();
          console.log('Quiz data:', data);
          
          setQuiz(data.quiz);
        } catch (err) {
          console.error('Error fetching quiz:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch quiz');
        } finally {
          setLoading(false);
        }
      };
      
      fetchQuiz();
    } else if (quizId === 'undefined') {
      setError('Invalid quiz ID');
      setLoading(false);
    }
  }, [quizId, router, status]);

  // Helper function to get the quiz ID, handling both id and _id properties
  const getQuizId = (quiz: Quiz) => quiz?._id || quiz?.id;

  if (status === 'loading' || loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h3 className="text-xl font-medium mb-2">Error</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/quizzes">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h3 className="text-xl font-medium mb-2">Quiz Not Found</h3>
            <p className="text-muted-foreground mb-6">The quiz you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link href="/quizzes">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href="/quizzes">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Quizzes
            </Button>
          </Link>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 mb-6">
            <div className="grid md:grid-cols-[2fr_1fr] gap-6">
              <div>
                <h1 className="text-3xl font-bold mb-3">{quiz.title}</h1>
                <p className="text-muted-foreground mb-6">{quiz.description}</p>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <span>{quiz.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span className="capitalize">{quiz.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{quiz.questions.length} questions</span>
                  </div>
                </div>
                
                <Link href={`/quizzes/${quizId}/take`}>
                  <Button size="lg">
                    <Play className="mr-2 h-4 w-4" />
                    Start Quiz
                  </Button>
                </Link>
              </div>
              
              <div className="bg-muted rounded-lg p-6">
                <h3 className="font-semibold mb-2">Quiz Information</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-medium">{quiz.questions.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Estimated time:</span>
                    <span className="font-medium">{quiz.questions.length * 1.5} minutes</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}