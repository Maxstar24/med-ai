'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  _id: string;
  text: string;
  options: {
    _id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  type: string;
  correctAnswer: string;
  formattedOptions?: {
    _id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  questions: Question[];
}

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use the id from useParams hook
  const quizId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  // Helper function to get the quiz ID, handling both id and _id properties
  const getQuizId = (quiz: Quiz) => quiz?._id || quiz?.id;

  const formatQuestionOptions = (quiz: Quiz): Quiz => {
    // Create a deep copy to avoid mutating original data
    const quizCopy = JSON.parse(JSON.stringify(quiz));
    
    // Handle both formats of questions and options
    quizCopy.questions.forEach((question: Question, qIndex: number) => {
      // Support both text and question fields
      question.text = question.text || (question as any).question;
      
      // Ensure question has a unique _id
      if (!question._id) {
        question._id = `question-${qIndex}`;
      }
      
      // Special handling for different question types
      if (question.type === 'true-false') {
        // For true-false questions, create True/False options as array of objects
        // (originally just empty strings in the database)
        question.formattedOptions = [
          {
            _id: `option-${qIndex}-true`,
            text: 'True',
            isCorrect: question.correctAnswer === 'true'
          },
          {
            _id: `option-${qIndex}-false`,
            text: 'False',
            isCorrect: question.correctAnswer === 'false'
          }
        ];
      } 
      else if (question.type === 'multiple-choice') {
        // For multiple choice questions
        // Convert the array of strings to array of objects with IDs
        question.formattedOptions = question.options.map((option: any, oIndex: number) => {
          return {
            _id: `option-${qIndex}-${oIndex}`,
            text: option,
            isCorrect: question.correctAnswer === option
          };
        });
      }
      else {
        // Default case for other question types
        if (Array.isArray(question.options)) {
          if (question.options.length === 0 || question.options.every((opt: any) => opt === '')) {
            question.formattedOptions = [
              {
                _id: `option-${qIndex}-default`,
                text: 'No options provided',
                isCorrect: false
              }
            ];
          } else {
            question.formattedOptions = question.options.map((option: any, oIndex: number) => {
              return {
                _id: `option-${qIndex}-${oIndex}`,
                text: option || `Option ${oIndex + 1}`, // Fallback for empty strings
                isCorrect: question.correctAnswer === option
              };
            });
          }
        } else {
          question.formattedOptions = [{
            _id: `option-${qIndex}-default`,
            text: 'No options available',
            isCorrect: false
          }];
        }
      }
      
      // Keep original options array for reference
      // but use formattedOptions for rendering
    });
    
    return quizCopy;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

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
          
          // Format the quiz to ensure all options have unique IDs
          const formattedQuiz = formatQuestionOptions(data.quiz);
          setQuiz(formattedQuiz);
          
          // Initialize selectedOptions with empty arrays for each question
          const initialSelectedOptions: Record<string, string[]> = {};
          formattedQuiz.questions.forEach((question: Question) => {
            initialSelectedOptions[question._id] = [];
          });
          setSelectedOptions(initialSelectedOptions);
          
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

  const handleOptionToggle = (questionId: string, optionId: string) => {
    const currentSelected = selectedOptions[questionId] || [];
    const updatedOptions = currentSelected.includes(optionId)
      ? currentSelected.filter(id => id !== optionId)
      : [...currentSelected, optionId];
    
    setSelectedOptions({
      ...selectedOptions,
      [questionId]: updatedOptions
    });
  };

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    
    // Calculate the score
    const score = Object.keys(selectedOptions).reduce((total, questionId) => {
      const question = quiz.questions.find(q => q._id === questionId);
      if (!question) return total;
      const correctOptions = question.formattedOptions?.filter(opt => opt.isCorrect).map(opt => opt._id) || [];
      const selected = selectedOptions[questionId];
      if (correctOptions.length === selected.length && correctOptions.every(opt => selected.includes(opt))) {
        return total + 1;
      }
      return total;
    }, 0);
    
    // Format the answers for submission
    const answers = Object.keys(selectedOptions).map(questionId => ({
      questionId,
      userAnswer: selectedOptions[questionId],
      isCorrect: selectedOptions[questionId].every(opt => quiz.questions.find(q => q._id === questionId)?.formattedOptions?.find(o => o._id === opt)?.isCorrect),
    }));
    
    try {
      const response = await fetch(`/api/quizzes/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: getQuizId(quiz),
          score: score,
          totalQuestions: quiz.questions.length,
          timeSpent: 0, // You can calculate the actual time spent if needed
          answers: answers,
          completedAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit quiz (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      setResultsId(data.result._id);
      setQuizSubmitted(true);
      
      // Redirect to results page
      router.push(`/quizzes/results/${data.result._id}`);
      
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    }
  };

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
            <Link href={`/quizzes/${quizId !== 'undefined' ? quizId : ''}`}>
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Quiz Details
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

  if (quizSubmitted && resultsId) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-medium mb-2">Quiz Submitted!</h3>
            <p className="text-muted-foreground mb-6">Your answers have been recorded.</p>
            <Link href={`/quizzes/results/${resultsId}`}>
              <Button>
                View Results
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href={`/quizzes/${quizId}`}>
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Quiz Details
            </Button>
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          <div className="flex items-center gap-2 mb-2">
            <Progress value={progress} className="h-2" />
            <span className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>
        </div>
        
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1}</h2>
            <p className="mb-6">{currentQuestion.text}</p>
            
            {/* Render options from formattedOptions */}
            <div className="space-y-3 mb-6">
              {Array.isArray(currentQuestion.formattedOptions) && currentQuestion.formattedOptions.map((option, index) => {
                const optionId = option._id;
                return (
                  <div 
                    key={optionId} 
                    className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50"
                  >
                    <Checkbox
                      id={optionId}
                      checked={selectedOptions[currentQuestion._id]?.includes(optionId)}
                      onCheckedChange={() => handleOptionToggle(currentQuestion._id, optionId)}
                    />
                    <label 
                      htmlFor={optionId}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.text}
                    </label>
                  </div>
                );
              })}
            </div>
          </Card>
          
          <div className="flex justify-between">
            <Button 
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              Previous
            </Button>
            
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button 
                onClick={handleSubmitQuiz}
                disabled={Object.values(selectedOptions).every(options => options.length === 0)}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}