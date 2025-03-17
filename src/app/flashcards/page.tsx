'use client';

import React, { useState, useEffect } from 'react';
import FlashcardsDashboard from '@/components/flashcards/FlashcardsDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';

export default function FlashcardsPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }
    
    // If authentication check is complete, stop loading
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto py-6 max-w-7xl">
        <FlashcardsDashboard />
      </div>
    </div>
  );
} 