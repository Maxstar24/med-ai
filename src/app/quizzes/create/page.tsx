'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import { Plus, Trash, ArrowLeft, ArrowRight, Save, Download, Eye, PlusCircle, Upload, Sparkles, Edit, Check } from 'lucide-react';

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
      
      {question.type === 'saq' && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Answers: </span>
          {Array.isArray(question.correctAnswer) ? (
            <div>
              <span className="font-medium text-foreground">{question.correctAnswer[0]}</span>
              {question.correctAnswer.length > 1 && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">Alternative answers: </span>
                  <span className="text-xs">
                    {question.correctAnswer.slice(1, 4).join(', ')}
                    {question.correctAnswer.length > 4 && ` (+${question.correctAnswer.length - 4} more)`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            String(question.correctAnswer)
          )}
        </div>
      )}
      
      {question.type === 'spot' && question.imageUrl && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Image included</span>
          {/* Could show a thumbnail here */}
        </div>
      )}
    </motion.div>
  );
};

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
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomTopicInput, setShowCustomTopicInput] = useState(false);
  
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>(['']);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Add a state to track if user has been verified
  const [userVerified, setUserVerified] = useState(false);

  // Add a state to track loading status
  const [loadingStatus, setLoadingStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Add a state to track AI generation
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState('');

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes/create');
    }
  }, [user, authLoading, router]);

  // Check if user exists when component mounts
  React.useEffect(() => {
    if (!authLoading && user) {
      checkUserExists();
    }
  }, [user, authLoading]);

  // Function to check if user exists
  const checkUserExists = async () => {
    try {
      const idToken = await user?.getIdToken(true);
      
      const userCheckResponse = await fetch('/api/users/check', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const userCheckData = await userCheckResponse.json();
      
      if (userCheckData.exists) {
        setUserVerified(true);
        console.log('User verified in database');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
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
    // Don't allow removing the primary answer (index 0)
    if (index === 0) return;
    
    const newAnswers = [...acceptableAnswers];
    newAnswers.splice(index, 1);
    setAcceptableAnswers(newAnswers);
  };

  // Handle file upload for spot questions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setErrors({...errors, imageUrl: 'Please upload an image file'});
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({...errors, imageUrl: 'Image size should be less than 5MB'});
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken(true);
      
      // Upload the file to your server
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setImageUrl(data.url);
      setErrors({...errors, imageUrl: ''});
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors({...errors, imageUrl: 'Failed to upload image. Please try again.'});
    } finally {
      setIsUploading(false);
    }
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
      if (!acceptableAnswers[0] || !acceptableAnswers[0].trim()) {
        newErrors.acceptableAnswers = 'Primary answer is required';
      }
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
      setLoadingStatus('Preparing quiz data...');
      setLoadingProgress(10);
      
      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken(true);
      setLoadingProgress(20);
      
      // Only check/create user if not already verified
      if (!userVerified) {
        setLoadingStatus('Verifying user account...');
        console.log('Checking if user exists in the database...');
        const userCheckResponse = await fetch('/api/users/check', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        setLoadingProgress(40);
        const userCheckData = await userCheckResponse.json();
        
        // If user doesn't exist, create them
        if (!userCheckData.exists) {
          setLoadingStatus('Creating user account...');
          console.log('User not found in database, creating user...');
          const createUserResponse = await fetch('/api/users/create-if-not-exists', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              name: user?.displayName || user?.email?.split('@')[0] || 'User'
            })
          });
          
          setLoadingProgress(60);
          const createUserData = await createUserResponse.json();
          
          if (!createUserData.success) {
            console.error('Failed to create user:', createUserData.error);
            setErrors({ submit: 'Failed to create user profile. Please try again.' });
            setLoading(false);
            setLoadingStatus('');
            setLoadingProgress(0);
            return;
          }
          
          console.log('User created successfully:', createUserData.user);
          setUserVerified(true);
        } else {
          setUserVerified(true);
        }
      } else {
        console.log('User already verified, skipping check');
        setLoadingProgress(50);
      }
      
      // Now create the quiz
      setLoadingStatus('Creating quiz...');
      console.log('Creating quiz...');
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
      
      setLoadingProgress(80);
      const data = await response.json();
      
      if (response.ok) {
        setLoadingStatus('Quiz created successfully! Redirecting...');
        setLoadingProgress(100);
        // Clear any saved draft
        localStorage.removeItem('quizDraft');
        
        // Redirect to the quiz page
        setTimeout(() => {
          router.push(`/quizzes/${data.quiz.id}`);
        }, 500); // Small delay to show the success message
      } else {
        console.error('Failed to create quiz:', data.error);
        setErrors({ submit: data.error || 'Failed to create quiz' });
        setLoadingStatus('');
        setLoadingProgress(0);
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      setErrors({ submit: 'An unexpected error occurred' });
      setLoadingStatus('');
      setLoadingProgress(0);
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

  // Handle custom topic selection
  const handleTopicChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomTopicInput(true);
      // Don't set the topic yet, wait for custom input
    } else {
      setTopic(value);
      setShowCustomTopicInput(false);
    }
  };

  // Add custom topic
  const addCustomTopic = () => {
    if (customTopic.trim()) {
      setTopic(customTopic.trim());
      setShowCustomTopicInput(false);
    }
  };

  // Generate questions using AI
  const generateQuestionsWithAI = async () => {
    if (!topic) {
      setErrors({ ...errors, topic: 'Please select a topic first' });
      return;
    }

    if (!difficulty) {
      setErrors({ ...errors, difficulty: 'Please select a difficulty level first' });
      return;
    }

    try {
      setIsGeneratingAI(true);
      setAiGenerationError('');

      // Get Firebase ID token for authentication
      const idToken = await user?.getIdToken(true);

      // Call the AI generation API
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          topic,
          questionType,
          difficulty,
          count: 3, // Generate 3 questions at a time
          description // Include the quiz description for context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('AI generation error:', data);
        let errorMessage = data.error || 'Failed to generate questions';
        
        // Add more detailed error information if available
        if (data.details) {
          if (typeof data.details === 'string') {
            errorMessage += `: ${data.details}`;
          } else if (data.details.message) {
            errorMessage += `: ${data.details.message}`;
          }
        }
        
        // Check if it's an API key configuration issue
        if (errorMessage.includes('AI service is not properly configured')) {
          errorMessage = 'The Google Gemini 1.5 Pro API key is not configured. Please follow these steps:\n\n' +
            '1. Get an API key from Google AI Studio: https://aistudio.google.com/app/apikey\n' +
            '2. Make sure your API key has access to the Gemini 1.5 Pro model\n' +
            '3. Add it to your .env.local file as GOOGLE_AI_API_KEY=your_key_here\n' +
            '4. Restart the development server';
        }
        
        throw new Error(errorMessage);
      }

      // Add the generated questions to the quiz
      const newQuestions = data.questions.map((q: any) => {
        const questionId = Math.random().toString(36).substr(2, 9);
        
        // Format the question based on its type
        if (q.type === 'multiple-choice') {
          return {
            id: questionId,
            type: 'multiple-choice',
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || difficulty,
            topic: q.topic || topic,
            tags: q.tags || []
          };
        } else if (q.type === 'true-false') {
          return {
            id: questionId,
            type: 'true-false',
            question: q.question,
            options: ['True', 'False'],
            correctAnswer: q.correctAnswer === true ? 'true' : 'false',
            explanation: q.explanation,
            difficulty: q.difficulty || difficulty,
            topic: q.topic || topic,
            tags: q.tags || []
          };
        } else if (q.type === 'saq') {
          return {
            id: questionId,
            type: 'saq',
            question: q.question,
            options: [],
            correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer],
            explanation: q.explanation,
            difficulty: q.difficulty || difficulty,
            topic: q.topic || topic,
            tags: q.tags || []
          };
        }
        
        // Default fallback
        return {
          id: questionId,
          type: questionType,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty || difficulty,
          topic: q.topic || topic,
          tags: q.tags || []
        };
      });

      // Add the new questions to the existing questions
      setQuestions([...questions, ...newQuestions]);
      
      // Show a success message
      alert(`Successfully generated ${newQuestions.length} questions!`);
    } catch (error) {
      console.error('Error generating questions:', error);
      setAiGenerationError(error instanceof Error ? error.message : 'Failed to generate questions');
    } finally {
      setIsGeneratingAI(false);
    }
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
                      {!showCustomTopicInput ? (
                        <Select value={topic} onValueChange={handleTopicChange}>
                          <SelectTrigger id="topic" className={errors.topic ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cardiology">Cardiology</SelectItem>
                            <SelectItem value="Pharmacology">Pharmacology</SelectItem>
                            <SelectItem value="Neurology">Neurology</SelectItem>
                            <SelectItem value="Anatomy">Anatomy</SelectItem>
                            <SelectItem value="Pathology">Pathology</SelectItem>
                            <SelectItem value="custom">
                              <div className="flex items-center">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Custom Topic
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id="customTopic"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="Enter custom topic"
                            className={errors.topic ? "border-red-500" : ""}
                            onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
                          />
                          <Button type="button" onClick={addCustomTopic} variant="outline">
                            Add
                          </Button>
                          <Button 
                            type="button" 
                            onClick={() => {
                              setShowCustomTopicInput(false);
                              setCustomTopic('');
                            }} 
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
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
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quizTags">Tags</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="quizTags" 
                          value={tagInput} 
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Add tags separated by comma" 
                          onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        />
                        <Button type="button" onClick={addTag} variant="outline">
                          Add
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                          >
                            {tag}
                            <button 
                              onClick={() => removeTag(tag)}
                              className="text-secondary-foreground hover:text-primary focus:outline-none"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
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
                
                {/* AI Question Generation Button */}
                <div className="mb-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 border-dashed border-primary/50 hover:border-primary"
                    onClick={generateQuestionsWithAI}
                    disabled={isGeneratingAI || !topic || !difficulty}
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-primary" />
                        Generate {questionType === 'multiple-choice' ? 'Multiple Choice' : 
                                  questionType === 'true-false' ? 'True/False' : 
                                  questionType === 'saq' ? 'Short Answer' : 'Spot'} Questions with AI
                      </>
                    )}
                  </Button>
                  {aiGenerationError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm whitespace-pre-line">
                      <p className="font-medium mb-1">Error generating questions:</p>
                      <p>{aiGenerationError}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a topic and difficulty first, then click to generate {questionType} questions using AI.
                    {description.trim() && " The AI will use your quiz description to create more relevant questions."}
                    <br />
                    <span className="text-primary-foreground/70">Powered by Google Gemini 1.5 Pro</span>
                  </p>
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
                    <div className="mb-4">
                      <Label htmlFor="imageUrl">Image</Label>
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                          <Input 
                            id="imageUrl" 
                            value={imageUrl} 
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Enter image URL" 
                            className={errors.imageUrl ? "border-red-500" : ""}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <span className="flex items-center">
                                <span className="animate-spin mr-2">⭮</span> Uploading...
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Upload className="h-4 w-4 mr-1" /> Upload
                              </span>
                            )}
                          </Button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileUpload}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You can either enter an image URL or upload an image file (max 5MB)
                        </p>
                      </div>
                      {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl}</p>}
                    </div>
                    
                    {imageUrl && (
                      <div className="mt-2 mb-4 relative border rounded-md overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Image to identify" 
                          className="max-w-full h-auto max-h-[300px] mx-auto"
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
                    
                    <div className="mb-2">
                      <Label htmlFor="primaryAnswer" className="text-sm text-muted-foreground">Primary Answer (canonical form)</Label>
                      <Input
                        id="primaryAnswer"
                        value={acceptableAnswers[0] || ''}
                        onChange={(e) => updateAcceptableAnswer(0, e.target.value)}
                        placeholder="Primary correct answer"
                        className="mb-1"
                      />
                      <p className="text-xs text-muted-foreground mb-3">
                        This is the main correct answer in its canonical form
                      </p>
                    </div>
                    
                    <Label className="text-sm text-muted-foreground">Alternative Acceptable Answers</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Include variations in capitalization, spelling, abbreviations, and synonyms
                    </p>
                    
                    {acceptableAnswers.slice(1).map((answer, index) => (
                      <div key={index + 1} className="flex items-center gap-2 mb-2">
                        <Input
                          value={answer}
                          onChange={(e) => updateAcceptableAnswer(index + 1, e.target.value)}
                          placeholder={`Alternative answer ${index + 1}`}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removeAcceptableAnswer(index + 1)}
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
                    
                    <div className="mt-4 p-3 bg-secondary/30 rounded-md">
                      <h4 className="text-sm font-medium mb-1">Tips for Alternative Answers:</h4>
                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                        <li>Include both uppercase and lowercase variations (e.g., "kanamycin" and "Kanamycin")</li>
                        <li>Add common abbreviations if applicable</li>
                        <li>Include common misspellings that should be accepted</li>
                        <li>Add synonyms or equivalent terms</li>
                      </ul>
                    </div>
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
              <Card className="p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                  <span>Quiz Summary</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                
                {questions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="max-h-[500px] overflow-y-auto pr-2">
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
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={saveQuiz} 
                        disabled={loading || questions.length === 0}
                        className="w-full"
                      >
                        {loading ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2">⭮</span> Saving...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Check className="mr-2 h-4 w-4" /> Save & Publish Quiz
                          </span>
                        )}
                      </Button>
                      
                      {errors.submit && (
                        <p className="text-red-500 text-sm mt-2">{errors.submit}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No questions added yet</p>
                    <p className="text-sm">Create questions using the form or generate them with AI</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}