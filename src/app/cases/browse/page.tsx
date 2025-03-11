'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, X, Filter, ArrowRight, Loader2, BookText, PlusCircle, Sparkles, Bookmark, BookmarkCheck, History, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import debounce from 'lodash.debounce';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

interface Case {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  specialties: string[];
  isAIGenerated: boolean;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

// CasesNavBar component
const CasesNavBar = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8 bg-card border-b border-border sticky top-0 z-10"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between py-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center mb-4 md:mb-0"
          >
            <BookText className="h-8 w-8 text-primary mr-3" />
            <h2 className="text-2xl font-bold">Medical Cases</h2>
          </motion.div>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/cases/browse" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link href="/cases/create" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link href="/cases/generate" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              {user && (
                <>
                  <NavigationMenuItem>
                    <Link href="/cases/saved" legacyBehavior passHref>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Saved
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Link href="/cases/history" legacyBehavior passHref>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        <History className="w-4 h-4 mr-2" />
                        History
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
    </motion.div>
  );
};

const BrowseCasesPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [bookmarkedCases, setBookmarkedCases] = useState<Record<string, boolean>>({});
  const [bookmarkLoading, setBookmarkLoading] = useState<Record<string, boolean>>({});
  
  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
      setPage(1); // Reset to first page on new search
      setCases([]); // Clear existing cases
    }, 500),
    []
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  };
  
  // Fetch cases
  const fetchCases = useCallback(async (isLoadingMore = false) => {
    if (!isLoadingMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');
    
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearchQuery) queryParams.append('search', debouncedSearchQuery);
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter);
      if (difficultyFilter !== 'all') queryParams.append('difficulty', difficultyFilter);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '9');
      
      const response = await fetch(`/api/cases?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }
      
      const data = await response.json();
      
      if (isLoadingMore) {
        setCases(prev => [...prev, ...data.cases]);
      } else {
        setCases(data.cases);
      }
      
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearchQuery, categoryFilter, difficultyFilter, page]);
  
  // Initial fetch
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);
  
  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prevPage => prevPage + 1);
          fetchCases(true);
        }
      },
      { threshold: 1.0 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, fetchCases]);
  
  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
    setCases([]);
  };
  
  const handleDifficultyChange = (value: string) => {
    setDifficultyFilter(value);
    setPage(1);
    setCases([]);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setPage(1);
    setCases([]);
  };
  
  // Fetch bookmarked cases for the user
  useEffect(() => {
    const fetchBookmarkedCases = async () => {
      if (!user) return;
      
      try {
        const idToken = await user.getIdToken(true);
        const response = await fetch('/api/cases/saved', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const bookmarked: Record<string, boolean> = {};
          
          data.cases.forEach((caseItem: Case) => {
            bookmarked[caseItem._id] = true;
          });
          
          setBookmarkedCases(bookmarked);
        }
      } catch (err) {
        console.error('Error fetching bookmarked cases:', err);
      }
    };
    
    if (user) {
      fetchBookmarkedCases();
    }
  }, [user]);
  
  // Toggle bookmark function
  const toggleBookmark = async (e: React.MouseEvent<HTMLButtonElement>, caseId: string) => {
    e.stopPropagation(); // Prevent navigating to the case detail page
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to bookmark cases",
        variant: "destructive"
      });
      router.push(`/login?callbackUrl=/cases/browse`);
      return;
    }
    
    try {
      setBookmarkLoading(prev => ({ ...prev, [caseId]: true }));
      
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/cases/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ caseId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        setBookmarkedCases(prev => ({
          ...prev,
          [caseId]: data.isBookmarked
        }));
        
        toast({
          title: data.isBookmarked ? "Case bookmarked" : "Bookmark removed",
          description: data.isBookmarked 
            ? "This case has been added to your saved cases" 
            : "This case has been removed from your saved cases"
        });
      } else {
        throw new Error('Failed to toggle bookmark');
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast({
        title: "Error",
        description: "Failed to update bookmark status",
        variant: "destructive"
      });
    } finally {
      setBookmarkLoading(prev => ({ ...prev, [caseId]: false }));
    }
  };
  
  // Case card skeleton for loading state
  const CaseSkeleton = () => (
    <Card className="p-6 border-border bg-card h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-4 flex-grow">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </Card>
  );
  
  return (
    <>
      <CasesNavBar />
      
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Browse Medical Cases</h1>
            <p className="text-muted-foreground">Explore our collection of medical cases for study and reference</p>
          </motion.div>
          
          {/* Filters */}
          <Card className="p-4 mb-6 border-border bg-card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pr-10"
                />
                {searchQuery && (
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setPage(1);
                      setCases([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Oncology">Oncology</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={difficultyFilter} onValueChange={handleDifficultyChange}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Active filters */}
            {(debouncedSearchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all') && (
              <div className="flex flex-wrap gap-2 mt-4">
                {debouncedSearchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {debouncedSearchQuery}
                    <button onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setPage(1);
                      setCases([]);
                    }}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                {categoryFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Category: {categoryFilter}
                    <button onClick={() => {
                      setCategoryFilter('all');
                      setPage(1);
                      setCases([]);
                    }}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                {difficultyFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Difficulty: {difficultyFilter}
                    <button onClick={() => {
                      setDifficultyFilter('all');
                      setPage(1);
                      setCases([]);
                    }}>
                      <X className="h-3 w-3 ml-1" />
                    </button>
                  </Badge>
                )}
                
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6">
                  Clear All
                </Button>
              </div>
            )}
          </Card>
          
          {/* Error message */}
          {error && (
            <div className="p-4 mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive rounded">
              {error}
            </div>
          )}
          
          {/* Initial loading state */}
          {loading && cases.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(6)].map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CaseSkeleton />
                </motion.div>
              ))}
            </div>
          ) : (
            <>
              {/* No results */}
              {cases.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <p className="text-xl mb-4">No cases found</p>
                  <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
                  <Button onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <>
                  {/* Cases grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <AnimatePresence>
                      {cases.map((caseItem, index) => (
                        <motion.div
                          key={caseItem._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          layout
                        >
                          <Card 
                            className="p-6 border-border bg-card hover:shadow-md transition-all cursor-pointer h-full flex flex-col"
                            onClick={() => router.push(`/cases/${caseItem._id}`)}
                          >
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <BookOpen className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold">{caseItem.title}</h3>
                                  <p className="text-sm text-muted-foreground">{caseItem.category}</p>
                                </div>
                              </div>
                              
                              {user && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${bookmarkedCases[caseItem._id] ? 'text-primary' : 'text-muted-foreground'}`}
                                  onClick={(e) => toggleBookmark(e, caseItem._id)}
                                  disabled={bookmarkLoading[caseItem._id]}
                                >
                                  {bookmarkLoading[caseItem._id] ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : bookmarkedCases[caseItem._id] ? (
                                    <BookmarkCheck className="h-5 w-5" />
                                  ) : (
                                    <Bookmark className="h-5 w-5" />
                                  )}
                                </Button>
                              )}
                            </div>
                            
                            <p className="text-muted-foreground mb-4 flex-grow line-clamp-3">{caseItem.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {caseItem.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                                  {tag}
                                </span>
                              ))}
                              {caseItem.isAIGenerated && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-md text-xs">
                                  AI Generated
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto pt-4 border-t border-border">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs ${
                                  caseItem.difficulty === 'beginner' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                                  caseItem.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                                  'bg-red-500/20 text-red-700 dark:text-red-300'
                                }`}>
                                  {caseItem.difficulty}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="ml-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/cases/${caseItem._id}`);
                                  }}
                                >
                                  View Case <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  {/* Load more / infinite scroll trigger */}
                  {hasMore && (
                    <div 
                      ref={observerTarget} 
                      className="flex justify-center py-8"
                    >
                      {loadingMore && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading more cases...</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* End of results message */}
                  {!hasMore && cases.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      You've reached the end of the results
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BrowseCasesPage; 