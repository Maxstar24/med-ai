'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainNav } from '@/components/MainNav';
import { useAuth } from '@/contexts/AuthContext';
import FlashcardList from '@/components/flashcards/FlashcardList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Grid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AllFlashcardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get the view parameter from URL (sets or cards)
  const viewParam = searchParams.get('view');
  const [view, setView] = useState(viewParam === 'cards' ? 'cards' : 'sets');

  // Handle view change
  const handleViewChange = (newView: string) => {
    setView(newView);
    // Update URL without refreshing the page
    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    // Check if user is authenticated
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Flashcard Library</h1>
            <p className="text-muted-foreground">
              Browse and study your flashcard collection
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search flashcards..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => router.push('/flashcards/create')}>
              Create New
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Tabs value={view} onValueChange={handleViewChange} className="w-[200px]">
            <TabsList>
              <TabsTrigger value="sets" className="flex items-center gap-1">
                <Grid className="h-4 w-4" />
                Sets
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                Cards
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/flashcards/study')}
            >
              Study Due Cards
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/flashcards/categories')}
            >
              View Categories
            </Button>
          </div>
        </div>
        
        <FlashcardList 
          searchQuery={searchQuery} 
          showSets={view === 'sets'} 
          showCards={view === 'cards'} 
        />
      </div>
    </div>
  );
} 