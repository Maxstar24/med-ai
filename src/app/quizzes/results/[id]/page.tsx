'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowLeft, Medal, Clock, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface Answer {
  questionId: string;
  userAnswer: string | number | boolean;
  isCorrect: boolean;
  timeSpent: number;
}

interface Question {
  type: string;
  question: string;
  options: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
}

interface QuizResult {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: Answer[];
  completedAt: string;
  improvement: string | null;
  streak: number;
  questions: Question[];
  percentageScore: number;
}

export default function QuizResultPage({
  params
}: {
  params: { id: string }
}) {
  const { data: session, status } = useSession();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    const fetchResult = async () => {
      if (status !== 'authenticated') return;

      try {
        const response = await fetch(`/api/quizzes/results/${params.id}`);
        const data = await response.json();

        if (response.ok) {
          setResult(data.result);
        } else {
          setError(data.error || 'Failed to fetch quiz result');
        }
      } catch (error) {
        setError('An error occurred while fetching the quiz result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [status, params.id]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/quizzes">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
            </Link>
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
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4">Quiz Result Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The quiz result you're looking for could not be found.
            </p>
            <Link href="/quizzes">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Quiz Results</h1>
              <p className="text-muted-foreground">
                View your quiz performance and learn from your mistakes
              </p>
            </div>
            <Link href="/quizzes">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Score</p>
                <h3 className="text-3xl font-bold">{result.percentageScore}%</h3>
              </div>
              <Medal className="h-8 w-8 text-yellow-500" />
            </Card>

            <Card className="p-6 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Time Spent</p>
                <h3 className="text-3xl font-bold">
                  {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                </h3>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </Card>

            <Card className="p-6 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Current Streak</p>
                <h3 className="text-3xl font-bold">{result.streak}</h3>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </Card>
          </div>

          <div className="space-y-6">
            {result.questions.map((question, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Question {index + 1}
                    </h3>
                    <p className="text-lg mb-4">{question.question}</p>
                  </div>
                  {result.answers[index].isCorrect ? (
                    <div className="flex items-center text-green-500">
                      <Check className="h-6 w-6 mr-2" />
                      Correct
                    </div>
                  ) : (
                    <div className="flex items-center text-red-500">
                      <X className="h-6 w-6 mr-2" />
                      Incorrect
                    </div>
                  )}
                </div>

                {question.type === 'multiple-choice' && (
                  <div className="space-y-2 mb-4">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-md ${
                          option === question.correctAnswer
                            ? 'bg-green-100 border-green-500'
                            : option === result.answers[index].userAnswer
                            ? 'bg-red-100 border-red-500'
                            : 'bg-secondary'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}

                {question.type === 'true-false' && (
                  <div className="flex gap-4 mb-4">
                    <div
                      className={`p-3 rounded-md ${
                        question.correctAnswer === true
                          ? 'bg-green-100 border-green-500'
                          : result.answers[index].userAnswer === true
                          ? 'bg-red-100 border-red-500'
                          : 'bg-secondary'
                      }`}
                    >
                      True
                    </div>
                    <div
                      className={`p-3 rounded-md ${
                        question.correctAnswer === false
                          ? 'bg-green-100 border-green-500'
                          : result.answers[index].userAnswer === false
                          ? 'bg-red-100 border-red-500'
                          : 'bg-secondary'
                      }`}
                    >
                      False
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-muted-foreground">{question.explanation}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}