'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, Clock, Star, Filter, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [error, setError] = useState('');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch cases
  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      setError('');
      
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append('search', searchQuery);
        if (categoryFilter) queryParams.append('category', categoryFilter);
        if (difficultyFilter) queryParams.append('difficulty', difficultyFilter);
        queryParams.append('page', page.toString());
        queryParams.append('limit', '9');
        
        const response = await fetch(`/api/cases?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch cases');
        }
        
        const data = await response.json();
        setCases(data.cases);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError('Failed to load cases. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCases();
  }, [searchQuery, categoryFilter, difficultyFilter, page]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
  };
  
  // Handle filter changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === 'all' ? '' : value);
    setPage(1);
  };
  
  const handleDifficultyChange = (value: string) => {
    setDifficultyFilter(value === 'all' ? '' : value);
    setPage(1);
  };
  
  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
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
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
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
            
            <Button type="submit">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </form>
      </Card>
      
      {/* Error message */}
      {error && (
        <div className="p-4 mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive rounded">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading cases...</p>
        </div>
      ) : (
        <>
          {/* No results */}
          {cases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl mb-4">No cases found</p>
              <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
              <Button onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setDifficultyFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Cases grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {cases.map((caseItem, index) => (
                  <motion.div
                    key={caseItem._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
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
                      
                      <p className="text-muted-foreground mb-4 flex-grow">{caseItem.description}</p>
                      
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
              </div>
              
              {/* Pagination */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Showing page {page} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BrowseCasesPage; 