'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainNav } from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, Award, Clock, ChevronLeft, Play, Edit, Trash } from 'lucide-react';

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
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const quizId = params.id as string;
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        const idToken = await user?.getIdToken(true);
        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch quiz');
        }

        setQuiz(data.quiz);
        // Check if the current user is the owner of the quiz
        setIsOwner(data.quiz.createdBy === user?.uid || data.quiz.userFirebaseUid === user?.uid);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (user && quizId) {
      fetchQuiz();
    }
  }, [quizId, user]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const idToken = await user?.getIdToken(true);
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete quiz');
      }

      router.push('/quizzes/manage');
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert('Failed to delete quiz. Please try again.');
    }
  };

  if (loading) {
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

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h3 className="text-xl font-medium mb-2">Error</h3>
            <p className="text-muted-foreground mb-6">{error || 'Quiz not found'}</p>
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
        <div className="mb-6 flex justify-between items-center">
          <Link href="/quizzes">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Quizzes
            </Button>
          </Link>
          {isOwner && (
            <div className="flex gap-2">
              <Link href={`/quizzes/edit/${quiz._id || quiz.id}`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Quiz
                </Button>
              </Link>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Delete Quiz
              </Button>
            </div>
          )}
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