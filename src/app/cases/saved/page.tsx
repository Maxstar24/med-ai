'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Loader2, BookmarkX, BookText, PlusCircle, Sparkles, Bookmark, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { 
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

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

const SavedCasesPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [savedCases, setSavedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch saved cases
  useEffect(() => {
    const fetchSavedCases = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError('');
        
        // Get Firebase ID token
        const idToken = await user.getIdToken(true);
        
        const response = await fetch('/api/cases/saved', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved cases');
        }
        
        const data = await response.json();
        setSavedCases(data.cases || []);
      } catch (err) {
        console.error('Error fetching saved cases:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && !authLoading) {
      fetchSavedCases();
    }
  }, [user, authLoading]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/cases/saved');
    }
  }, [user, authLoading, router]);
  
  if (authLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
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
            <h1 className="text-3xl font-bold mb-2">Saved Cases</h1>
            <p className="text-muted-foreground">Your collection of saved medical cases for future reference</p>
          </motion.div>
          
          {error && (
            <div className="p-4 mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive rounded">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 border border-border bg-card h-full rounded-lg"
                >
                  <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/20"></div>
                      <div>
                        <div className="h-4 w-40 bg-primary/20 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-primary/10 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 w-full bg-primary/10 rounded"></div>
                      <div className="h-3 w-full bg-primary/10 rounded"></div>
                      <div className="h-3 w-3/4 bg-primary/10 rounded"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <>
              {savedCases.length === 0 ? (
                <div className="text-center py-12">
                  <BookmarkX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-xl mb-4">No saved cases found</p>
                  <p className="text-muted-foreground mb-6">You haven't saved any cases yet</p>
                  <Button onClick={() => router.push('/cases/browse')}>
                    Browse Cases
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <AnimatePresence>
                    {savedCases.map((caseItem, index) => (
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
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SavedCasesPage; 