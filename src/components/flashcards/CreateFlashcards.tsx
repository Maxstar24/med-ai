'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, FileUp, Lightbulb, Save, ArrowLeft, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

type CreationMode = 'manual' | 'ai' | 'pdf';

interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

interface CreateFlashcardsProps {
  initialMode?: CreationMode;
}

const CreateFlashcards: React.FC<CreateFlashcardsProps> = ({ initialMode = 'manual' }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, refreshToken } = useAuth();
  const [mode, setMode] = useState<CreationMode>(initialMode);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(5);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [cards, setCards] = useState<Array<{
    question: string;
    answer: string;
    explanation: string;
    tags: string[];
  }>>([{ question: '', answer: '', explanation: '', tags: [] }]);
  const [currentTag, setCurrentTag] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      
      try {
        setLoadingCategories(true);
        const token = await refreshToken();
        
        const response = await fetch('/api/flashcards/categories', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        // Ensure we're using the categories array from the response
        const categoriesArray = data.categories || [];
        console.log('Fetched categories:', categoriesArray);
        setCategories(categoriesArray);
        
        // Set first category as default if available
        if (categoriesArray.length > 0 && !selectedCategory) {
          setSelectedCategory(categoriesArray[0]._id);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive'
        });
        // Ensure categories is always an array even on error
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    if (user && !authLoading) {
      fetchCategories();
    }
  }, [user, authLoading, refreshToken, toast, selectedCategory]);

  // Create a new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Category name is required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setCreatingCategory(true);
      const token = await refreshToken();
      
      const response = await fetch('/api/flashcards/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategoryName,
          isPublic: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create category');
      }
      
      const newCategory = await response.json();
      console.log('Created new category:', newCategory);
      
      // Add the new category to the existing categories array
      setCategories(prevCategories => [...prevCategories, newCategory]);
      setSelectedCategory(newCategory._id);
      setNewCategoryName('');
      setCreatingCategory(false);
      
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive'
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  // Handle PDF file selection
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Error',
          description: 'Please upload a valid PDF file',
          variant: 'destructive'
        });
        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
        return;
      }
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'PDF file is too large. Please use a PDF smaller than 10MB',
          variant: 'destructive'
        });
        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
        return;
      }
      
      setPdfFile(file);
    }
  };

  // Add a new card to the manual creation form
  const addCard = () => {
    setCards([...cards, { question: '', answer: '', explanation: '', tags: [] }]);
  };

  // Remove a card from the manual creation form
  const removeCard = (index: number) => {
    const newCards = [...cards];
    newCards.splice(index, 1);
    setCards(newCards);
  };

  // Update a card field
  const updateCard = (index: number, field: 'question' | 'answer' | 'explanation', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  // Add a tag to a card
  const addTag = (index: number) => {
    if (!currentTag.trim()) return;
    
    const newCards = [...cards];
    if (!newCards[index].tags.includes(currentTag)) {
      newCards[index].tags.push(currentTag);
      setCards(newCards);
    }
    setCurrentTag('');
  };

  // Remove a tag from a card
  const removeTag = (cardIndex: number, tagIndex: number) => {
    const newCards = [...cards];
    newCards[cardIndex].tags.splice(tagIndex, 1);
    setCards(newCards);
  };

  // Generate flashcards with AI
  const generateFlashcards = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Error',
        description: 'Please select a category',
        variant: 'destructive'
      });
      return;
    }
    
    if (!topic && !pdfFile) {
      toast({
        title: 'Error',
        description: 'Please enter a topic or upload a PDF',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setGeneratingCards(true);
      const token = await refreshToken();
      
      const formData = new FormData();
      formData.append('categoryId', selectedCategory);
      formData.append('numCards', numCards.toString());
      formData.append('difficulty', difficulty);
      formData.append('isPublic', isPublic.toString());
      
      if (topic) {
        formData.append('topic', topic);
      }
      
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }
      
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate flashcards');
      }
      
      const generatedCards = await response.json();
      
      toast({
        title: 'Success',
        description: `Generated ${generatedCards.length} flashcards successfully`,
      });
      
      // Redirect to flashcards page
      router.push('/flashcards');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate flashcards',
        variant: 'destructive'
      });
    } finally {
      setGeneratingCards(false);
    }
  };

  // Save manually created flashcards
  const saveFlashcards = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Error',
        description: 'Please select a category',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate cards
    const invalidCards = cards.filter(card => !card.question.trim() || !card.answer.trim());
    if (invalidCards.length > 0) {
      toast({
        title: 'Error',
        description: 'All cards must have a question and answer',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setGeneratingCards(true);
      const token = await refreshToken();
      
      // Save each card
      const savedCards = [];
      for (const card of cards) {
        try {
          const response = await fetch('/api/flashcards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              question: card.question,
              answer: card.answer,
              explanation: card.explanation,
              category: selectedCategory,
              tags: card.tags,
              isPublic,
              difficulty
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Failed to save flashcard');
          }
          
          const savedCard = await response.json();
          savedCards.push(savedCard);
        } catch (cardError) {
          console.error('Error saving individual card:', cardError);
          throw cardError; // Re-throw to be caught by the outer try-catch
        }
      }
      
      toast({
        title: 'Success',
        description: `Saved ${savedCards.length} flashcards successfully`,
      });
      
      // Redirect to flashcards page
      router.push('/flashcards');
    } catch (error) {
      console.error('Error saving flashcards:', error);
      
      // Provide a more detailed error message to the user
      let errorMessage = 'Failed to save flashcards';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setGeneratingCards(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/flashcards')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create Flashcards</h1>
      </div>
      
      <Tabs value={mode} onValueChange={(value) => setMode(value as CreationMode)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full md:w-[400px] mb-4">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="ai">AI Generated</TabsTrigger>
          <TabsTrigger value="pdf">From PDF</TabsTrigger>
        </TabsList>
        
        {/* Common settings for all modes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Flashcard Settings</CardTitle>
            <CardDescription>
              Configure your flashcard settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2">Loading...</span>
                      </div>
                    ) : categories.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        No categories found
                      </div>
                    ) : (
                      categories.map(category => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => setCreatingCategory(!creatingCategory)}
                >
                  {creatingCategory ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <AnimatePresence>
              {creatingCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="newCategory">New Category Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newCategory"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                    <Button 
                      onClick={handleCreateCategory}
                      disabled={creatingCategory && !newCategoryName.trim()}
                    >
                      {creatingCategory ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Create
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={(value) => setDifficulty(value as 'easy' | 'medium' | 'hard')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="private" 
                      name="visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <div>
                      <Label htmlFor="private" className="font-medium">Private</Label>
                      <p className="text-sm text-muted-foreground">
                        Only visible to you
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="public" 
                      name="visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <div>
                      <Label htmlFor="public" className="font-medium">Public</Label>
                      <p className="text-sm text-muted-foreground">
                        Visible to all users and can be discovered in search
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Manual Creation Mode */}
        <TabsContent value="manual" className="space-y-6">
          <div className="space-y-4">
            {cards.map((card, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Card {index + 1}</CardTitle>
                    {cards.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeCard(index)}
                        className="h-8 w-8 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${index}`}>Question</Label>
                    <Textarea
                      id={`question-${index}`}
                      value={card.question}
                      onChange={(e) => updateCard(index, 'question', e.target.value)}
                      placeholder="Enter the question"
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`answer-${index}`}>Answer</Label>
                    <Textarea
                      id={`answer-${index}`}
                      value={card.answer}
                      onChange={(e) => updateCard(index, 'answer', e.target.value)}
                      placeholder="Enter the answer"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`explanation-${index}`}>Explanation (Optional)</Label>
                    <Textarea
                      id={`explanation-${index}`}
                      value={card.explanation}
                      onChange={(e) => updateCard(index, 'explanation', e.target.value)}
                      placeholder="Enter additional explanation or mnemonics"
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`tags-${index}`}>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {card.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTag(index, tagIndex)}
                            className="h-4 w-4 rounded-full p-0 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id={`tags-${index}`}
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(index);
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => addTag(index)}
                        disabled={!currentTag.trim()}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={addCard}>
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
              
              <Button onClick={saveFlashcards} disabled={generatingCards}>
                {generatingCards ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Flashcards
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        {/* AI Generation Mode */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate with AI</CardTitle>
              <CardDescription>
                Let AI create flashcards based on a medical topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Medical Topic</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a medical topic (e.g., 'Cardiac arrhythmias', 'Antibiotics', 'Renal physiology')"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numCards">Number of Cards</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="numCards"
                    type="number"
                    min={1}
                    max={20}
                    value={numCards}
                    onChange={(e) => setNumCards(parseInt(e.target.value) || 5)}
                  />
                  <span className="text-sm text-muted-foreground">
                    (1-20 cards)
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai-visibility">Visibility</Label>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="ai-private" 
                      name="ai-visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <div>
                      <Label htmlFor="ai-private" className="font-medium">Private</Label>
                      <p className="text-sm text-muted-foreground">
                        Only visible to you
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="ai-public" 
                      name="ai-visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <div>
                      <Label htmlFor="ai-public" className="font-medium">Public</Label>
                      <p className="text-sm text-muted-foreground">
                        Visible to all users and can be discovered in search
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={generateFlashcards} disabled={generatingCards}>
                {generatingCards ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* PDF Import Mode */}
        <TabsContent value="pdf" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from PDF</CardTitle>
              <CardDescription>
                Generate flashcards from a medical PDF document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdfFile">Upload PDF</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pdfFile"
                    type="file"
                    accept=".pdf"
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    className="flex-1"
                  />
                  {pdfFile && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setPdfFile(null);
                        if (pdfInputRef.current) {
                          pdfInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pdf-visibility">Visibility</Label>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="pdf-private" 
                      name="pdf-visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <div>
                      <Label htmlFor="pdf-private" className="font-medium">Private</Label>
                      <p className="text-sm text-muted-foreground">
                        Only visible to you
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="pdf-public" 
                      name="pdf-visibility" 
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <div>
                      <Label htmlFor="pdf-public" className="font-medium">Public</Label>
                      <p className="text-sm text-muted-foreground">
                        Visible to all users and can be discovered in search
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numCardsPdf">Number of Cards</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="numCardsPdf"
                    type="number"
                    min={1}
                    max={20}
                    value={numCards}
                    onChange={(e) => setNumCards(parseInt(e.target.value) || 5)}
                  />
                  <span className="text-sm text-muted-foreground">
                    (1-20 cards)
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topicPdf">Topic (Optional)</Label>
                <Input
                  id="topicPdf"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Specify a topic to focus on (optional)"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={generateFlashcards} 
                disabled={generatingCards || !pdfFile}
              >
                {generatingCards ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Generate from PDF
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreateFlashcards; 