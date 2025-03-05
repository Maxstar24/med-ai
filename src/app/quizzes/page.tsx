'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Clock, Brain, Award, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  difficulty: string;
  topic: string;
  createdAt: string;
}

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
}

interface QuizStats {
  totalQuizzesTaken: number;
  averageScore: number;
  totalTimeSpent: number;
  currentStreak: number;
}

export default function QuizzesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTopic) params.append('topic', selectedTopic);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      
      const response = await fetch(`/api/quizzes?${params.toString()}`);
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
  }, [selectedTopic, selectedDifficulty]);

  const fetchResults = useCallback(async (quizId: string) => {
    try {
      const response = await fetch(`/api/quizzes/results?quizId=${quizId}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch results:', data.error);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchQuizzes();
    };
    init();
  }, [fetchQuizzes]);

  useEffect(() => {
    if (activeQuiz) {
      fetchResults(activeQuiz.id);
    }
  }, [activeQuiz, fetchResults]);

  useEffect(() => {
    if (quizStartTime && !quizComplete) {
      timerRef.current = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [quizStartTime, quizComplete]);

  const fetchQuestions = async (quizId: string) => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}/questions`);
      const data = await response.json();
      
      if (response.ok) {
        setQuestions(data.questions);
      } else {
        console.error('Failed to fetch questions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startQuiz = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizComplete(false);
    setScore(0);
    await fetchQuestions(quiz.id);
  };

  const handleAnswer = (answer: any) => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        answer,
        isCorrect
      }
    }));

    setShowExplanation(true);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
          <h1 className="text-4xl font-bold mb-8">Medical Quizzes</h1>
          
          {!activeQuiz ? (
            <>
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
                
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Topics</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Pharmacology">Pharmacology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Difficulties</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                      <p className="text-muted-foreground mb-4">{quiz.description}</p>
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
                      <Button onClick={() => startQuiz(quiz)} className="w-full">
                        Start Quiz
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Card className="p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-2">{activeQuiz.title}</h2>
                  <Progress value={(currentQuestionIndex / questions.length) * 100} />
                </div>

                {!quizComplete ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestionIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xl mb-4">Question {currentQuestionIndex + 1}</h3>
                          <p className="text-lg">{questions[currentQuestionIndex]?.question}</p>
                        </div>

                        <div className="space-y-2">
                          {questions[currentQuestionIndex]?.options.map((option, index) => {
                            const userAnswer = userAnswers[currentQuestionIndex];
                            const isSelected = userAnswer?.answer === option;
                            const showResult = showExplanation && isSelected;
                            const isCorrect = option === questions[currentQuestionIndex].correctAnswer;

                            return (
                              <Button
                                key={index}
                                variant={isSelected ? "default" : "outline"}
                                className={`w-full text-left justify-start ${
                                  showResult ? (isCorrect ? "bg-green-500" : "bg-red-500") : ""
                                }`}
                                onClick={() => !showExplanation && handleAnswer(option)}
                                disabled={showExplanation}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span>{String.fromCharCode(65 + index)}.</span>
                                  <span className="flex-1">{option}</span>
                                  {showResult && (
                                    isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                                  )}
                                </div>
                              </Button>
                            );
                          })}
                        </div>

                        {showExplanation && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-4 bg-muted rounded-lg"
                          >
                            <h4 className="font-semibold mb-2">Explanation</h4>
                            <p>{questions[currentQuestionIndex].explanation}</p>
                            <Button onClick={nextQuestion} className="mt-4">
                              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Complete Quiz"}
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-4">Quiz Complete!</h3>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm text-muted-foreground mb-1">Score</p>
                          <p className="text-2xl font-bold text-primary">
                            {score} / {questions.length}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ({Math.round((score / questions.length) * 100)}%)
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm text-muted-foreground mb-1">Time</p>
                          <p className="text-2xl font-bold">{formatTime(timeSpent)}</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(timeSpent / questions.length)}s per question
                          </p>
                        </div>
                      </div>

                      {stats && (
                        <div className="bg-muted rounded-lg p-4 mb-6">
                          <h4 className="font-semibold mb-3">Your Stats</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Quizzes</p>
                              <p className="text-lg font-semibold">{stats.totalQuizzesTaken}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Average Score</p>
                              <p className="text-lg font-semibold">
                                {Math.round(stats.averageScore * 100)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Current Streak</p>
                              <p className="text-lg font-semibold">{stats.currentStreak} days</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Time</p>
                              <p className="text-lg font-semibold">{formatTime(stats.totalTimeSpent)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <Button
                        onClick={() => startQuiz(activeQuiz!)}
                        className="flex-1"
                        variant="outline"
                      >
                        Retry Quiz
                      </Button>
                      <Link href="/quizzes/history" className="flex-1">
                        <Button className="w-full" variant="outline">
                          View History
                        </Button>
                      </Link>
                      <Button
                        onClick={() => setActiveQuiz(null)}
                        className="flex-1"
                      >
                        Back to Quizzes
                      </Button>
                    </div>
                  </motion.div>
                )}
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 