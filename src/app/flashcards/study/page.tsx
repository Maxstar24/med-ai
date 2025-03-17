'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainNav } from '@/components/MainNav';
import { useAuth } from '@/contexts/AuthContext';
import FlashcardStudy from '@/components/flashcards/FlashcardStudy';

export default function StudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get query parameters
  const filter = searchParams.get('filter');
  const setId = searchParams.get('setId');

  // Check if user is authenticated
  useEffect(() => {
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
      
      <div className="container mx-auto py-6">
        <FlashcardStudy filter={filter} setId={setId} />
      </div>
    </div>
  );
} 