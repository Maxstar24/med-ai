'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Plus, Trash, ArrowLeft, ArrowRight, Save, Download, Eye, PlusCircle, Upload, Sparkles, Edit, Check } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching' | 'spot' | 'saq';
  question: string;
  options: string[];
  correctAnswer: string | boolean | string[];
  explanation: string;
  difficulty: string;
  topic: string;
  tags: string[];
  imageUrl?: string;
}

interface Quiz {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: string;
  topic: string;
  createdAt: string;
  createdBy: string;
  isPublic: boolean;
}

// Question card component
const QuestionCard = ({ 
  question, 
  index, 
  onEdit, 
  onDelete 
}: { 
  question: Question; 
  index: number; 
  onEdit: () => void; 
  onDelete: () => void; 
}) => {
  // Get question type display name
  const getQuestionTypeDisplay = (type: string) => {
    switch (type) {
      case 'multiple-choice': return 'Multiple Choice';
      case 'true-false': return 'True/False';
      case 'saq': return 'Short Answer';
      case 'spot': return 'Spot Question';
      default: return type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border rounded-md p-4 mb-3 bg-card"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium">
            {index + 1}
          </span>
          <span className="text-sm font-medium">{getQuestionTypeDisplay(question.type)}</span>
          {question.tags.length > 0 && (
            <div className="flex gap-1">
              {question.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs">
                  {tag}
                </span>
              ))}
              {question.tags.length > 2 && (
                <span className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs">
                  +{question.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-sm mb-2 line-clamp-2">{question.question}</p>
      
      {question.type === 'multiple-choice' && (
        <div className="text-xs text-muted-foreground">
          {Array.isArray(question.options) && question.options.map((option, i) => (
            <div key={i} className="flex items-start gap-1 mb-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                question.correctAnswer === option ? 'bg-green-500 text-white' : 'border border-muted'
              }`}>
                {question.correctAnswer === option && <Check className="h-3 w-3" />}
              </div>
              <span className={question.correctAnswer === option ? 'font-medium text-foreground' : ''}>
                {option}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {question.type === 'true-false' && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${
              question.correctAnswer === 'true' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''
            }`}>
              True
            </span>
            <span className={`px-2 py-0.5 rounded ${
              question.correctAnswer === 'false' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''
            }`}>
              False
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const quizId = params.id as string;
  
  // Quiz data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current question fields
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching' | 'spot' | 'saq'>('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string | boolean | string[]>('');
  const [explanation, setExplanation] = useState('');
  const [questionTags, setQuestionTags] = useState<string[]>([]);
  const [questionTagInput, setQuestionTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>(['']);
  
  // UI states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingStatus, setLoadingStatus] = useState('');

  // Fetch quiz data
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

        const quiz = data.quiz;
        setTitle(quiz.title);
        setDescription(quiz.description);
        setTopic(quiz.topic);
        setDifficulty(quiz.difficulty);
        setIsPublic(quiz.isPublic);
        setQuestions(quiz.questions);

        if (quiz.questions.length > 0) {
          loadQuestion(quiz.questions[0]);
        }
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

  // Load a question into the form
  const loadQuestion = (question: Question) => {
    setQuestionType(question.type);
    setQuestionText(question.question);
    setOptions(question.type === 'multiple-choice' 
      ? [...question.options, '', '', '', ''].slice(0, 4)
      : question.options
    );
    
    if (question.type === 'true-false') {
      setCorrectAnswer(
        typeof question.correctAnswer === 'boolean' 
          ? question.correctAnswer ? 'true' : 'false'
          : question.correctAnswer
      );
    } else if (question.type === 'saq' && Array.isArray(question.correctAnswer)) {
      setAcceptableAnswers([...question.correctAnswer, '']);
    } else if (question.type === 'spot' && Array.isArray(question.correctAnswer)) {
      setCorrectAnswer(question.correctAnswer[0] || '');
      setAcceptableAnswers(question.correctAnswer.slice(1).concat(''));
    } else {
      setCorrectAnswer(question.correctAnswer as string);
    }
    
    setExplanation(question.explanation);
    setQuestionTags(question.tags || []);
    
    if (question.type === 'spot') {
      setImageUrl(question.imageUrl || '');
    }
  };

  // Reset the question form
  const resetQuestionForm = () => {
    setQuestionType('multiple-choice');
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setExplanation('');
    setQuestionTags([]);
    setQuestionTagInput('');
    setImageUrl('');
    setAcceptableAnswers(['']);
    setErrors({});
  };

  // Add a new question
  const addQuestion = () => {
    if (!validateCurrentQuestion()) return;
    
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: questionType,
      question: questionText,
      options: questionType === 'multiple-choice' ? options.filter(o => o.trim()) : options,
      correctAnswer: questionType === 'true-false' 
        ? correctAnswer === 'true' 
        : questionType === 'saq'
        ? acceptableAnswers.filter(a => a.trim())
        : questionType === 'spot'
        ? [correctAnswer as string, ...acceptableAnswers.filter(a => a.trim())]
        : correctAnswer,
      explanation,
      difficulty: difficulty || 'intermediate',
      topic: topic || '',
      tags: questionTags
    };
    
    if (questionType === 'spot') {
      newQuestion.imageUrl = imageUrl;
    }
    
    setQuestions([...questions, newQuestion]);
    resetQuestionForm();
    setCurrentQuestionIndex(questions.length);
  };

  // Update an existing question
  const updateQuestion = () => {
    if (!validateCurrentQuestion()) return;
    
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      type: questionType,
      question: questionText,
      options: questionType === 'multiple-choice' ? options.filter(o => o.trim()) : options,
      correctAnswer: questionType === 'true-false' 
        ? correctAnswer === 'true' 
        : questionType === 'saq'
        ? acceptableAnswers.filter(a => a.trim())
        : questionType === 'spot'
        ? [correctAnswer as string, ...acceptableAnswers.filter(a => a.trim())]
        : correctAnswer,
      explanation,
      difficulty: difficulty || 'intermediate',
      topic: topic || '',
      tags: questionTags
    };
    
    if (questionType === 'spot') {
      updatedQuestions[currentQuestionIndex].imageUrl = imageUrl;
    }
    
    setQuestions(updatedQuestions);
  };

  // Delete a question
  const deleteQuestion = () => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(currentQuestionIndex, 1);
    setQuestions(updatedQuestions);
    
    if (currentQuestionIndex >= updatedQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, updatedQuestions.length - 1));
    }
    
    if (updatedQuestions.length === 0) {
      resetQuestionForm();
    } else {
      loadQuestion(updatedQuestions[currentQuestionIndex]);
    }
  };

  // Validate quiz data
  const validateQuiz = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!topic.trim()) newErrors.topic = 'Topic is required';
    if (!difficulty) newErrors.difficulty = 'Difficulty is required';
    if (questions.length === 0) newErrors.questions = 'At least one question is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate current question
  const validateCurrentQuestion = () => {
    const newErrors: Record<string, string> = {};
    
    if (!questionText.trim()) newErrors.questionText = 'Question text is required';
    
    if (questionType === 'multiple-choice') {
      const filledOptions = options.filter(o => o.trim()).length;
      if (filledOptions < 2) newErrors.options = 'At least 2 options are required';
      if (!correctAnswer) newErrors.correctAnswer = 'Correct answer is required';
    }
    
    if (questionType === 'true-false' && !correctAnswer) {
      newErrors.correctAnswer = 'Select True or False';
    }
    
    if (questionType === 'spot') {
      if (!imageUrl.trim()) newErrors.imageUrl = 'Image URL is required';
      if (!correctAnswer || (typeof correctAnswer === 'string' && !correctAnswer.trim())) {
        newErrors.correctAnswer = 'Correct identification answer is required';
      }
    }
    
    if (questionType === 'saq') {
      if (!acceptableAnswers[0] || !acceptableAnswers[0].trim()) {
        newErrors.acceptableAnswers = 'Primary answer is required';
      }
    }
    
    if (!explanation.trim()) newErrors.explanation = 'Explanation is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save the quiz
  const saveQuiz = async () => {
    if (!validateQuiz()) return;
    
    try {
      setLoading(true);
      setLoadingStatus('Saving quiz...');
      
      const idToken = await user?.getIdToken(true);
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title,
          description,
          topic,
          difficulty,
          isPublic,
          questions
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLoadingStatus('Quiz saved successfully! Redirecting...');
        router.push(`/quizzes/${quizId}`);
      } else {
        console.error('Failed to save quiz:', data.error);
        setErrors({ submit: data.error || 'Failed to save quiz' });
        setLoadingStatus('');
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      setErrors({ submit: 'An unexpected error occurred' });
      setLoadingStatus('');
    } finally {
      setLoading(false);
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
        <div className="mb-6 flex justify-between items-center">
          <Link href={`/quizzes/${quizId}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quiz
            </Button>
          </Link>
          <Button onClick={saveQuiz} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Quiz Details</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter quiz title"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter quiz description"
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                </div>

                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Select value={topic} onValueChange={(value) => setTopic(value)}>
                    <SelectTrigger className={errors.topic ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anatomy">Anatomy</SelectItem>
                      <SelectItem value="physiology">Physiology</SelectItem>
                      <SelectItem value="pathology">Pathology</SelectItem>
                      <SelectItem value="pharmacology">Pharmacology</SelectItem>
                      <SelectItem value="biochemistry">Biochemistry</SelectItem>
                      <SelectItem value="microbiology">Microbiology</SelectItem>
                      <SelectItem value="immunology">Immunology</SelectItem>
                      <SelectItem value="genetics">Genetics</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.topic && <p className="text-sm text-red-500 mt-1">{errors.topic}</p>}
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(value) => setDifficulty(value)}>
                    <SelectTrigger className={errors.difficulty ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.difficulty && <p className="text-sm text-red-500 mt-1">{errors.difficulty}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isPublic">Make this quiz public</Label>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Questions</h2>
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onEdit={() => {
                    setCurrentQuestionIndex(index);
                    loadQuestion(question);
                  }}
                  onDelete={() => {
                    if (confirm('Are you sure you want to delete this question?')) {
                      const updatedQuestions = [...questions];
                      updatedQuestions.splice(index, 1);
                      setQuestions(updatedQuestions);
                    }
                  }}
                />
              ))}
              <Button
                onClick={() => {
                  resetQuestionForm();
                  setCurrentQuestionIndex(questions.length);
                }}
                className="w-full mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Question
              </Button>
            </Card>
          </div>

          <Card className="p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Quiz Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-2xl font-bold">{questions.length * 1.5} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Question Types</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(new Set(questions.map(q => q.type))).map(type => (
                    <span key={type} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 