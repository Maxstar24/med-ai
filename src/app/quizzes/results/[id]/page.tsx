'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Calendar, Clock, Brain, Award, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching';
  question: string;
  options: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  difficulty: string;
  topic: string;
  tags: string[];
}

interface QuizResult {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  improvement: string;
  streak: number;
  answers: {
    questionId: string;
    userAnswer: string | number | boolean;
    isCorrect: boolean;
    timeSpent: number;
  }[];
  questions: Question[];
}

export default function QuizResultPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  useEffect(() => {
    fetchResult();
  }, [params.id]);

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/quizzes/results/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.result);
      } else {
        console.error('Failed to fetch result:', data.error);
      }
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Result Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The quiz result you're looking for could not be found.
            </p>
            <Link href="/quizzes/history">
              <Button>Back to History</Button>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Quiz Result</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(result.completedAt)}</span>
              </div>
            </div>
            <Link href="/quizzes/history">
              <Button variant="outline">Back to History</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">
                    {result.score} / {result.totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({Math.round((result.score / result.totalQuestions) * 100)}%)
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-2xl font-bold">{formatTime(result.timeSpent)}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(result.timeSpent / result.totalQuestions)}s per question
                  </p>
                </div>
              </div>
            </Card>

            {result.improvement && (
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Improvement</p>
                    <p className="text-2xl font-bold text-green-500">
                      {result.improvement}
                    </p>
                    <p className="text-sm text-muted-foreground">From last attempt</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {result.questions.map((question, index) => {
              const answer = result.answers[index];
              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        {answer.isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold">
                            Question {index + 1}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(answer.timeSpent)}
                          </div>
                        </div>
                        <p className="mb-4">{question.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          {question.options.map((option, optionIndex) => {
                            const isUserAnswer = answer.userAnswer === option;
                            const isCorrectAnswer = question.correctAnswer === option;
                            let className = "p-3 rounded-lg border ";
                            if (isUserAnswer && isCorrectAnswer) {
                              className += "bg-green-500/10 border-green-500 text-green-500";
                            } else if (isUserAnswer) {
                              className += "bg-red-500/10 border-red-500 text-red-500";
                            } else if (isCorrectAnswer) {
                              className += "bg-green-500/10 border-green-500 text-green-500";
                            } else {
                              className += "border-muted-foreground/20";
                            }
                            return (
                              <div key={optionIndex} className={className}>
                                <div className="flex items-center gap-2">
                                  <span>{String.fromCharCode(65 + optionIndex)}.</span>
                                  <span className="flex-1">{option}</span>
                                  {isUserAnswer && (
                                    isCorrectAnswer ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )
                                  )}
                                  {!isUserAnswer && isCorrectAnswer && (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Explanation</h4>
                          <p>{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 