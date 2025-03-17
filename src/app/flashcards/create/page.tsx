'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import CreateFlashcards from '@/components/flashcards/CreateFlashcards';
import { MainNav } from '@/components/ui/navigation-menu';

export default function CreateFlashcardsPage() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get creation mode from query params
  const mode = searchParams.get('ai') === 'true' 
    ? 'ai' 
    : searchParams.get('pdf') === 'true' 
      ? 'pdf' 
      : 'manual';

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
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto py-6 max-w-4xl">
        <CreateFlashcards initialMode={mode} />
      </div>
    </div>
  );
} 