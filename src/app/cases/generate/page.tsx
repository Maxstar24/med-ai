'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Markdown from '@/components/Markdown';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

const GenerateCasePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedCase, setGeneratedCase] = useState<any>(null);
  
  // Form state
  const [specialty, setSpecialty] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [numQuestions, setNumQuestions] = useState(3);
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/cases/generate');
    }
  }, [status, router]);
  
  // Handle form submission to generate a case
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (status !== 'authenticated') {
      setError('You must be logged in to generate a case');
      return;
    }
    
    // Validate form
    if (!specialty.trim()) {
      setError('Please specify a medical specialty');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Include session token in the request
      const response = await fetch('/api/ai/generate-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specialty,
          difficulty,
          additionalInstructions,
          includeImages,
          numQuestions,
        }),
        // This ensures cookies (including auth session) are sent with the request
        credentials: 'include',
      });
      
      if (response.status === 401) {
        // Handle authentication error specifically
        setError('Authentication error: Please log in again');
        router.push('/login?callbackUrl=/cases/generate');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate case');
      }
      
      const data = await response.json();
      setGeneratedCase(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle saving the generated case
  const handleSaveCase = async () => {
    if (!generatedCase) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...generatedCase,
          isAIGenerated: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save case');
      }
      
      const data = await response.json();
      router.push(`/cases/${data.caseId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle regenerating the case
  const handleRegenerate = () => {
    setGeneratedCase(null);
  };
  
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Debug function to check session
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Session check:', data);
      alert(`Session status: ${data.authenticated ? 'Authenticated' : 'Not authenticated'}`);
    } catch (error) {
      console.error('Session check error:', error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Generate AI Medical Case</h1>
              <p className="text-muted-foreground mt-1">
                Let our AI create a custom medical case based on your specifications
              </p>
            </div>
          </div>
          
          {/* Debug button - remove in production */}
          <button
            onClick={checkSession}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Check Session
          </button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md">
            {error}
          </div>
        )}
        
        {!generatedCase ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Case Generator</h2>
              </div>
              <p className="text-muted-foreground">
                Specify the details below and our AI will generate a custom medical case for your learning needs.
              </p>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-medium">
                    Medical Specialty <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    placeholder="e.g., Cardiology, Neurology, Pediatrics"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    The medical field this case should focus on
                  </p>
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    How challenging the case should be
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={numQuestions}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    // Ensure value is a number and within range
                    if (isNaN(value)) {
                      setNumQuestions(1);
                    } else {
                      setNumQuestions(Math.min(Math.max(value, 1), 10));
                    }
                  }}
                  className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  How many questions to include (1-10)
                </p>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Additional Instructions (Optional)</label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full p-3 border border-input rounded-md bg-background min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Specify any particular aspects you'd like the case to focus on..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Any specific details or focus areas for the AI to consider
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="includeImages" className="font-medium">
                  Include relevant images (if available)
                </label>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-input rounded-md hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed flex items-center"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
                <h2 className="text-2xl font-bold">{generatedCase.title}</h2>
                <p className="text-muted-foreground mt-2">{generatedCase.description}</p>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                    {generatedCase.category}
                  </span>
                  {generatedCase.tags.map((tag: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-secondary/70 text-secondary-foreground rounded-md text-sm">
                      {tag}
                    </span>
                  ))}
                  {generatedCase.specialties.map((specialty: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-primary/20 text-primary rounded-md text-sm">
                      {specialty}
                    </span>
                  ))}
                  <span className={`px-2 py-1 rounded-md text-sm ${
                    generatedCase.difficulty === 'beginner' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                    generatedCase.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-500/20 text-red-700 dark:text-red-300'
                  }`}>
                    {generatedCase.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="prose max-w-none dark:prose-invert mb-8 border-b border-border pb-6">
                  <Markdown text={generatedCase.content} />
                </div>
                
                <h3 className="text-xl font-semibold mb-4">Questions</h3>
                <div className="space-y-6">
                  {generatedCase.answers.map((answer: any, index: number) => (
                    <div key={index} className="border border-border rounded-md overflow-hidden">
                      <div className="bg-secondary/20 p-4 border-b border-border">
                        <p className="font-medium">Q{index + 1}: {answer.question}</p>
                      </div>
                      <div className="p-4">
                        <p className="mb-2"><strong>Answer:</strong> {answer.answer}</p>
                        {answer.explanation && (
                          <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                            <strong>Explanation:</strong> {answer.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleRegenerate}
                className="px-6 py-2 border border-input rounded-md hover:bg-secondary/50 transition-colors flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleSaveCase}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Case
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GenerateCasePage; 