'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Heart,
  Stethoscope,
  Pill,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  Timer
} from 'lucide-react';

interface BaseQuestion {
  id: number;
  category: 'Cardiology' | 'Pharmacology' | 'Neurology';
  question: string;
  explanation: string;
}

interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer: number;
}

interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer: boolean;
}

interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: Array<{ item: string; match: string }>;
}

type Question = MultipleChoiceQuestion | TrueFalseQuestion | MatchingQuestion;

interface QuizState {
  currentQuestionIndex: number;
  score: number;
  answers: (number | boolean | string[])[];
  showExplanation: boolean;
  isCorrect: boolean | null;
  streak: number;
  timeRemaining: number;
}

interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
}

const ResultsScreen = ({ score, totalQuestions, onRetry }: ResultsScreenProps) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <Card className="p-8 border-slate-800 bg-slate-900/50">
        <div className="text-center mb-8">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${
            percentage >= 80 ? 'text-yellow-500' :
            percentage >= 60 ? 'text-blue-500' :
            'text-slate-500'
          }`} />
          <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-slate-400">Here's how you did:</p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-lg">Score</span>
            <span className="text-2xl font-bold">{score} / {totalQuestions}</span>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span>Percentage</span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentage >= 80 ? 'bg-yellow-500' :
                  percentage >= 60 ? 'bg-blue-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg mb-2">
              {percentage >= 80 ? 'Excellent work! 🎉' :
               percentage >= 60 ? 'Good job! Keep practicing! 💪' :
               'Keep studying, you\'ll get better! 📚'}
            </p>
            <p className="text-slate-400">
              {percentage >= 80 ? 'You\'re mastering the material!' :
               percentage >= 60 ? 'You\'re making good progress.' :
               'Practice makes perfect.'}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            className="flex-1"
            onClick={onRetry}
          >
            Try Again
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface DifficultyOption {
  value: Difficulty;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const difficultyOptions: DifficultyOption[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Start with the basics. Perfect for students new to medical concepts.',
    icon: <Brain className="w-8 h-8 text-green-500" />
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Challenge yourself with more complex topics and scenarios.',
    icon: <Stethoscope className="w-8 h-8 text-blue-500" />
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Test your expertise with advanced medical knowledge.',
    icon: <Heart className="w-8 h-8 text-red-500" />
  }
];

interface DifficultySelectProps {
  onSelect: (difficulty: Difficulty) => void;
}

const DifficultySelect = ({ onSelect }: DifficultySelectProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <Card className="p-8 border-slate-800 bg-slate-900/50">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Choose Your Difficulty</h2>
          <p className="text-slate-400">Select the difficulty level that matches your knowledge</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {difficultyOptions.map((option) => (
            <motion.div
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="p-6 border-slate-800 bg-slate-800/50 hover:bg-slate-800/75 cursor-pointer transition-colors"
                onClick={() => onSelect(option.value)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    {option.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{option.label}</h3>
                  <p className="text-sm text-slate-400">{option.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default function PracticePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    showExplanation: false,
    isCorrect: null,
    streak: 0,
    timeRemaining: 30
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (quizState.timeRemaining > 0 && !quizState.showExplanation) {
      const timer = setInterval(() => {
        setQuizState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizState.timeRemaining, quizState.showExplanation]);

  const fetchQuestions = async (difficulty?: Difficulty) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = difficulty ? `/api/practice?difficulty=${difficulty}` : '/api/practice';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch questions');
      
      const data = await response.json();
      setQuestions(data.questions);
    } catch (error) {
      setError('Failed to load questions. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: number | boolean | string[]) => {
    const currentQuestion = questions[quizState.currentQuestionIndex];
    
    try {
      const response = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer
        }),
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();
      const { isCorrect, explanation } = data;

      const newScore = isCorrect ? quizState.score + 1 : quizState.score;
      const newStreak = isCorrect ? quizState.streak + 1 : 0;

      setQuizState(prev => ({
        ...prev,
        answers: [...prev.answers, answer],
        showExplanation: true,
        isCorrect,
        score: newScore,
        streak: newStreak
      }));
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to submit answer. Please try again.');
    }
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        showExplanation: false,
        isCorrect: null,
        timeRemaining: 30
      }));
    } else {
      setShowResults(true);
    }
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    fetchQuestions(difficulty);
  };

  const handleRetry = () => {
    setShowResults(false);
    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      showExplanation: false,
      isCorrect: null,
      streak: 0,
      timeRemaining: 30
    });
    setSelectedDifficulty(null);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <MainNav />
        <main className="container pt-24 pb-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <MainNav />
        <main className="container pt-24 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Error</h1>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchQuestions()}>Try Again</Button>
          </div>
        </main>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-black">
        <MainNav />
        <main className="container pt-24 pb-8">
          <ResultsScreen
            score={quizState.score}
            totalQuestions={questions.length}
            onRetry={handleRetry}
          />
        </main>
      </div>
    );
  }

  if (!selectedDifficulty) {
    return (
      <div className="min-h-screen bg-black">
        <MainNav />
        <main className="container pt-24 pb-8">
          <DifficultySelect onSelect={handleDifficultySelect} />
        </main>
      </div>
    );
  }

  const currentQuestion = questions[quizState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-black">
      <MainNav />
      <main className="container pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Practice Mode</h1>
              <p className="text-slate-400">Test your medical knowledge</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">{quizState.score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-500" />
                <span className="font-semibold">{quizState.timeRemaining}s</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mb-8">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${((quizState.currentQuestionIndex + 1) / questions.length) * 100}%`
                }}
              />
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6 border-slate-800 bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-6">
                    {currentQuestion.category === 'Cardiology' && (
                      <Heart className="w-6 h-6 text-red-500" />
                    )}
                    {currentQuestion.category === 'Pharmacology' && (
                      <Pill className="w-6 h-6 text-green-500" />
                    )}
                    {currentQuestion.category === 'Neurology' && (
                      <Brain className="w-6 h-6 text-purple-500" />
                    )}
                    <span className="text-sm text-slate-400">{currentQuestion.category}</span>
                  </div>

                  <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>

                  {/* Multiple choice options */}
                  {currentQuestion.type === 'multiple-choice' && (
                    <div className="grid grid-cols-1 gap-3">
                      {(currentQuestion as MultipleChoiceQuestion).options.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className={`justify-start text-left h-auto py-4 ${
                            quizState.showExplanation &&
                            index === (currentQuestion as MultipleChoiceQuestion).correctAnswer &&
                            'border-green-500 text-green-500'
                          } ${
                            quizState.showExplanation &&
                            index !== (currentQuestion as MultipleChoiceQuestion).correctAnswer &&
                            'border-red-500 text-red-500'
                          }`}
                          onClick={() => !quizState.showExplanation && handleAnswer(index)}
                          disabled={quizState.showExplanation}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* True/False options */}
                  {currentQuestion.type === 'true-false' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className={`${
                          quizState.showExplanation &&
                          (currentQuestion as TrueFalseQuestion).correctAnswer === true &&
                          'border-green-500 text-green-500'
                        }`}
                        onClick={() => !quizState.showExplanation && handleAnswer(true)}
                        disabled={quizState.showExplanation}
                      >
                        True
                      </Button>
                      <Button
                        variant="outline"
                        className={`${
                          quizState.showExplanation &&
                          (currentQuestion as TrueFalseQuestion).correctAnswer === false &&
                          'border-green-500 text-green-500'
                        }`}
                        onClick={() => !quizState.showExplanation && handleAnswer(false)}
                        disabled={quizState.showExplanation}
                      >
                        False
                      </Button>
                    </div>
                  )}

                  {/* Matching pairs */}
                  {currentQuestion.type === 'matching' && (
                    <div className="grid grid-cols-2 gap-4">
                      {(currentQuestion as MatchingQuestion).pairs.map((pair, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <Button variant="outline" className="flex-1">
                            {pair.item}
                          </Button>
                          <Button variant="outline" className="flex-1">
                            {pair.match}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {quizState.showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <div
                        className={`p-4 rounded-lg ${
                          quizState.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {quizState.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-semibold">
                            {quizState.isCorrect ? 'Correct!' : 'Incorrect'}
                          </span>
                        </div>
                        <p className="text-slate-300">{currentQuestion.explanation}</p>
                      </div>

                      <Button
                        className="w-full mt-4"
                        onClick={handleNextQuestion}
                        disabled={quizState.currentQuestionIndex === questions.length - 1}
                      >
                        Next Question
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Streak indicator */}
            {quizState.streak > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>{quizState.streak} streak!</span>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}