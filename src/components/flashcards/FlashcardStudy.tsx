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
  ZoomOut,
  Star,
  ChevronLeft,
  ChevronRight
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
  const [showConfidenceRating, setShowConfidenceRating] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState<number>(0);
  const [currentResult, setCurrentResult] = useState<'correct' | 'incorrect' | 'skip' | null>(null);
  const [studyHistory, setStudyHistory] = useState<{index: number, result: string}[]>([]);

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
    setFlipped(prev => !prev);
  };

  // Handle marking a card
  const handleMarkCard = (result: 'correct' | 'incorrect' | 'skip') => {
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: result === 'correct' ? prev.correct + 1 : prev.correct,
      incorrect: result === 'incorrect' ? prev.incorrect + 1 : prev.incorrect,
      skipped: result === 'skip' ? prev.skipped + 1 : prev.skipped,
    }));
    
    // Set current result and show confidence rating
    setCurrentResult(result);
    setShowConfidenceRating(true);
  };

  // Handle confidence rating selection
  const handleConfidenceRating = async (rating: number) => {
    setConfidenceRating(rating);
    
    try {
      if (!user) return;
      
      const token = await user.getIdToken(true);
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Update the flashcard's confidence level
      await fetch(`/api/flashcards/${flashcards[currentIndex]._id}/confidence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confidenceLevel: rating })
      });
      
      // Update local state
      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentIndex] = {
        ...updatedFlashcards[currentIndex],
        confidenceLevel: rating
      };
      setFlashcards(updatedFlashcards);
      
      // Add to study history
      setStudyHistory(prev => [...prev, {
        index: currentIndex,
        result: currentResult || 'skip'
      }]);
      
      // Move to next card
      moveToNextCard();
    } catch (error) {
      console.error('Error updating confidence level:', error);
      toast({
        title: 'Error',
        description: 'Failed to update confidence level',
        variant: 'destructive'
      });
      // Still move to next card even if update fails
      moveToNextCard();
    }
  };

  // Move to the next card
  const moveToNextCard = () => {
    // Reset states
    setFlipped(false);
    setShowConfidenceRating(false);
    setConfidenceRating(0);
    setCurrentResult(null);
    
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

  // Move to the previous card
  const moveToPreviousCard = () => {
    if (currentIndex > 0) {
      // Reset states
      setFlipped(false);
      setShowConfidenceRating(false);
      setConfidenceRating(0);
      setCurrentResult(null);
      
      // Move to the previous card
      setCurrentIndex(currentIndex - 1);
      
      // If there's history, update the stats
      if (studyHistory.length > 0) {
        const lastEntry = studyHistory[studyHistory.length - 1];
        if (lastEntry.index === currentIndex - 1) {
          // Remove the last entry from history
          setStudyHistory(prev => prev.slice(0, -1));
          
          // Update session stats
          setSessionStats(prev => ({
            ...prev,
            correct: lastEntry.result === 'correct' ? prev.correct - 1 : prev.correct,
            incorrect: lastEntry.result === 'incorrect' ? prev.incorrect - 1 : prev.incorrect,
            skipped: lastEntry.result === 'skip' ? prev.skipped - 1 : prev.skipped,
          }));
        }
      }
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-7xl mx-auto px-6 py-12">
        <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-primary mb-6"></div>
        <p className="text-2xl text-muted-foreground">Loading flashcards...</p>
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-7xl mx-auto px-6 py-12">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="pb-8">
            <CardTitle className="text-3xl md:text-4xl text-center">Session Complete!</CardTitle>
            <CardDescription className="text-center text-lg mt-3">
              You've completed your study session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pb-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-6 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{sessionStats.correct}</p>
                <p className="text-lg text-muted-foreground mt-2">Correct</p>
              </div>
              <div className="p-6 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">{sessionStats.incorrect}</p>
                <p className="text-lg text-muted-foreground mt-2">Incorrect</p>
              </div>
              <div className="p-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{sessionStats.skipped}</p>
                <p className="text-lg text-muted-foreground mt-2">Skipped</p>
              </div>
            </div>
            
            <div className="p-8 bg-primary/10 rounded-lg text-center">
              <p className="text-4xl font-bold">
                {sessionStats.correct > 0 
                  ? Math.round((sessionStats.correct / (sessionStats.total - sessionStats.skipped)) * 100)
                  : 0}%
              </p>
              <p className="text-lg text-muted-foreground mt-2">Accuracy</p>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-6 pb-8 px-8">
            <Button asChild variant="outline" size="lg" className="px-6 h-14 text-lg">
              <Link href="/flashcards">
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={restartSession} size="lg" className="px-6 h-14 text-lg">
              <RotateCcw className="mr-3 h-5 w-5" />
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
    <div className="flex flex-col items-center max-w-7xl mx-auto px-6 py-12">
      {/* Header with topic name if available */}
      {topicName && (
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{topicName}</h1>
          <p className="text-muted-foreground text-xl">Studying {flashcards.length} flashcards</p>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full max-w-4xl mb-12">
        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
        <div className="flex justify-between mt-4 text-lg text-muted-foreground">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="flex gap-6">
            <span className="text-green-500 font-medium">{sessionStats.correct} correct</span>
            <span className="text-red-500 font-medium">{sessionStats.incorrect} incorrect</span>
            <span className="text-yellow-500 font-medium">{sessionStats.skipped} skipped</span>
          </span>
        </div>
      </div>
      
      {/* Flashcard */}
      <div 
        className={`w-full max-w-4xl perspective-1000 ${isZoomed ? 'scale-110' : ''} transition-transform duration-300`}
        style={{ height: '450px' }}
      >
        <div 
          className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
          onClick={(e) => {
            // Only handle flip if not clicking on a button
            if (!(e.target as HTMLElement).closest('button')) {
              e.stopPropagation();
              handleFlip();
            }
          }}
        >
          {/* Front of card (Question) */}
          <div className="absolute w-full h-full backface-hidden bg-card rounded-xl shadow-lg p-10 flex flex-col cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Question
              </Badge>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleZoom(e);
                  }}
                >
                  {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </Button>
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center overflow-auto px-4">
              <div className={`text-center ${isZoomed ? 'text-xl' : 'text-2xl'} leading-relaxed`}>
                {currentCard?.question}
              </div>
            </div>
            
            <div className="mt-6 text-center text-muted-foreground text-base">
              Tap to flip card
            </div>
          </div>
          
          {/* Back of card (Answer) */}
          <div className="absolute w-full h-full backface-hidden bg-card rounded-xl shadow-lg p-10 flex flex-col rotate-y-180 cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Answer
              </Badge>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleZoom(e);
                  }}
                >
                  {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </Button>
              </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center overflow-auto px-4">
              <div className={`text-center ${isZoomed ? 'text-xl' : 'text-2xl'} leading-relaxed`}>
                {currentCard?.answer}
              </div>
            </div>
            
            {currentCard?.explanation && (
              <div className="mt-6 p-5 bg-muted rounded-lg">
                <p className="text-base font-medium mb-2">Explanation:</p>
                <p className="text-base">{currentCard.explanation}</p>
              </div>
            )}
            
            <div className="mt-6 text-center text-muted-foreground text-base">
              Tap to flip back
            </div>
          </div>
        </div>
      </div>
      
      {/* Confidence Rating */}
      {showConfidenceRating && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 p-8 bg-card rounded-xl shadow-md w-full max-w-4xl"
        >
          <h3 className="text-xl font-medium text-center mb-6">
            How confident are you with this card?
            {currentResult && (
              <span className={`ml-3 inline-block px-3 py-1 rounded text-base ${
                currentResult === 'correct' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                currentResult === 'incorrect' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {currentResult === 'correct' ? 'Marked Correct' : 
                 currentResult === 'incorrect' ? 'Marked Incorrect' : 
                 'Skipped'}
              </span>
            )}
          </h3>
          <div className="flex justify-center gap-6">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={confidenceRating === rating ? "default" : "outline"}
                className="flex flex-col items-center p-5 h-auto"
                onClick={() => handleConfidenceRating(rating)}
              >
                <div className="flex">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-6 w-6 fill-current" />
                  ))}
                  {Array.from({ length: 5 - rating }).map((_, i) => (
                    <Star key={i + rating} className="h-6 w-6" />
                  ))}
                </div>
                <span className="mt-3 text-sm">
                  {rating === 1 ? "Not at all" : 
                   rating === 2 ? "Slightly" : 
                   rating === 3 ? "Somewhat" : 
                   rating === 4 ? "Very" : 
                   "Extremely"}
                </span>
              </Button>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Control buttons */}
      {!showConfidenceRating && flipped && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mt-10 flex justify-center gap-6"
        >
          <Button 
            variant="destructive" 
            size="lg" 
            className="px-8 h-14 text-lg"
            onClick={() => handleMarkCard('incorrect')}
          >
            <X className="mr-3 h-6 w-6" />
            Incorrect
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 h-14 text-lg"
            onClick={() => handleMarkCard('skip')}
          >
            <SkipForward className="mr-3 h-6 w-6" />
            Skip
          </Button>
          <Button 
            variant="default" 
            size="lg" 
            className="px-8 h-14 text-lg"
            onClick={() => handleMarkCard('correct')}
          >
            <Check className="mr-3 h-6 w-6" />
            Correct
          </Button>
        </motion.div>
      )}
      
      {/* Navigation buttons */}
      <div className="w-full max-w-4xl mt-12 flex justify-between">
        <div className="flex gap-4">
          <Button variant="outline" size="lg" asChild className="px-6 h-14 text-lg">
            <Link href="/flashcards">
              <ArrowLeft className="mr-3 h-5 w-5" />
              Back to Dashboard
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="px-6 h-14 text-lg"
            onClick={moveToPreviousCard}
            disabled={currentIndex === 0 || showConfidenceRating}
          >
            <ChevronLeft className="mr-3 h-5 w-5" />
            Previous
          </Button>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="lg" onClick={shuffleDeck} className="px-6 h-14 text-lg">
            <Shuffle className="mr-3 h-5 w-5" />
            Shuffle
          </Button>
          <Button variant="outline" size="lg" onClick={restartSession} className="px-6 h-14 text-lg">
            <RotateCcw className="mr-3 h-5 w-5" />
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