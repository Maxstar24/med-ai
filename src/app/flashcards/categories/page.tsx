'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainNav } from '@/components/MainNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Folder, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  flashcardCount: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading, refreshToken } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories
  const fetchCategories = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const token = await refreshToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      const response = await fetch('/api/flashcards/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch categories when component mounts
  useEffect(() => {
    if (user && !loading) {
      fetchCategories();
    }
  }, [user, loading]);

  // Add dependency on fetchCategories
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user && !loading) {
        fetchCategories();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [user, loading]);

  // Check if user is authenticated
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return category.name.toLowerCase().includes(query);
  });

  // Show loading state
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
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Organize your flashcards by categories
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search categories..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => router.push('/flashcards/categories/create')}>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </div>
        </div>
        
        {/* Debug information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-muted p-4 rounded-md mb-4">
            <h3 className="font-medium mb-2">Debug Info:</h3>
            <p>Categories count: {categories.length}</p>
            <p>Filtered categories count: {filteredCategories.length}</p>
            <p>Loading: {isLoading ? 'true' : 'false'}</p>
            <p>Auth loading: {loading ? 'true' : 'false'}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCategories} 
              className="mt-2"
            >
              Refresh Categories
            </Button>
          </div>
        )}
        
        {/* Categories grid */}
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>No Categories Found</CardTitle>
                <CardDescription>
                  {searchQuery 
                    ? 'No categories match your search query.' 
                    : 'You haven\'t created any categories yet.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground">
                  Create your first category to help organize your flashcards.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => router.push('/flashcards/categories/create')} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card 
                key={category._id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/flashcards/all?category=${category._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-${category.color || 'gray'}-100 dark:bg-${category.color || 'gray'}-900/20 flex items-center justify-center`}>
                      <Folder className={`h-4 w-4 text-${category.color || 'gray'}-500`} />
                    </div>
                    <CardTitle>{category.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    {category.flashcardCount} {category.flashcardCount === 1 ? 'flashcard' : 'flashcards'}
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Badge variant="outline" className={`bg-${category.color || 'gray'}-100 text-${category.color || 'gray'}-800 dark:bg-${category.color || 'gray'}-900/20 dark:text-${category.color || 'gray'}-400`}>
                    <Tag className="mr-1 h-3 w-3" />
                    {category.name}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 