'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowLeft, Medal, Clock, Award, Image, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface Answer {
  questionId: string;
  userAnswer: string | number | boolean;
  isCorrect: boolean;
  timeSpent: number;
  shortAnswer?: string;
  selectedOptionIds?: string[];
}

interface Question {
  type: 'multiple-choice' | 'true-false' | 'spot' | 'saq';
  question: string;
  options: string[];
  correctAnswer: string | number | boolean | string[];
  explanation: string;
  imageUrl?: string;
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

export default function QuizResultPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizResultId = params.id as string;
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes/results/' + (quizResultId || ''));
    }
  }, [user, authLoading, router, quizResultId]);

  useEffect(() => {
    const fetchResult = async () => {
      if (authLoading || !user) return;
      
      // Check if we have a valid ID
      if (!quizResultId) {
        setError('Invalid quiz result ID');
        setLoading(false);
        return;
      }

      try {
        // Get Firebase ID token for authentication
        const idToken = await user.getIdToken(true);
        
        const response = await fetch(`/api/quizzes/results/${quizResultId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        const data = await response.json();

        if (response.ok) {
          // Calculate percentage score
          const percentageScore = Math.round((data.result.score / data.result.totalQuestions) * 100);
          setResult({
            ...data.result,
            percentageScore
          });
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
  }, [user, authLoading, quizResultId]);

  // Helper function to get question type icon
  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'spot':
        return <Image className="h-5 w-5 text-blue-500" />;
      case 'saq':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Helper function to get question type label
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple-choice':
        return 'Multiple Choice';
      case 'true-false':
        return 'True/False';
      case 'spot':
        return 'Image Identification';
      case 'saq':
        return 'Short Answer';
      default:
        return type;
    }
  };

  if (authLoading || loading) {
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
              <h2 className="text-2xl font-bold text-center mb-2">Loading Results</h2>
              <p className="text-muted-foreground text-center">Please wait while we fetch your quiz results</p>
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
                <Award className="h-12 w-12" />
              </motion.div>
            </div>
            
            <motion.div 
              className="mt-8 w-full max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>
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
          <motion.div 
            className="max-w-md mx-auto text-center py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </motion.div>
            
            <motion.h2 
              className="text-2xl font-bold text-red-500 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Error
            </motion.h2>
            
            <motion.div
              className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link href="/quizzes">
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Quizzes
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <motion.div 
            className="max-w-md mx-auto text-center py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </motion.div>
            
            <motion.h2 
              className="text-2xl font-bold mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Quiz Result Not Found
            </motion.h2>
            
            <motion.p 
              className="text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              The quiz result you're looking for could not be found.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link href="/quizzes">
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Quizzes
                </Button>
              </Link>
            </motion.div>
          </motion.div>
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
              <motion.h1 
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Quiz Results
              </motion.h1>
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                View your quiz performance and learn from your mistakes
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/quizzes">
                <Button variant="outline" className="group transition-all duration-300 hover:bg-primary hover:text-primary-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                  Back to Quizzes
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-yellow-50 to-background border-yellow-200 dark:from-yellow-950/20 dark:to-background dark:border-yellow-800/30">
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <h3 className="text-3xl font-bold">{result.percentageScore}%</h3>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <Medal className="h-8 w-8 text-yellow-500" />
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-blue-50 to-background border-blue-200 dark:from-blue-950/20 dark:to-background dark:border-blue-800/30">
                <div>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <h3 className="text-3xl font-bold">
                    {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                  </h3>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <Card className="p-6 flex items-center justify-between bg-gradient-to-br from-green-50 to-background border-green-200 dark:from-green-950/20 dark:to-background dark:border-green-800/30">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <h3 className="text-3xl font-bold">{result.streak}</h3>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Award className="h-8 w-8 text-green-500" />
                </div>
              </Card>
            </motion.div>
          </motion.div>

          <div className="space-y-6">
            {result.questions.map((question, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                whileHover={{ scale: 1.01 }}
              >
                <Card className="overflow-hidden border-2 transition-all duration-300 hover:shadow-md">
                  <div className={`h-2 ${result.answers[index].isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <h3 className="text-xl font-semibold mb-2 mr-2">
                          Question {index + 1}
                        </h3>
                        {getQuestionTypeIcon(question.type)}
                        <span className="text-sm text-muted-foreground ml-2 px-2 py-1 bg-secondary rounded-full">
                          {getQuestionTypeLabel(question.type)}
                        </span>
                      </div>
                      {result.answers[index].isCorrect ? (
                        <div className="flex items-center text-green-500 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                          <Check className="h-5 w-5 mr-1" />
                          Correct
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                          <X className="h-5 w-5 mr-1" />
                          Incorrect
                        </div>
                      )}
                    </div>

                    <p className="text-lg mb-4 font-medium">{question.question}</p>

                    {/* Image for Spot Questions */}
                    {question.type === 'spot' && question.imageUrl && (
                      <div className="relative border rounded-md overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg">
                        <img 
                          src={question.imageUrl} 
                          alt="Image identification question" 
                          className="max-w-full h-auto mx-auto max-h-96 object-contain"
                        />
                      </div>
                    )}

                    {/* Multiple Choice Question */}
                    {question.type === 'multiple-choice' && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className={`p-3 rounded-md transition-all duration-300 ${
                              option === question.correctAnswer
                                ? 'bg-green-100 border border-green-500 dark:bg-green-900/30 dark:border-green-500/50'
                                : option === result.answers[index].userAnswer
                                ? 'bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-500/50'
                                : 'bg-secondary hover:bg-secondary/80'
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False Question */}
                    {question.type === 'true-false' && (
                      <div className="flex gap-4 mb-4">
                        <div
                          className={`p-3 rounded-md flex-1 text-center transition-all duration-300 ${
                            question.correctAnswer === true
                              ? 'bg-green-100 border border-green-500 dark:bg-green-900/30 dark:border-green-500/50'
                              : result.answers[index].userAnswer === true
                              ? 'bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-500/50'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                        >
                          True
                        </div>
                        <div
                          className={`p-3 rounded-md flex-1 text-center transition-all duration-300 ${
                            question.correctAnswer === false
                              ? 'bg-green-100 border border-green-500 dark:bg-green-900/30 dark:border-green-500/50'
                              : result.answers[index].userAnswer === false
                              ? 'bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-500/50'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                        >
                          False
                        </div>
                      </div>
                    )}

                    {/* Short Answer Question or Spot Question */}
                    {(question.type === 'saq' || question.type === 'spot') && (
                      <div className="mb-4">
                        <div className="mb-2">
                          <h4 className="font-semibold mb-2">Your Answer:</h4>
                          <p className={`p-3 rounded-md ${result.answers[index].isCorrect ? 'bg-green-100 border border-green-500 dark:bg-green-900/30 dark:border-green-500/50' : 'bg-red-100 border border-red-500 dark:bg-red-900/30 dark:border-red-500/50'}`}>
                            {(result.answers[index].shortAnswer || result.answers[index].userAnswer as string) || '(No answer provided)'}
                          </p>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Correct Answer:</h4>
                          <div className="p-3 rounded-md bg-green-100 border border-green-500 dark:bg-green-900/30 dark:border-green-500/50">
                            {Array.isArray(question.correctAnswer) 
                              ? question.correctAnswer.join(' or ') 
                              : question.correctAnswer as string}
                          </div>
                        </div>
                      </div>
                    )}

                    <motion.div 
                      className="mt-4 bg-secondary/50 p-4 rounded-md"
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3, delay: index * 0.1 + 0.8 }}
                    >
                      <h4 className="font-semibold mb-2 flex items-center">
                        <span className="p-1 bg-primary/10 rounded-full mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                        </span>
                        Explanation
                      </h4>
                      <p className="text-muted-foreground">{question.explanation}</p>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            className="mt-8 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            <Link href="/quizzes">
              <Button size="lg" className="group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                Take Another Quiz
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}