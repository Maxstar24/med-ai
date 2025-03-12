'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Calendar, Clock, Brain, Award, TrendingUp, Target, Zap, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface QuizResult {
  id: string;
  _id?: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: string;
  improvement: string;
  streak: number;
}

interface QuizStats {
  totalQuizzesTaken: number;
  averageScore: number;
  totalTimeSpent: number;
  currentStreak: number;
}

export default function QuizHistoryPage() {
  const { user, loading: authLoading, refreshToken, logout } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/quizzes/history');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user) {
      testAuth().then(() => {
        fetchResults();
      });
    }
  }, [selectedTimeframe, user, authLoading]);

  // Test authentication endpoint
  const testAuth = async () => {
    if (!user) return false;
    
    try {
      console.log('Testing authentication...');
      
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken(false);
      console.log('Got ID token for test, length:', idToken.length);
      
      const testResponse = await fetch('/api/auth/test', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Auth test response status:', testResponse.status);
      const testData = await testResponse.json();
      console.log('Auth test response data:', testData);
      
      if (!testResponse.ok) {
        console.error('Auth test failed:', testData.error);
      }
      
      return testData.success;
    } catch (error) {
      console.error('Error testing auth:', error);
      return false;
    }
  };

  const fetchResults = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null); // Reset error state
    
    try {
      console.log('Fetching quiz results...');
      
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken(false); // Don't force refresh on initial attempt
      console.log('Got ID token, length:', idToken.length);
      
      const response = await fetch('/api/quizzes/results', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      
      if (response.ok) {
        // Log the first result to see its structure
        if (data.results && data.results.length > 0) {
          console.log('First result object:', JSON.stringify(data.results[0]));
        }
        
        setResults(data.results || []);
        setStats(data.stats || null);
        console.log('Results loaded successfully:', data.results?.length || 0, 'items');
      } else {
        console.error('Failed to fetch results:', data.error);
        
        // Handle unauthorized error specifically
        if (data.error === "Unauthorized") {
          console.log('Unauthorized error detected, will try token refresh');
          setError("Your session has expired. Please try refreshing your token.");
        } else {
          setError(`Failed to load quiz history: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Add a function to retry with a forced token refresh
  const retryWithTokenRefresh = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to refresh token...');
      
      // Force token refresh using the AuthContext method
      const newToken = await refreshToken();
      console.log('Token refresh result:', newToken ? 'Success' : 'Failed');
      
      if (!newToken) {
        setError("Failed to refresh authentication token. Please log in again.");
        setTimeout(() => {
          router.push('/login?callbackUrl=/quizzes/history&forceRefresh=true');
        }, 2000);
        return;
      }
      
      console.log('Retrying API call with new token...');
      const response = await fetch('/api/quizzes/results', {
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API retry response status:', response.status);
      const data = await response.json();
      console.log('API retry response data:', data);
      
      if (response.ok) {
        setResults(data.results || []);
        setStats(data.stats || null);
        console.log('Results loaded successfully after token refresh');
      } else {
        console.error('Failed to fetch results after token refresh:', data.error);
        
        if (data.error === "Unauthorized") {
          console.log('Still unauthorized after token refresh, will redirect to login');
          setError("Authentication failed. Please log out and log in again.");
          // Only redirect after a failed token refresh attempt
          setTimeout(() => {
            router.push('/login?callbackUrl=/quizzes/history&forceRefresh=true');
          }, 2000);
        } else {
          setError(`Failed to load quiz history: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error fetching results after token refresh:', error);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <h1 className="text-4xl font-bold">Quiz History</h1>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-md text-destructive flex justify-between items-center">
              <span>{error}</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchResults()}
                  disabled={loading}
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </Button>
                {error.includes("expired") && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => retryWithTokenRefresh()}
                    disabled={loading}
                  >
                    Refresh Token
                  </Button>
                )}
                {error.includes("Failed to refresh") && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={async () => {
                      await logout();
                      router.push('/login?callbackUrl=/quizzes/history');
                    }}
                    disabled={loading}
                  >
                    Log Out
                  </Button>
                )}
              </div>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Quizzes</p>
                    <p className="text-2xl font-bold">{stats.totalQuizzesTaken}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <BarChart2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{Math.round(stats.averageScore * 100)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold">{stats.currentStreak} days</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold">{formatTime(stats.totalTimeSpent)}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((result, index) => (
                <motion.div
                  key={`${result.id}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(result.completedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            <span className="font-semibold">
                              {result.score} / {result.totalQuestions}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((result.score / result.totalQuestions) * 100)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{formatTime(result.timeSpent)}</span>
                          </div>
                          {result.improvement && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-500">{result.improvement}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Progress
                            value={(result.score / result.totalQuestions) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                      <Link href={`/quizzes/results/${result._id || result.id}`}>
                        <Button variant="outline" className="md:w-auto">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Brain className="w-12 h-12 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">No Quiz Results Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You haven't completed any quizzes yet. Take a quiz to see your results here!
                  </p>
                  <Link href="/quizzes">
                    <Button className="mt-2">
                      Take a Quiz
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 