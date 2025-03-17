'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  BookOpen, 
  Plus, 
  Clock, 
  BrainCircuit, 
  BarChart3, 
  Calendar, 
  Flame, 
  FileUp, 
  Lightbulb,
  Folder,
  CheckCircle2,
  XCircle,
  SkipForward,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  SquareStack,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface FlashcardStats {
  totalCards: number;
  totalSessions: number;
  cardsDue: number;
  currentStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  accuracy: number;
  totalTimeSpent: number;
  totalCardsStudied: number;
  last30Days: { date: string; count: number }[];
}

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
  isPublic: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  setId?: string;
  topicName?: string;
}

interface FlashcardSet {
  setId: string;
  topicName: string;
  cardCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: {
    _id: string;
    name: string;
    color: string;
    icon: string;
  };
  sampleQuestion: string;
  createdAt: string;
}

// Cache for statistics data
const statsCache = {
  data: null as FlashcardStats | null,
  timestamp: 0,
  expiryTime: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// Throttle control
let lastFetchTime = 0;
const THROTTLE_INTERVAL = 10000; // 10 seconds minimum between API calls

// Add StatCard component
const StatCard = ({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
};

const FlashcardsDashboard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, refreshToken } = useAuth();
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchInProgress = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the fetchStats function to prevent recreation on each render
  const fetchStats = useCallback(async () => {
    if (!user || fetchInProgress.current) return;
    
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (statsCache.data && (now - statsCache.timestamp < statsCache.expiryTime)) {
      console.log('Using cached stats data', statsCache.data);
      setStats(statsCache.data);
      setLoadingStats(false);
      return;
    }
    
    // Throttle API calls
    if (now - lastFetchTime < THROTTLE_INTERVAL) {
      console.log('Throttling API call - too frequent');
      return;
    }
    
    try {
      fetchInProgress.current = true;
      setLoadingStats(true);
      lastFetchTime = now;
      
      console.log('Fetching fresh statistics from API');
      
      // Use getIdToken directly from Firebase auth
      const token = await user.getIdToken(true);
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/flashcards/sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'statistics' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch statistics: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Statistics received from API:', data);
      
      // Update the cache
      statsCache.data = data;
      statsCache.timestamp = now;
      
      setStats(data);
    } catch (error) {
      console.error('Error fetching flashcard statistics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flashcard statistics',
        variant: 'destructive'
      });
    } finally {
      setLoadingStats(false);
      fetchInProgress.current = false;
    }
  }, [user, toast]);

  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Only fetch if user is logged in and not loading
    if (user && !loading) {
      console.log('User authenticated, preparing to fetch stats');
      // Debounce the fetch call to prevent multiple rapid calls
      fetchTimeoutRef.current = setTimeout(() => {
        fetchStats();
      }, 300); // 300ms debounce
    }
    
    // Clean up function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchInProgress.current = false;
    };
  }, [user, loading, fetchStats]);

  // Check for refresh flag in localStorage
  useEffect(() => {
    const checkRefreshFlag = () => {
      const refreshNeeded = localStorage.getItem('refreshStats');
      if (refreshNeeded === 'true') {
        console.log('Refresh flag detected, fetching fresh stats...');
        // Clear the flag
        localStorage.removeItem('refreshStats');
        // Clear the cache
        statsCache.data = null;
        statsCache.timestamp = 0;
        // Fetch fresh stats
        fetchStats();
      }
    };

    // Check when component mounts
    checkRefreshFlag();

    // Also check when window gets focus (user returns to tab)
    const handleFocus = () => {
      checkRefreshFlag();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStats]);

  // Fetch user's flashcards
  const fetchFlashcards = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingFlashcards(true);
      
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Fetch individual flashcards
      const response = await fetch('/api/flashcards', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards');
      }
      
      const data = await response.json();
      setFlashcards(data.flashcards);
      
      // Fetch flashcard sets
      const setsResponse = await fetch('/api/flashcards?groupBySet=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (setsResponse.ok) {
        const setsData = await setsResponse.json();
        setFlashcardSets(setsData.flashcardSets || []);
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load flashcards',
        variant: 'destructive'
      });
    } finally {
      setLoadingFlashcards(false);
    }
  }, [user, toast, refreshToken]);

  // Fetch flashcards when the component mounts
  useEffect(() => {
    if (user && !loading) {
      fetchFlashcards();
    }
  }, [user, loading, fetchFlashcards]);

  // Helper function to format time
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  // Calculate accuracy percentage
  const calculateAccuracy = (stats: FlashcardStats): number => {
    if (!stats) return 0;
    
    const totalAnswered = stats.totalCorrect + stats.totalIncorrect;
    if (totalAnswered === 0) return 0;
    
    return Math.round((stats.totalCorrect / totalAnswered) * 100);
  };

  // Filter flashcards based on search query
  const filteredFlashcards = searchQuery
    ? flashcards.filter(card => 
        card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : flashcards;
    
  // Filter flashcard sets based on search query
  const filteredFlashcardSets = searchQuery
    ? flashcardSets.filter(set => 
        set.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.sampleQuestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : flashcardSets;

  // Toggle flashcard visibility
  const toggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          isPublic: !currentVisibility
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update flashcard visibility');
      }
      
      // Update local state
      setFlashcards(cards => 
        cards.map(card => 
          card._id === id 
            ? { ...card, isPublic: !currentVisibility } 
            : card
        )
      );
      
      toast({
        title: 'Success',
        description: `Flashcard is now ${!currentVisibility ? 'public' : 'private'}`,
      });
    } catch (error) {
      console.error('Error updating flashcard visibility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update flashcard visibility',
        variant: 'destructive'
      });
    }
  };

  // Render the statistics cards
  const renderStatCards = () => {
    if (loadingStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-6 w-16" />
            </Card>
          ))}
        </div>
      );
    }
    
    console.log('Rendering stats cards with data:', stats);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cards"
          value={stats?.totalCards || 0}
          icon={<SquareStack className="h-4 w-4" />}
        />
        <StatCard
          title="Cards Due"
          value={stats?.cardsDue || 0}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Current Streak"
          value={stats?.currentStreak || 0}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          title="Accuracy"
          value={`${stats?.accuracy || 0}%`}
          icon={<Target className="h-4 w-4" />}
        />
      </div>
    );
  };

  // Render the detailed statistics
  const renderDetailedStats = () => {
    if (loadingStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(2).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full mt-2" />
            </Card>
          ))}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Study Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Correct:</span>
                <span className="font-medium">{stats?.totalCorrect || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Incorrect:</span>
                <span className="font-medium">{stats?.totalIncorrect || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Skipped:</span>
                <span className="font-medium">{stats?.totalSkipped || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cards Studied:</span>
                <span className="font-medium">{stats?.totalCardsStudied || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Study Sessions:</span>
                <span className="font-medium">{stats?.totalSessions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Time:</span>
                <span className="font-medium">{formatTimeSpent(stats?.totalTimeSpent || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Time per Card:</span>
                <span className="font-medium">
                  {stats?.totalCardsStudied && stats.totalCardsStudied > 0
                    ? formatTimeSpent((stats.totalTimeSpent || 0) / stats.totalCardsStudied)
                    : '0s'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">
            Create, organize, and study flashcards to enhance your medical knowledge
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/flashcards/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Flashcards
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/flashcards/study">
              <BookOpen className="mr-2 h-4 w-4" />
              Study Now
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sets">Sets</TabsTrigger>
          <TabsTrigger value="all">All Cards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          {renderStatCards()}
          
          {/* Study Activity and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Study Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Study Activity
                  </CardTitle>
                  <CardDescription>
                    Your flashcard study sessions over the past 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="h-40 w-full bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="h-40 flex items-end gap-1">
                      {stats?.last30Days.slice(0, 30).reverse().map((day, i) => (
                        <div 
                          key={i} 
                          className="flex-1 flex flex-col items-center"
                          title={`${day.date}: ${day.count} sessions`}
                        >
                          <div 
                            className="w-full bg-primary/20 rounded-sm hover:bg-primary/30 transition-colors"
                            style={{ 
                              height: day.count ? `${Math.min(100, day.count * 20)}%` : '4px'
                            }}
                          >
                            {day.count > 0 && (
                              <div className="w-full bg-primary rounded-sm" style={{ height: '4px' }} />
                            )}
                          </div>
                          {i % 5 === 0 && (
                            <span className="text-xs text-muted-foreground mt-1">
                              {new Date(day.date).getDate()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Sessions</p>
                      <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cards Studied</p>
                      <p className="text-2xl font-bold">
                        {(stats?.totalCorrect || 0) + (stats?.totalIncorrect || 0) + (stats?.totalSkipped || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Time Spent</p>
                      <p className="text-2xl font-bold">{formatTimeSpent(stats?.totalTimeSpent || 0)}</p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
            
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Create and study flashcards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full justify-start" variant="default">
                    <Link href="/flashcards/study">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Study Due Cards
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="default">
                    <Link href="/flashcards/all?view=sets">
                      <Folder className="mr-2 h-4 w-4" />
                      View All Sets
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/flashcards/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Manually
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/flashcards/create?ai=true">
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/flashcards/create?pdf=true">
                      <FileUp className="mr-2 h-4 w-4" />
                      Import from PDF
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Performance Metrics */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Track your progress and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDetailedStats()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flashcard Sets</CardTitle>
              <CardDescription>
                Study organized sets of flashcards by topic
              </CardDescription>
              <div className="flex items-center mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sets..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button asChild className="ml-2">
                  <Link href="/flashcards/create?ai=true">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Set
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFlashcards ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : flashcardSets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any flashcard sets yet</p>
                  <Button asChild>
                    <Link href="/flashcards/create?ai=true">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Set
                    </Link>
                  </Button>
                </div>
              ) : filteredFlashcardSets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No flashcard sets match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFlashcardSets.map((set) => (
                    <Card key={set.setId} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle>{set.topicName}</CardTitle>
                          <Badge variant="outline" className="capitalize">
                            {set.difficulty}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {set.sampleQuestion}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge 
                            variant="outline" 
                            className={`bg-${set.category?.color || 'gray'}-100 text-${set.category?.color || 'gray'}-800 dark:bg-${set.category?.color || 'gray'}-900/20 dark:text-${set.category?.color || 'gray'}-400`}
                          >
                            {set.category?.name || 'Uncategorized'}
                          </Badge>
                          <Badge variant="secondary">
                            {set.cardCount} cards
                          </Badge>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex justify-end">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/flashcards/study?setId=${set.setId}`)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Study Set
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Flashcards</CardTitle>
              <CardDescription>
                Manage your flashcards collection
              </CardDescription>
              <div className="flex items-center mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search flashcards..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button asChild className="ml-2">
                  <Link href="/flashcards/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingFlashcards ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : flashcardSets.length === 0 && flashcards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any flashcards yet</p>
                  <Button asChild>
                    <Link href="/flashcards/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Flashcard
                    </Link>
                  </Button>
                </div>
              ) : filteredFlashcardSets.length === 0 && filteredFlashcards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No flashcards match your search</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Flashcard Sets Section */}
                  {filteredFlashcardSets.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Flashcard Sets</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredFlashcardSets.map((set) => (
                          <Card key={set.setId} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle>{set.topicName}</CardTitle>
                                <Badge variant="outline" className="capitalize">
                                  {set.difficulty}
                                </Badge>
                              </div>
                              <CardDescription className="line-clamp-2">
                                {set.sampleQuestion}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`bg-${set.category?.color || 'gray'}-100 text-${set.category?.color || 'gray'}-800 dark:bg-${set.category?.color || 'gray'}-900/20 dark:text-${set.category?.color || 'gray'}-400`}
                                >
                                  {set.category?.name || 'Uncategorized'}
                                </Badge>
                                <Badge variant="secondary">
                                  {set.cardCount} cards
                                </Badge>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2 flex justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => router.push(`/flashcards/study?setId=${set.setId}`)}
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                Study Set
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Flashcards Section */}
                  {filteredFlashcards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Individual Flashcards</h3>
                      <div className="space-y-4">
                        {filteredFlashcards.map((card) => (
                          <div key={card._id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium">{card.question}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{card.answer}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleVisibility(card._id, card.isPublic)}
                                  title={card.isPublic ? "Make Private" : "Make Public"}
                                >
                                  {card.isPublic ? (
                                    <Eye className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => router.push(`/flashcards/edit/${card._id}`)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={`bg-${card.category?.color || 'gray'}-100 text-${card.category?.color || 'gray'}-800 dark:bg-${card.category?.color || 'gray'}-900/20 dark:text-${card.category?.color || 'gray'}-400`}
                              >
                                {card.category?.name || 'Uncategorized'}
                              </Badge>
                              <Badge variant={card.isPublic ? "default" : "outline"}>
                                {card.isPublic ? "Public" : "Private"}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {card.difficulty}
                              </Badge>
                              {card.tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                              {card.tags.length > 3 && (
                                <Badge variant="secondary">+{card.tags.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {(flashcards.length > 0 || flashcardSets.length > 0) && (
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredFlashcardSets.length} sets and {filteredFlashcards.length} individual cards
                </p>
                <Button variant="outline" asChild>
                  <Link href="/flashcards/study">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Study All
                  </Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FlashcardsDashboard; 