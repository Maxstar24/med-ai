'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Trash, ArrowLeft, ArrowRight, Save, Download, Eye } from 'lucide-react';

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
  spotCoordinates?: { x: number; y: number; radius: number; label: string }[];
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Quiz data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Questions data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Current question fields
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching' | 'spot' | 'saq'>('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string | boolean | string[]>('');
  const [explanation, setExplanation] = useState('');
  const [questionTags, setQuestionTags] = useState<string[]>([]);
  const [questionTagInput, setQuestionTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [spotCoordinates, setSpotCoordinates] = useState<{ x: number; y: number; radius: number; label: string }[]>([]);
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>(['']);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes/create');
    }
  }, [user, authLoading, router]);

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
    
    // Add image URL for spot questions
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
    
    // Add image URL for spot questions
    if (questionType === 'spot') {
      updatedQuestions[currentQuestionIndex].imageUrl = imageUrl;
    }
    
    setQuestions(updatedQuestions);
  };

  // Delete the current question
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
      // For spot questions, the first item is the main correct answer
      // and the rest are alternative acceptable answers
      setCorrectAnswer(question.correctAnswer[0] || '');
      setAcceptableAnswers(question.correctAnswer.slice(1).concat(''));
    } else {
      setCorrectAnswer(question.correctAnswer as string);
    }
    
    setExplanation(question.explanation);
    setQuestionTags(question.tags || []);
    
    // Load image URL for spot questions
    if (question.type === 'spot') {
      setImageUrl(question.imageUrl || '');
    }
  };

  // Reset the question form for a new question
  const resetQuestionForm = () => {
    setQuestionType('multiple-choice');
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setExplanation('');
    setQuestionTags([]);
    setQuestionTagInput('');
    setImageUrl('');
    setSpotCoordinates([]);
    setAcceptableAnswers(['']);
    setErrors({});
  };

  // Navigate between questions
  const navigateQuestions = (direction: 'prev' | 'next') => {
    // Save current changes before navigating
    if (questionText.trim()) {
      updateQuestion();
    }
    
    if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
    
    if (questions.length > 0) {
      const nextQuestion = questions[
        direction === 'prev' 
          ? currentQuestionIndex - 1 
          : currentQuestionIndex + 1
      ];
      loadQuestion(nextQuestion);
    }
  };

  // Add a tag to the quiz
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Remove a tag from the quiz
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Add a tag to the current question
  const addQuestionTag = () => {
    if (questionTagInput.trim() && !questionTags.includes(questionTagInput.trim())) {
      setQuestionTags([...questionTags, questionTagInput.trim()]);
      setQuestionTagInput('');
    }
  };

  // Remove a tag from the current question
  const removeQuestionTag = (tagToRemove: string) => {
    setQuestionTags(questionTags.filter(tag => tag !== tagToRemove));
  };

  // Add a new acceptable answer for SAQ
  const addAcceptableAnswer = () => {
    setAcceptableAnswers([...acceptableAnswers, '']);
  };

  // Update an acceptable answer for SAQ
  const updateAcceptableAnswer = (index: number, value: string) => {
    const newAnswers = [...acceptableAnswers];
    newAnswers[index] = value;
    setAcceptableAnswers(newAnswers);
  };

  // Remove an acceptable answer for SAQ
  const removeAcceptableAnswer = (index: number) => {
    if (acceptableAnswers.length <= 1) return;
    const newAnswers = [...acceptableAnswers];
    newAnswers.splice(index, 1);
    setAcceptableAnswers(newAnswers);
  };

  // Add a spot coordinate for spot questions
  const addSpotCoordinate = () => {
    setSpotCoordinates([
      ...spotCoordinates,
      { x: 50, y: 50, radius: 10, label: `Spot ${spotCoordinates.length + 1}` }
    ]);
  };

  // Update a spot coordinate for spot questions
  const updateSpotCoordinate = (index: number, field: string, value: any) => {
    const newCoordinates = [...spotCoordinates];
    newCoordinates[index] = { ...newCoordinates[index], [field]: value };
    setSpotCoordinates(newCoordinates);
  };

  // Remove a spot coordinate for spot questions
  const removeSpotCoordinate = (index: number) => {
    const newCoordinates = [...spotCoordinates];
    newCoordinates.splice(index, 1);
    setSpotCoordinates(newCoordinates);
  };

  // Validate quiz data before submission
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

  // Validate the current question
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
      const filledAnswers = acceptableAnswers.filter(a => a.trim()).length;
      if (filledAnswers === 0) newErrors.acceptableAnswers = 'At least one acceptable answer is required';
    }
    
    if (!explanation.trim()) newErrors.explanation = 'Explanation is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save the quiz to the database
  const saveQuiz = async () => {
    if (!validateQuiz()) return;
    
    // If the current question has content, update it first
    if (questionText.trim()) {
      updateQuestion();
    }
    
    try {
      setLoading(true);
      
      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken(true);
      
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title,
          description,
          questions,
          topic,
          difficulty,
          isPublic,
          tags
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Clear any saved draft
        localStorage.removeItem('quizDraft');
        
        // Redirect to the quiz page
        router.push(`/quizzes/${data.quiz.id}`);
      } else {
        console.error('Failed to create quiz:', data.error);
        setErrors({ submit: data.error || 'Failed to create quiz' });
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  // Save the quiz as a draft for later completion
  const saveAsDraft = () => {
    const quizData = {
      title,
      description,
      topic,
      difficulty,
      isPublic,
      questions,
    };
    
    localStorage.setItem('quiz_draft', JSON.stringify(quizData));
    // Show a success message or notification here
  };

  // Load a draft quiz
  const loadDraft = () => {
    const draftData = localStorage.getItem('quiz_draft');
    if (draftData) {
      try {
        const quiz = JSON.parse(draftData);
        setTitle(quiz.title || '');
        setDescription(quiz.description || '');
        setTopic(quiz.topic || '');
        setDifficulty(quiz.difficulty || '');
        setIsPublic(quiz.isPublic || false);
        setQuestions(quiz.questions || []);
        
        if (quiz.questions && quiz.questions.length > 0) {
          setCurrentQuestionIndex(0);
          loadQuestion(quiz.questions[0]);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  };

  // Initialize the form with a draft if available
  React.useEffect(() => {
    if (authLoading) {
      const draftData = localStorage.getItem('quiz_draft');
      if (draftData) {
        // Ask user if they want to load the draft
        if (confirm('You have a saved draft. Would you like to load it?')) {
          loadDraft();
        } else {
          localStorage.removeItem('quiz_draft');
        }
      }
    }
  }, [authLoading]);

  // Update the options array when editing an option
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (authLoading) {
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Create Quiz</h1>
              <p className="text-muted-foreground">
                Create a new quiz with multiple-choice, true/false, and other question types
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/quizzes/manage')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Button>
              <Button onClick={saveAsDraft}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button onClick={loadDraft} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Load Draft
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2">
              <Card className="p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">Quiz Details</h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter quiz title" 
                      className={errors.title ? "border-red-500" : ""}
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter quiz description" 
                      className={errors.description ? "border-red-500" : ""}
                      rows={3} 
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Select value={topic} onValueChange={setTopic}>
                        <SelectTrigger id="topic" className={errors.topic ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cardiology">Cardiology</SelectItem>
                          <SelectItem value="Pharmacology">Pharmacology</SelectItem>
                          <SelectItem value="Neurology">Neurology</SelectItem>
                          <SelectItem value="Anatomy">Anatomy</SelectItem>
                          <SelectItem value="Pathology">Pathology</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.topic && <p className="text-red-500 text-sm mt-1">{errors.topic}</p>}
                    </div>
                    
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger id="difficulty" className={errors.difficulty ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.difficulty && <p className="text-red-500 text-sm mt-1">{errors.difficulty}</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-gray-300 text-primary"
                    />
                    <Label htmlFor="isPublic">Make this quiz public</Label>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Questions</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={resetQuestionForm}>
                      New Question
                    </Button>
                    <Button variant="default" size="sm" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                </div>
                
                {errors.questions && <p className="text-red-500 text-sm mb-4">{errors.questions}</p>}
                
                <div className="mb-4">
                  <Label>Question Type</Label>
                  <Select value={questionType} onValueChange={(value: any) => setQuestionType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="spot">Spot Question (Image)</SelectItem>
                      <SelectItem value="saq">Short Answer Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="questionText">Question</Label>
                  <Textarea 
                    id="questionText" 
                    value={questionText} 
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter your question" 
                    className={errors.questionText ? "border-red-500" : ""}
                    rows={2}
                  />
                  {errors.questionText && <p className="text-red-500 text-sm mt-1">{errors.questionText}</p>}
                </div>
                
                {questionType === 'spot' && (
                  <motion.div 
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input 
                      id="imageUrl" 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Enter image URL" 
                      className={errors.imageUrl ? "border-red-500" : ""}
                    />
                    {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl}</p>}
                    
                    {imageUrl && (
                      <div className="mt-2 mb-4 relative border rounded-md overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Image to identify" 
                          className="max-w-full h-auto"
                          onError={() => setErrors({...errors, imageUrl: 'Invalid image URL'})}
                        />
                      </div>
                    )}
                    
                    <div className="mt-4 mb-4">
                      <Label>Correct Answer</Label>
                      <Input
                        value={typeof correctAnswer === 'string' ? correctAnswer : ''}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="Enter the correct identification"
                        className={errors.correctAnswer ? "border-red-500" : ""}
                      />
                      {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                    </div>
                    
                    <div className="mt-4">
                      <Label>Alternative Acceptable Answers (Optional)</Label>
                      {acceptableAnswers.map((answer, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <Input
                            value={answer}
                            onChange={(e) => updateAcceptableAnswer(index, e.target.value)}
                            placeholder={`Alternative answer ${index + 1}`}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm"
                            onClick={() => removeAcceptableAnswer(index)}
                            disabled={index === 0 && acceptableAnswers.length <= 1}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button 
                        type="button" 
                        onClick={addAcceptableAnswer} 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Alternative Answer
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {questionType === 'multiple-choice' && (
                  <motion.div 
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label>Answer Options</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          id={`option-${index}`}
                          checked={correctAnswer === option && option !== ''}
                          onChange={() => setCorrectAnswer(option)}
                          disabled={!option.trim()}
                          className="radio"
                        />
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className={errors.options ? "border-red-500" : ""}
                        />
                      </div>
                    ))}
                    {errors.options && <p className="text-red-500 text-sm mt-1">{errors.options}</p>}
                    {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                  </motion.div>
                )}
                
                {questionType === 'true-false' && (
                  <motion.div 
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label>Correct Answer</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tfCorrectAnswer"
                          id="true"
                          value="true"
                          checked={correctAnswer === 'true'}
                          onChange={() => setCorrectAnswer('true')}
                          className="radio"
                        />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tfCorrectAnswer"
                          id="false"
                          value="false"
                          checked={correctAnswer === 'false'}
                          onChange={() => setCorrectAnswer('false')}
                          className="radio"
                        />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </div>
                    {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                  </motion.div>
                )}
                
                {questionType === 'saq' && (
                  <motion.div 
                    className="mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label>Acceptable Answers</Label>
                    {errors.acceptableAnswers && <p className="text-red-500 text-sm mt-1">{errors.acceptableAnswers}</p>}
                    
                    {acceptableAnswers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          value={answer}
                          onChange={(e) => updateAcceptableAnswer(index, e.target.value)}
                          placeholder={`Acceptable answer ${index + 1}`}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removeAcceptableAnswer(index)}
                          disabled={acceptableAnswers.length <= 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button 
                      type="button" 
                      onClick={addAcceptableAnswer} 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Acceptable Answer
                    </Button>
                  </motion.div>
                )}
                
                <div className="mb-4">
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea 
                    id="explanation" 
                    value={explanation} 
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain why the correct answer is correct" 
                    className={errors.explanation ? "border-red-500" : ""}
                    rows={3}
                  />
                  {errors.explanation && <p className="text-red-500 text-sm mt-1">{errors.explanation}</p>}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="questionTags">Tags</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="questionTags" 
                      value={questionTagInput} 
                      onChange={(e) => setQuestionTagInput(e.target.value)}
                      placeholder="Add tags separated by comma" 
                      onKeyPress={(e) => e.key === 'Enter' && addQuestionTag()}
                    />
                    <Button type="button" onClick={addQuestionTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {questionTags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button 
                          onClick={() => removeQuestionTag(tag)}
                          className="text-secondary-foreground hover:text-primary focus:outline-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => navigateQuestions('prev')}
                      disabled={currentQuestionIndex === 0 || questions.length === 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigateQuestions('next')}
                      disabled={currentQuestionIndex === questions.length - 1 || questions.length === 0}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  {questions.length > 0 && currentQuestionIndex < questions.length && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={updateQuestion}
                      >
                        Update Question
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={deleteQuestion}
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            <div className="col-span-1">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Quiz Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <Label className="text-sm text-muted-foreground">Title</Label>
                    <p className="font-medium">{title || 'Untitled Quiz'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Topic</Label>
                    <p className="font-medium">{topic || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Difficulty</Label>
                    <p className="font-medium capitalize">{difficulty || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Questions</Label>
                    <p className="font-medium">{questions.length}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Visibility</Label>
                    <p className="font-medium">{isPublic ? 'Public' : 'Private'}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold">Questions List</h3>
                  {questions.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No questions added yet</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      {questions.map((q, idx) => (
                        <div 
                          key={q.id} 
                          className={`p-3 mb-2 rounded-md cursor-pointer border ${
                            idx === currentQuestionIndex ? 'border-primary bg-primary/5' : 'border-secondary'
                          }`}
                          onClick={() => {
                            setCurrentQuestionIndex(idx);
                            loadQuestion(q);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Question {idx + 1}</span>
                            <span className="text-xs text-muted-foreground capitalize">{q.type}</span>
                          </div>
                          <p className="text-sm line-clamp-1">{q.question}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {errors.submit && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {errors.submit}
                  </div>
                )}
                
                <div className="mt-6 space-y-2">
                  <Button className="w-full" onClick={saveQuiz} disabled={loading}>
                    {loading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⭮</span> Saving...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Save className="mr-2 h-4 w-4" /> Save & Publish Quiz
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={saveAsDraft}>
                    <Save className="mr-2 h-4 w-4" /> Save as Draft
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}