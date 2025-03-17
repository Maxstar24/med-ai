'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  SkipForward, 
  Shuffle, 
  RotateCcw,
  BookOpen,
  Home,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  explanation?: string;
  category: {
    _id: string;
    name: string;
    color: string;
    icon: string;
  };
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  confidenceLevel: number;
  reviewCount: number;
  setId?: string;
  topicName?: string;
}

interface FlashcardStudyProps {
  filter?: string | null;
  setId?: string | null;
}

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ filter, setId }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, refreshToken } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    total: 0,
    startTime: new Date(),
  });
  const [topicName, setTopicName] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Fetch flashcards based on filter or setId
  const fetchFlashcards = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Build query parameters
      let url = '/api/flashcards';
      const params = new URLSearchParams();
      
      if (filter === 'due') {
        params.append('dueOnly', 'true');
      }
      
      if (setId) {
        params.append('setId', setId);
      }
      
      // Add params to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards');
      }
      
      const data = await response.json();
      
      // If no flashcards found, show a message
      if (data.flashcards.length === 0) {
        toast({
          title: 'No flashcards found',
          description: filter === 'due' 
            ? 'You have no flashcards due for review. Try studying all cards instead.' 
            : 'No flashcards found with the current filter.',
          variant: 'destructive'
        });
        return;
      }
      
      // Set the flashcards and shuffle them
      const shuffledCards = [...data.flashcards].sort(() => Math.random() - 0.5);
      setFlashcards(shuffledCards);
      
      // If studying a set, get the topic name
      if (setId && shuffledCards.length > 0 && shuffledCards[0].topicName) {
        setTopicName(shuffledCards[0].topicName);
      }
      
      // Initialize session stats
      setSessionStats({
        correct: 0,
        incorrect: 0,
        skipped: 0,
        total: shuffledCards.length,
        startTime: new Date(),
      });
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flashcards',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, filter, setId, toast, refreshToken]);

  // Fetch flashcards when the component mounts
  useEffect(() => {
    if (user && !loading) {
      fetchFlashcards();
    }
  }, [user, loading, fetchFlashcards]);

  // Handle card flip
  const handleFlip = () => {
    setFlipped(!flipped);
  };

  // Handle marking a card as correct
  const handleCorrect = async () => {
    if (currentIndex >= flashcards.length) return;
    
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Update the flashcard in the database
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: flashcards[currentIndex]._id,
          confidenceLevel: Math.min(flashcards[currentIndex].confidenceLevel + 1, 5),
          reviewResult: 'correct'
        })
      });
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        correct: prev.correct + 1
      }));
      
      // Move to the next card
      moveToNextCard();
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard',
        variant: 'destructive'
      });
    }
  };

  // Handle marking a card as incorrect
  const handleIncorrect = async () => {
    if (currentIndex >= flashcards.length) return;
    
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Update the flashcard in the database
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: flashcards[currentIndex]._id,
          confidenceLevel: Math.max(flashcards[currentIndex].confidenceLevel - 1, 1),
          reviewResult: 'incorrect'
        })
      });
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1
      }));
      
      // Move to the next card
      moveToNextCard();
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard',
        variant: 'destructive'
      });
    }
  };

  // Handle skipping a card
  const handleSkip = async () => {
    if (currentIndex >= flashcards.length) return;
    
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Update the flashcard in the database
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: flashcards[currentIndex]._id,
          reviewResult: 'skipped'
        })
      });
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        skipped: prev.skipped + 1
      }));
      
      // Move to the next card
      moveToNextCard();
    } catch (error) {
      console.error('Error updating flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard',
        variant: 'destructive'
      });
    }
  };

  // Move to the next card
  const moveToNextCard = () => {
    // Reset flip state
    setFlipped(false);
    
    // Check if we've reached the end of the deck
    if (currentIndex >= flashcards.length - 1) {
      // Session complete
      setSessionComplete(true);
      
      // Save session to database
      saveSession();
    } else {
      // Move to the next card
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Shuffle the deck
  const shuffleDeck = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  };

  // Restart the session
  const restartSession = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      skipped: 0,
      total: flashcards.length,
      startTime: new Date(),
    });
  };

  // Save the session to the database
  const saveSession = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken(true);
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Calculate session duration in seconds
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - sessionStats.startTime.getTime()) / 1000);
      
      // Prepare session data
      const sessionData = {
        cardsStudied: sessionStats.total,
        correctAnswers: sessionStats.correct,
        incorrectAnswers: sessionStats.incorrect,
        skippedCards: sessionStats.skipped,
        totalTimeSpent: durationSeconds,
        setId: setId || undefined,
        topicName: topicName || undefined
      };
      
      console.log('Saving session with data:', JSON.stringify(sessionData, null, 2));
      
      // Save the session
      const response = await fetch('/api/flashcards/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save session: ${response.status} ${errorData}`);
      }
      
      const savedSession = await response.json();
      console.log('Session saved successfully:', savedSession);
      
      // Show success message
      toast({
        title: 'Session Saved',
        description: 'Your study session has been recorded successfully.',
      });
      
      // Force refresh dashboard stats
      console.log('Setting refreshStats flag to trigger dashboard update');
      localStorage.setItem('refreshStats', 'true');
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Error',
        description: 'Failed to save study session',
        variant: 'destructive'
      });
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (flashcards.length === 0) return 0;
    return Math.round((currentIndex / flashcards.length) * 100);
  };

  // Toggle zoom for long text
  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-xl text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  // Show message if no flashcards found
  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl md:text-3xl text-center">No Flashcards Found</CardTitle>
            <CardDescription className="text-center text-base mt-2">
              {filter === 'due' 
                ? 'You have no flashcards due for review.' 
                : 'No flashcards found with the current filter.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pb-6">
            <p className="text-lg text-muted-foreground text-center">
              Try studying all cards or create new flashcards.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between pt-4 pb-6">
            <Button asChild variant="outline" size="lg" className="px-5">
              <Link href="/flashcards">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" className="px-5">
              <Link href="/flashcards/create">
                <BookOpen className="mr-2 h-5 w-5" />
                Create Flashcards
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show session complete screen
  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl md:text-3xl text-center">Session Complete!</CardTitle>
            <CardDescription className="text-center text-base mt-2">
              You've completed your study session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-6 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{sessionStats.correct}</p>
                <p className="text-base text-muted-foreground mt-2">Correct</p>
              </div>
              <div className="p-6 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{sessionStats.incorrect}</p>
                <p className="text-base text-muted-foreground mt-2">Incorrect</p>
              </div>
              <div className="p-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{sessionStats.skipped}</p>
                <p className="text-base text-muted-foreground mt-2">Skipped</p>
              </div>
            </div>
            
            <div className="p-6 bg-primary/10 rounded-lg text-center">
              <p className="text-3xl font-bold">
                {sessionStats.correct > 0 
                  ? Math.round((sessionStats.correct / (sessionStats.total - sessionStats.skipped)) * 100)
                  : 0}%
              </p>
              <p className="text-base text-muted-foreground mt-2">Accuracy</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-4 pb-6">
            <Button asChild variant="outline" size="lg" className="px-5">
              <Link href="/flashcards">
                <Home className="mr-2 h-5 w-5" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={restartSession} size="lg" className="px-5">
              <RotateCcw className="mr-2 h-5 w-5" />
              Study Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Current flashcard
  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center">
      {/* Header with topic name if available */}
      {topicName && (
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{topicName}</h1>
          <p className="text-muted-foreground text-lg">Studying {flashcards.length} flashcards</p>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full max-w-3xl mb-8">
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-base text-muted-foreground">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="flex gap-3">
            <span className="text-green-500 font-medium">{sessionStats.correct} correct</span>
            <span className="text-red-500 font-medium">{sessionStats.incorrect} incorrect</span>
            <span className="text-yellow-500 font-medium">{sessionStats.skipped} skipped</span>
          </span>
        </div>
      </div>
      
      {/* Flashcard */}
      <div className="w-full max-w-3xl perspective-1000">
        <div 
          className={`relative w-full min-h-[500px] md:h-[550px] cursor-pointer transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}
          onClick={handleFlip}
        >
          {/* Front side (Question) */}
          <div className={`absolute w-full h-full backface-hidden ${flipped ? 'invisible' : ''}`}>
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-2 md:pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl md:text-2xl">Question</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={toggleZoom}
                      title={isZoomed ? "Zoom out" : "Zoom in"}
                    >
                      {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                    </Button>
                    <Badge variant="outline" className="capitalize px-3 py-1">
                      {currentCard.difficulty}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-base mt-1">
                  Click the card to see the answer
                </CardDescription>
              </CardHeader>
              <CardContent className={`flex-grow flex items-center justify-center overflow-y-auto px-6 md:px-8 ${isZoomed ? 'p-4' : ''}`}>
                <p 
                  className={`text-center ${isZoomed ? 'max-w-full' : ''}`} 
                  style={{ 
                    fontSize: isZoomed 
                      ? '1.1rem' 
                      : currentCard.question.length > 300 
                        ? '1.05rem' 
                        : currentCard.question.length > 200 
                          ? '1.2rem' 
                          : '1.35rem',
                    lineHeight: '1.6'
                  }}
                >
                  {currentCard.question}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 pt-4 pb-6">
                {currentCard.category && (
                  <Badge 
                    variant="outline" 
                    className={`bg-${currentCard.category.color || 'gray'}-100 text-${currentCard.category.color || 'gray'}-800 dark:bg-${currentCard.category.color || 'gray'}-900/20 dark:text-${currentCard.category.color || 'gray'}-400 px-3 py-1`}
                  >
                    {currentCard.category.name}
                  </Badge>
                )}
                {currentCard.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </CardFooter>
            </Card>
          </div>
          
          {/* Back side (Answer) */}
          <div className={`absolute w-full h-full backface-hidden rotate-y-180 ${!flipped ? 'invisible' : ''}`}>
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-2 md:pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl md:text-2xl">Answer</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={toggleZoom}
                    title={isZoomed ? "Zoom out" : "Zoom in"}
                  >
                    {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  </Button>
                </div>
                <CardDescription className="text-base mt-1">
                  Click the card to see the question
                </CardDescription>
              </CardHeader>
              <CardContent className={`flex-grow flex flex-col justify-center overflow-y-auto px-6 md:px-8 ${isZoomed ? 'p-4' : ''}`}>
                <p 
                  className={`text-center mb-6 ${isZoomed ? 'max-w-full' : ''}`} 
                  style={{ 
                    fontSize: isZoomed 
                      ? '1.1rem' 
                      : currentCard.answer.length > 300 
                        ? '1.05rem' 
                        : currentCard.answer.length > 200 
                          ? '1.2rem' 
                          : '1.35rem',
                    lineHeight: '1.6'
                  }}
                >
                  {currentCard.answer}
                </p>
                {currentCard.explanation && (
                  <div className="mt-4 p-5 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Explanation:</p>
                    <p className={`text-sm ${isZoomed ? '' : 'max-h-[180px]'} overflow-y-auto leading-relaxed`}>
                      {currentCard.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-4 pb-6">
                <div className="flex gap-3">
                  <Button 
                    variant="destructive" 
                    size="default" 
                    onClick={(e) => { e.stopPropagation(); handleIncorrect(); }}
                    className="px-4"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Incorrect
                  </Button>
                  <Button 
                    variant="outline" 
                    size="default" 
                    onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                    className="px-4"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button 
                    variant="default" 
                    size="default" 
                    onClick={(e) => { e.stopPropagation(); handleCorrect(); }}
                    className="bg-green-600 hover:bg-green-700 px-4"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Correct
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="w-full max-w-3xl mt-8 flex justify-between">
        <Button variant="outline" size="lg" asChild className="px-5">
          <Link href="/flashcards">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={shuffleDeck} className="px-5">
            <Shuffle className="mr-2 h-5 w-5" />
            Shuffle
          </Button>
          <Button variant="outline" size="lg" onClick={restartSession} className="px-5">
            <RotateCcw className="mr-2 h-5 w-5" />
            Restart
          </Button>
        </div>
      </div>
      
      {/* Add custom styles for 3D effect */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default FlashcardStudy; 