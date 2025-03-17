'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainNav } from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Clock, Brain, Award } from 'lucide-react';
import Link from 'next/link';

interface BaseQuestion {
  id: string;
  question: string;
  explanation: string;
  imageUrl?: string;
}

interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer: string;
}

interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer: string;
}

interface SingleAnswerQuestion extends BaseQuestion {
  type: 'saq' | 'spot';
  correctAnswer: string;
}

interface MultiAnswerQuestion extends BaseQuestion {
  type: 'saq' | 'spot';
  correctAnswer: string[];
}

type ShortAnswerQuestion = SingleAnswerQuestion | MultiAnswerQuestion;
type SpotQuestion = SingleAnswerQuestion | MultiAnswerQuestion;
type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion | SpotQuestion;

interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: string;
  topic: string;
}

interface QuizAttempt {
  _id: string;
  startedAt: Date;
  completedAt?: Date;
  score: number;
  totalQuestions: number;
  questionsAttempted: number;
  answers: {
    questionId: string;
    selectedAnswer: string | string[];
    isCorrect: boolean;
    timeSpent: number;
  }[];
}

interface QuizAnalytics {
  totalAttempts: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
  questionStats: {
    questionId: string;
    successRate: number;
    averageTimeSpent: number;
    skipRate: number;
  }[];
}

function isString(value: string | string[]): value is string {
  return !Array.isArray(value);
}

function isMultiAnswerQuestion(question: any): question is MultiAnswerQuestion {
  return Array.isArray(question.correctAnswer);
}

// Helper function to compare answers safely
function compareAnswers(correctAnswer: string | string[], userAnswer: string): boolean {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(answer => 
      answer.toLowerCase() === userAnswer.toLowerCase()
    );
  }
  return correctAnswer.toLowerCase() === userAnswer.toLowerCase();
}

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [selectedSpots, setSelectedSpots] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  
  const quizId = params.id as string;

  // Fetch quiz data and create attempt
  useEffect(() => {
    const fetchQuizAndCreateAttempt = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch quiz data
        const idToken = await user?.getIdToken(true);
        const quizResponse = await fetch(`/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!quizResponse.ok) {
          const data = await quizResponse.json();
          throw new Error(data.error || 'Failed to fetch quiz');
        }

        const quizData = await quizResponse.json();
        setQuiz(quizData.quiz);

        // Create new attempt
        const attemptResponse = await fetch(`/api/quizzes/${quizId}/attempts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!attemptResponse.ok) {
          const data = await attemptResponse.json();
          throw new Error(data.error || 'Failed to create attempt');
        }

        const attemptData = await attemptResponse.json();
        setAttempt(attemptData.attempt);

        // Fetch analytics
        const analyticsResponse = await fetch(`/api/quizzes/${quizId}/attempts`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData.analytics);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (user && quizId) {
      fetchQuizAndCreateAttempt();
    }
  }, [quizId, user]);

  // Handle answer submission
  const handleAnswerSubmit = async (isComplete: boolean = false) => {
    if (!quiz || !attempt) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const timeSpent = new Date().getTime() - questionStartTime.getTime();

    let selectedAnswer: string | string[];
    let isCorrect = false;

    switch (currentQuestion.type) {
      case 'multiple-choice':
        selectedAnswer = selectedOptions[currentQuestion.id] || [];
        isCorrect = selectedAnswer[0] === currentQuestion.correctAnswer;
        break;
      case 'true-false':
        selectedAnswer = selectedOptions[currentQuestion.id]?.[0] || '';
        isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        break;
      case 'saq':
      case 'spot': {
        selectedAnswer = shortAnswers[currentQuestion.id] || '';
        isCorrect = compareAnswers(
          (currentQuestion as any).correctAnswer, 
          selectedAnswer as string
        );
        break;
      }
      default:
        return;
    }

    try {
      console.log('Submitting answer, isComplete:', isComplete);
      
      if (!user) {
        console.error('User is not logged in');
        setError('You must be logged in to submit answers. Please log in and try again.');
        return;
      }
      
      const idToken = await user.getIdToken(true);
      if (!idToken) {
        console.error('Failed to get ID token');
        setError('Authentication error. Please log in again.');
        return;
      }
      
      console.log('Got ID token, length:', idToken.length);
      console.log('Attempt ID:', attempt._id);
      
      const requestBody = {
        attemptId: attempt._id,
        answers: [{
          questionId: currentQuestion.id,
          selectedAnswer,
          isCorrect,
          timeSpent
        }],
        isComplete
      };
      
      console.log('Request body:', JSON.stringify(requestBody));
      
      const response = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Failed to submit answer (Status: ${response.status})`);
      }

      const data = await response.json();
      setAttempt(data.attempt);

      if (!isComplete) {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionStartTime(new Date());
      } else {
        setQuizSubmitted(true);
      }
    } catch (err) {
      console.error('Error in handleAnswerSubmit:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  };

  const handleNextQuestion = () => {
    handleAnswerSubmit(currentQuestionIndex === quiz!.questions.length - 1);
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
            <h3 className="text-xl font-medium mb-2">Quiz not found</h3>
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

  if (quizSubmitted && attempt) {
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

          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
              <p className="text-xl mb-4">Your Score: {attempt.score.toFixed(1)}%</p>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-secondary rounded-lg">
                  <Clock className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Time Taken</p>
                  <p className="text-lg font-medium">
                    {Math.round((new Date(attempt.completedAt!).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60)} mins
                  </p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <Brain className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="text-lg font-medium">{attempt.questionsAttempted} / {attempt.totalQuestions}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <Award className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Correct Answers</p>
                  <p className="text-lg font-medium">
                    {attempt.answers.filter(a => a.isCorrect).length} / {attempt.totalQuestions}
                  </p>
                </div>
              </div>

              {analytics && (
                <div className="text-left mb-8">
                  <h2 className="text-xl font-bold mb-4">Quiz Statistics</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-lg font-medium">{analytics.averageScore.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Attempts</p>
                      <p className="text-lg font-medium">{analytics.totalAttempts}</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-lg font-medium">{analytics.completionRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Time</p>
                      <p className="text-lg font-medium">{Math.round(analytics.averageTimeSpent / 1000 / 60)} mins</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Link href={`/quizzes/${quizId}`}>
                  <Button variant="outline">
                    Review Quiz
                  </Button>
                </Link>
                <Link href="/quizzes">
                  <Button>
                    Back to Quizzes
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

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
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </div>
        </div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8">
            <h2 className="text-xl font-medium mb-6">{currentQuestion.question}</h2>

            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOptions[currentQuestion.id]?.[0] === option
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-secondary'
                    }`}
                    onClick={() => setSelectedOptions({
                      ...selectedOptions,
                      [currentQuestion.id]: [option]
                    })}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.type === 'true-false' && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className={selectedOptions[currentQuestion.id]?.[0] === 'true' ? 'bg-primary/10' : ''}
                  onClick={() => setSelectedOptions({
                    ...selectedOptions,
                    [currentQuestion.id]: ['true']
                  })}
                >
                  True
                </Button>
                <Button
                  variant="outline"
                  className={selectedOptions[currentQuestion.id]?.[0] === 'false' ? 'bg-primary/10' : ''}
                  onClick={() => setSelectedOptions({
                    ...selectedOptions,
                    [currentQuestion.id]: ['false']
                  })}
                >
                  False
                </Button>
              </div>
            )}

            {(currentQuestion.type === 'saq' || currentQuestion.type === 'spot') && (
              <div className="space-y-4">
                {currentQuestion.imageUrl && currentQuestion.type === 'spot' && (
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Spot question image"
                    className="max-w-full h-auto rounded-lg mb-4"
                  />
                )}
                <div>
                  <Label>Your Answer</Label>
                  <Input
                    value={shortAnswers[currentQuestion.id] || ''}
                    onChange={(e) => setShortAnswers({
                      ...shortAnswers,
                      [currentQuestion.id]: e.target.value
                    })}
                    placeholder="Type your answer here"
                  />
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button onClick={handleNextQuestion}>
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                  <>
                    Submit Quiz
                    <Check className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}