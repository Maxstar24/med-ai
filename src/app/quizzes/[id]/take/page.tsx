'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Question {
  _id: string;
  text: string;
  type: string;
  options: {
    _id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  correctAnswer: string | string[];
  formattedOptions?: {
    _id: string;
    text: string;
    isCorrect: boolean;
  }[];
  imageUrl?: string;
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
  const { user, loading: authLoading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [selectedSpots, setSelectedSpots] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use the id from useParams hook
  const quizId = Array.isArray(params.id) ? params.id[0] : params.id as string;

  // Helper function to get the quiz ID, handling both id and _id properties
  const getQuizId = (quiz: Quiz) => quiz?._id || quiz?.id;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes/' + quizId + '/take');
      return;
    }

    if (!authLoading && user && quizId && quizId !== 'undefined') {
      const fetchQuiz = async () => {
        try {
          console.log('Fetching quiz with ID:', quizId);
          
          // Get Firebase ID token for authentication
          const idToken = await user.getIdToken(true);
          
          const response = await fetch(`/api/quizzes/${quizId}`, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
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
          const initialShortAnswers: Record<string, string> = {};
          const initialSelectedSpots: Record<string, number[]> = {};
          
          formattedQuiz.questions.forEach((question: Question) => {
            initialSelectedOptions[question._id] = [];
            initialShortAnswers[question._id] = '';
            initialSelectedSpots[question._id] = [];
          });
          
          setSelectedOptions(initialSelectedOptions);
          setShortAnswers(initialShortAnswers);
          setSelectedSpots(initialSelectedSpots);
          
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
  }, [quizId, router, user, authLoading]);

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

  const handleShortAnswerChange = (questionId: string, value: string) => {
    setShortAnswers({
      ...shortAnswers,
      [questionId]: value
    });
  };

  const handleSpotClick = (questionId: string, spotIndex: number) => {
    const currentSelected = selectedSpots[questionId] || [];
    const updatedSpots = currentSelected.includes(spotIndex)
      ? currentSelected.filter(idx => idx !== spotIndex)
      : [...currentSelected, spotIndex];
    
    setSelectedSpots({
      ...selectedSpots,
      [questionId]: updatedSpots
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
    
    try {
      setLoading(true);
      
      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken(true);
      
      const quizId = getQuizId(quiz);
      
      // Prepare answers based on question types
      const answers = quiz.questions.map((question, index) => {
        if (question.type === 'spot') {
          return {
            questionId: question._id,
            shortAnswer: shortAnswers[question._id] || ''
          };
        } else if (question.type === 'saq') {
          return {
            questionId: question._id,
            shortAnswer: shortAnswers[question._id] || ''
          };
        } else {
          return {
            questionId: question._id,
            selectedOptionIds: selectedOptions[question._id] || []
          };
        }
      });
      
      const response = await fetch('/api/quizzes/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          quizId,
          answers,
          timeSpent: 0 // TODO: Implement timer
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }
      
      const data = await response.json();
      setResultsId(data.resultId);
      setQuizSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // Determine if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    
    if (currentQuestion.type === 'spot') {
      return (shortAnswers[currentQuestion._id] || '').trim().length > 0;
    } else if (currentQuestion.type === 'saq') {
      return (shortAnswers[currentQuestion._id] || '').trim().length > 0;
    } else {
      return (selectedOptions[currentQuestion._id] || []).length > 0;
    }
  };

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
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1}</h2>
            <p className="mb-6">{currentQuestion.text}</p>
            
            {/* Multiple Choice Question */}
            {currentQuestion.type === 'multiple-choice' && Array.isArray(currentQuestion.formattedOptions) && (
              <motion.div 
                className="space-y-3 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
              >
                {currentQuestion.formattedOptions.map((option, index) => {
                  const optionId = option._id;
                  const isSelected = selectedOptions[currentQuestion._id]?.includes(optionId);
                  
                  return (
                    <motion.div 
                      key={optionId} 
                      className={`flex items-start space-x-3 p-3 rounded-md transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOptionToggle(currentQuestion._id, optionId)}
                    >
                      <Checkbox
                        id={optionId}
                        checked={isSelected}
                        onCheckedChange={() => handleOptionToggle(currentQuestion._id, optionId)}
                      />
                      <label 
                        htmlFor={optionId}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.text}
                      </label>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            
            {/* True/False Question */}
            {currentQuestion.type === 'true-false' && Array.isArray(currentQuestion.formattedOptions) && (
              <motion.div 
                className="flex gap-4 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
              >
                {currentQuestion.formattedOptions.map((option, index) => {
                  const optionId = option._id;
                  const isSelected = selectedOptions[currentQuestion._id]?.includes(optionId);
                  
                  return (
                    <motion.div 
                      key={optionId} 
                      className={`flex-1 p-4 rounded-md border transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/10 border-primary/30' : 'border-border hover:bg-muted/50'
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        // For true/false, we want to select only one option
                        setSelectedOptions({
                          ...selectedOptions,
                          [currentQuestion._id]: [optionId]
                        });
                      }}
                    >
                      <div className="flex justify-center items-center h-full">
                        <span className="text-lg font-medium">{option.text}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            
            {/* Spot Question (Image Identification) */}
            {currentQuestion.type === 'spot' && currentQuestion.imageUrl && (
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative border rounded-md overflow-hidden mb-6">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Image to identify" 
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
                
                <div className="mb-2">
                  <Label htmlFor="image-identification">Your Answer</Label>
                  <Textarea 
                    id="image-identification"
                    value={shortAnswers[currentQuestion._id] || ''}
                    onChange={(e) => handleShortAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Identify what you see in the image..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your identification of the image above. Be specific and concise.
                </p>
              </motion.div>
            )}
            
            {/* Short Answer Question */}
            {currentQuestion.type === 'saq' && (
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-2">
                  <Label htmlFor="short-answer">Your Answer</Label>
                  <Textarea 
                    id="short-answer"
                    value={shortAnswers[currentQuestion._id] || ''}
                    onChange={(e) => handleShortAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your answer in the text field above. Be concise and specific.
                </p>
              </motion.div>
            )}
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
                disabled={!isCurrentQuestionAnswered()}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                disabled={!isCurrentQuestionAnswered()}
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

function formatQuestionOptions(quiz: Quiz): Quiz {
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
    else if (question.type === 'spot' || question.type === 'saq') {
      // These question types don't need formatted options
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
        }
      }
    }
    
    // Keep original options array for reference
    // but use formattedOptions for rendering
  });
  
  return quizCopy;
}