'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, X, Filter, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import debounce from 'lodash.debounce';

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

const BrowseCasesPage = () => {
  const router = useRouter();
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Medical Cases</h1>
          <p className="text-muted-foreground">Browse and study medical cases</p>
        </div>
        
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button onClick={() => router.push('/cases/create')}>
            Create Case
          </Button>
          <Button variant="outline" onClick={() => router.push('/cases/generate')}>
            Generate with AI
          </Button>
        </div>
      </div>
      
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
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <BookOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{caseItem.title}</h3>
                            <p className="text-sm text-muted-foreground">{caseItem.category}</p>
                          </div>
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
  );
};

export default BrowseCasesPage; 