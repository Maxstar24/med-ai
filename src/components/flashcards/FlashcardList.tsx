'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Edit, 
  Trash2, 
  BookOpen, 
  Tag, 
  MoreHorizontal,
  Clock,
  Star,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  nextReviewDate?: string;
}

interface FlashcardSet {
  setId: string;
  topicName: string;
  cardCount: number;
  sampleQuestion: string;
}

interface FlashcardListProps {
  searchQuery?: string;
  showSets?: boolean;
  showCards?: boolean;
}

const FlashcardList: React.FC<FlashcardListProps> = ({ 
  searchQuery = '', 
  showSets = true,
  showCards = true
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, refreshToken } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flashcardToDelete, setFlashcardToDelete] = useState<string | null>(null);
  const [setToDelete, setSetToDelete] = useState<string | null>(null);

  // Fetch flashcards and sets based on what we need to show
  const fetchFlashcards = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Fetch individual flashcards if needed
      if (showCards) {
        let url = '/api/flashcards';
        if (filter === 'due') {
          url += '?dueOnly=true';
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
        setFlashcards(data.flashcards);
      } else {
        // Clear flashcards if we're not showing them
        setFlashcards([]);
      }
      
      // Fetch flashcard sets if needed
      if (showSets) {
        const setsResponse = await fetch('/api/flashcards?groupBySet=true', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (setsResponse.ok) {
          const setsData = await setsResponse.json();
          setFlashcardSets(setsData.flashcardSets || []);
        }
      } else {
        // Clear sets if we're not showing them
        setFlashcardSets([]);
      }
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
  }, [user, filter, showSets, showCards, toast, refreshToken]);

  // Fetch flashcards when component mounts or filter changes
  useEffect(() => {
    if (user && !loading) {
      fetchFlashcards();
    }
  }, [user, loading, filter, fetchFlashcards]);

  // Filter flashcards based on search query
  const filteredFlashcards = flashcards.filter(card => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      card.question.toLowerCase().includes(query) ||
      card.answer.toLowerCase().includes(query) ||
      card.tags.some(tag => tag.toLowerCase().includes(query)) ||
      (card.category?.name.toLowerCase().includes(query)) ||
      (card.topicName?.toLowerCase().includes(query))
    );
  });

  // Filter flashcard sets based on search query
  const filteredSets = flashcardSets.filter(set => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      set.topicName.toLowerCase().includes(query) ||
      set.sampleQuestion.toLowerCase().includes(query)
    );
  });

  // Handle deleting a flashcard
  const handleDeleteFlashcard = async () => {
    if (!flashcardToDelete) return;
    
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch(`/api/flashcards?id=${flashcardToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete flashcard');
      }
      
      // Remove the deleted flashcard from state
      setFlashcards(prev => prev.filter(card => card._id !== flashcardToDelete));
      
      toast({
        title: 'Success',
        description: 'Flashcard deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete flashcard',
        variant: 'destructive'
      });
    } finally {
      setFlashcardToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Handle deleting a flashcard set
  const handleDeleteSet = async () => {
    if (!setToDelete) return;
    
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch(`/api/flashcards?setId=${setToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete flashcard set');
      }
      
      // Remove the deleted set from state
      setFlashcardSets(prev => prev.filter(set => set.setId !== setToDelete));
      
      // Also remove any individual flashcards that were part of this set
      setFlashcards(prev => prev.filter(card => card.setId !== setToDelete));
      
      toast({
        title: 'Success',
        description: 'Flashcard set deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting flashcard set:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete flashcard set',
        variant: 'destructive'
      });
    } finally {
      setSetToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  // Show empty state if no flashcards found
  if (filteredFlashcards.length === 0 && filteredSets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {searchQuery 
                ? 'No Results Found' 
                : showSets && !showCards 
                  ? 'No Flashcard Sets Found'
                  : !showSets && showCards
                    ? 'No Individual Flashcards Found'
                    : 'No Flashcards Found'}
            </CardTitle>
            <CardDescription>
              {searchQuery 
                ? 'No flashcards match your search query.' 
                : 'You haven\'t created any flashcards yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              {showSets && !showCards
                ? 'Create your first flashcard set to organize your study materials.'
                : 'Create your first flashcard to get started with your study journey.'}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => router.push(showSets && !showCards 
                ? '/flashcards/create?ai=true' 
                : '/flashcards/create')} 
              className="w-full"
            >
              {showSets && !showCards ? 'Create Flashcard Set' : 'Create Flashcard'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filter controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Flashcards</SelectItem>
              <SelectItem value="due">Due for Review</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {showCards && `${filteredFlashcards.length} flashcards`}
            {showCards && showSets && filteredSets.length > 0 && ', '}
            {showSets && filteredSets.length > 0 && `${filteredSets.length} sets`}
          </span>
        </div>
      </div>

      {/* Flashcard Sets */}
      {showSets && filteredSets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Flashcard Sets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSets.map((set) => (
              <Card key={set.setId} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{set.topicName}</CardTitle>
                  <CardDescription>{set.cardCount} flashcards</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="line-clamp-2 text-sm">{set.sampleQuestion}</p>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push(`/flashcards/study?setId=${set.setId}`)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Study Set
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/flashcards/study?setId=${set.setId}`)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Study Set
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSetToDelete(set.setId);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Set
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Individual Flashcards */}
      {showCards && filteredFlashcards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Individual Flashcards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlashcards.map((card) => (
              <Card key={card._id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">{card.question}</CardTitle>
                      {card.nextReviewDate && (
                        <CardDescription className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Due: {new Date(card.nextReviewDate).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {card.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="line-clamp-2 text-sm">{card.answer}</p>
                  {card.confidenceLevel > 0 && (
                    <div className="flex items-center mt-2">
                      <Star className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-muted-foreground">
                        Confidence: {card.confidenceLevel}/5
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex flex-wrap gap-1 max-w-[70%]">
                    {card.category && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {card.category.name}
                      </Badge>
                    )}
                    {card.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {card.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{card.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/flashcards/edit/${card._id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/flashcards/study?id=${card._id}`)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Study
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setFlashcardToDelete(card._id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {flashcardToDelete ? 'Delete Flashcard' : 'Delete Flashcard Set'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {flashcardToDelete 
                ? 'Are you sure you want to delete this flashcard? This action cannot be undone.'
                : 'Are you sure you want to delete this flashcard set? All flashcards in this set will be permanently deleted. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={flashcardToDelete ? handleDeleteFlashcard : handleDeleteSet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlashcardList; 