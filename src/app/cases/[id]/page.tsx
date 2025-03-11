'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Clock, Tag, User, AlertCircle, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const float = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

interface CaseData {
  _id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: string;
  tags: string[];
  specialties: string[];
  mediaUrls: string[];
  isAIGenerated: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  answers: {
    _id: string;
    question: string;
    answer: string;
    explanation: string;
  }[];
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cases/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Case not found');
          } else {
            const errorData = await response.json();
            setError(errorData.message || 'Failed to load case');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setCaseData(data);
      } catch (err) {
        setError('An error occurred while fetching the case');
        console.error('Error fetching case:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

  // Check if the case is bookmarked
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!user || !params.id) return;
      
      try {
        const idToken = await user.getIdToken(true);
        const response = await fetch(`/api/cases/bookmark?caseId=${params.id}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.isBookmarked);
        }
      } catch (err) {
        console.error('Error checking bookmark status:', err);
      }
    };
    
    checkBookmarkStatus();
  }, [user, params.id]);

  const handleGoBack = () => {
    router.back();
  };

  const toggleAnswer = (id: string) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper function to extract image references from markdown content
  const extractImageReferences = (content: string): string[] => {
    const regex = /\[Image: ([^\]]+)\]/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  };

  // Clean the markdown content by removing image references
  const cleanMarkdownContent = (content: string): string => {
    if (!content) return '';
    
    // Remove image references
    return content.replace(/\[Image: [^\]]+\]/g, '');
  };

  // Function to format markdown content for display
  const renderMarkdownContent = (content: string) => {
    if (!content) return null;
    
    // Clean the content first
    const cleanedContent = cleanMarkdownContent(content);
    
    // Split content by line breaks
    const lines = cleanedContent.split('\n');
    
    // Process each line
    return lines.map((line, index) => {
      // Skip empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-4"></div>;
      }
      
      // Handle headings
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-6 mb-4">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold mt-5 mb-3">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold mt-4 mb-2">{line.substring(4)}</h3>;
      } else if (line.startsWith('#### ')) {
        return <h4 key={index} className="text-base font-bold mt-3 mb-2">{line.substring(5)}</h4>;
      }
      
      // Handle lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={index} className="flex items-start my-1">
            <span className="mr-2">•</span>
            <span>{line.substring(2)}</span>
          </div>
        );
      }
      
      if (line.match(/^\d+\.\s/)) {
        const numberMatch = line.match(/^\d+/);
        if (numberMatch) {
          const number = numberMatch[0];
          return (
            <div key={index} className="flex items-start my-1">
              <span className="mr-2">{number}.</span>
              <span>{line.substring(number.length + 2)}</span>
            </div>
          );
        }
      }
      
      // Handle regular paragraphs
      return <p key={index} className="my-2">{line}</p>;
    });
  };

  // Toggle bookmark
  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to bookmark cases",
        variant: "destructive"
      });
      router.push(`/login?callbackUrl=/cases/${params.id}`);
      return;
    }
    
    try {
      setBookmarkLoading(true);
      
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/cases/bookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ caseId: params.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsBookmarked(data.isBookmarked);
        
        toast({
          title: data.isBookmarked ? "Case bookmarked" : "Bookmark removed",
          description: data.isBookmarked 
            ? "This case has been added to your saved cases" 
            : "This case has been removed from your saved cases",
          variant: "default"
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
      setBookmarkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="space-y-6">
          <div className="h-12 w-3/4 bg-muted animate-pulse rounded-md"></div>
          <div className="h-6 w-1/2 bg-muted animate-pulse rounded-md"></div>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 bg-muted animate-pulse rounded-md"></div>
            <div className="h-6 w-20 bg-muted animate-pulse rounded-md"></div>
            <div className="h-6 w-20 bg-muted animate-pulse rounded-md"></div>
          </div>
          <div className="h-64 w-full bg-muted animate-pulse rounded-md"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="p-4 border border-destructive bg-destructive/10 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <h3 className="text-lg font-medium text-destructive">Error</h3>
          </div>
          <p className="mt-2 text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 p-6"
      >
        <div className="absolute inset-0 bg-grid-white dark:bg-grid-dark [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className={cn(
                "transition-all",
                isBookmarked ? "bg-primary/10 text-primary hover:bg-primary/20" : ""
              )}
            >
              {bookmarkLoading ? (
                <span className="animate-pulse">Processing...</span>
              ) : isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{caseData?.title}</h1>
          <p className="mt-2 text-muted-foreground max-w-3xl">{caseData?.description}</p>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          className="md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-border bg-card mb-6">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{caseData.title}</CardTitle>
                  <CardDescription className="mt-2">{caseData.description}</CardDescription>
                </div>
                {caseData.isAIGenerated && (
                  <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    AI Generated
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="flex items-center">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {caseData.category}
                </Badge>
                <Badge variant="outline" className={cn(
                  caseData.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  caseData.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                )}>
                  {caseData.difficulty.charAt(0).toUpperCase() + caseData.difficulty.slice(1)}
                </Badge>
                {caseData.specialties?.map((specialty) => (
                  <Badge key={specialty} variant="outline">{specialty}</Badge>
                ))}
              </div>
              
              <div className="flex items-center mt-4 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback>{caseData.createdBy?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="mr-2">{caseData.createdBy?.name || 'Unknown User'}</span>
                <Clock className="h-3 w-3 ml-2 mr-1" />
                <span>{new Date(caseData.createdAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {renderMarkdownContent(caseData.content)}
              </div>
              
              {caseData.mediaUrls && caseData.mediaUrls.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Images</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {caseData.mediaUrls.map((url, index) => (
                      <motion.div 
                        key={index} 
                        className="relative aspect-video rounded-md overflow-hidden border"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Image 
                          src={url} 
                          alt={`Case image ${index + 1}`} 
                          fill
                          className="object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions Section */}
          {caseData.answers && caseData.answers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="overflow-hidden border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl">Questions</CardTitle>
                  <CardDescription>Test your knowledge with these questions related to the case</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {caseData.answers.map((answer, index) => (
                      <motion.div 
                        key={answer._id} 
                        className="border rounded-lg overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div 
                          className="p-4 bg-secondary/50 flex justify-between items-center cursor-pointer"
                          onClick={() => toggleAnswer(answer._id)}
                        >
                          <h3 className="font-medium">Question {index + 1}: {answer.question}</h3>
                          <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                            {expandedAnswers[answer._id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {expandedAnswers[answer._id] && (
                          <div className="p-4 border-t">
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Answer:</h4>
                              <p className="font-medium">{answer.answer}</p>
                            </div>
                            <Separator className="my-3" />
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Explanation:</h4>
                              <div className="prose prose-slate dark:prose-invert max-w-none">
                                {renderMarkdownContent(answer.explanation)}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                  <p>{caseData.category}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Difficulty</h3>
                  <p className="capitalize">{caseData.difficulty}</p>
                </div>
                
                {caseData.specialties && caseData.specialties.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Specialties</h3>
                    <div className="flex flex-wrap gap-1">
                      {caseData.specialties.map((specialty, index) => (
                        <motion.div 
                          key={specialty}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <Badge variant="outline">{specialty}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {caseData.tags && caseData.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      <Tag className="h-3 w-3 mr-1 inline" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {caseData.tags.map((tag, index) => (
                        <motion.div 
                          key={tag}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <Badge variant="secondary" className="bg-secondary">{tag}</Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    <User className="h-3 w-3 mr-1 inline" />
                    Created By
                  </h3>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback>{caseData.createdBy?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span>{caseData.createdBy?.name || 'Unknown User'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    <Clock className="h-3 w-3 mr-1 inline" />
                    Created
                  </h3>
                  <p>{new Date(caseData.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 