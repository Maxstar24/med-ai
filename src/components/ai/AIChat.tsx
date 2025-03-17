import React, { useState, useRef, useEffect } from 'react';
import Markdown from '@/components/Markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Image as ImageIcon, 
  X, 
  Send, 
  Loader2, 
  Brain, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Effect to scroll to bottom when response updates
  useEffect(() => {
    if (responseContainerRef.current && response) {
      responseContainerRef.current.scrollTop = responseContainerRef.current.scrollHeight;
    }
  }, [response]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      const fileType = file.type;
      const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      
      if (!supportedImageTypes.includes(fileType)) {
        setError(`Unsupported image format: ${fileType}. Please use JPG or PNG images.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Please use an image smaller than 5MB.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedImage(file);
      setError(''); // Clear any previous errors
    }
  };
  
  // Handle PDF selection
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      if (file.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
        return;
      }
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('PDF file is too large. Please use a PDF smaller than 10MB.');
        if (pdfInputRef.current) {
          pdfInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedPdf(file);
      setError(''); // Clear any previous errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');
    setIsStreaming(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      console.log('Preparing request with:', { 
        prompt, 
        stream: true,
        hasImage: !!selectedImage,
        hasPdf: !!selectedPdf
      });

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('stream', 'true');
      formData.append('action', 'medical');
      
      // Add files if selected
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      if (selectedPdf) {
        formData.append('pdf', selectedPdf);
      }

      // Use streaming API
      const res = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      // Handle streaming response
      if (res.body) {
        console.log('Received streaming response, starting to read...');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Stream complete');
              break;
            }
            
            // Decode and append the chunk
            const chunk = decoder.decode(value, { stream: true });
            console.log('Received chunk:', chunk.length, 'bytes');
            accumulatedResponse += chunk;
            setResponse(accumulatedResponse);
          }
        } catch (readError) {
          console.error('Error reading stream:', readError);
          if (readError instanceof Error && readError.name !== 'AbortError') {
            throw readError;
          }
        } finally {
          setIsStreaming(false);
        }
      } else {
        // Fallback for browsers that don't support streaming
        console.log('Streaming not supported, falling back to JSON response');
        const data = await res.json();
        console.log('Received response:', data);

        if (data.error) {
          setError(data.error);
        } else if (!data.text) {
          setError('Received empty response from AI service');
        } else {
          setResponse(data.text);
        }
        setIsStreaming(false);
      }
    } catch (err) {
      // Don't show error if it was due to an abort
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error in AI chat:', err);
        
        // Format error message for better user experience
        let errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching the response';
        
        // Handle specific error cases
        if (errorMessage.includes('Unsupported MIME type') || errorMessage.includes('Unsupported file type')) {
          errorMessage = 'The file format you uploaded is not supported. Please use JPG or PNG for images, or PDF for documents.';
        } else if (errorMessage.includes('Candidate was blocked due to SAFETY')) {
          errorMessage = 'The AI could not process this request due to safety guidelines. Please try a different query or image.';
        }
        
        setError(errorMessage);
      }
      setIsStreaming(false);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearPdf = () => {
    setSelectedPdf(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  // Example medical queries for empty state
  const exampleQueries = [
    "What are the key differences between systolic and diastolic heart failure?",
    "Explain the pathophysiology of Type 2 Diabetes",
    "What are the clinical features of Kawasaki disease?",
    "Describe the mechanism of action of beta-blockers"
  ];

  return (
    <div className="relative w-full h-[600px] max-w-4xl mx-auto">
      <Card className="h-full overflow-hidden border-border shadow-md">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-primary/10 mr-3">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Medical AI Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  Powered by Gemini 2.0 Pro
                </p>
              </div>
              <Badge variant="outline" className="ml-auto bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            </div>
          </div>
          
          {/* Chat area */}
          <div 
            ref={responseContainerRef}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar"
          >
            <AnimatePresence>
              {response ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-lg bg-card"
                >
                  <CardContent className="p-0">
                    <Markdown 
                      text={response} 
                      className="prose max-w-none dark:prose-invert" 
                    />
                    {isStreaming && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-primary flex items-center"
                      >
                        <div className="flex space-x-1">
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, repeatDelay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.2, repeatDelay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.4, repeatDelay: 0.2 }}
                          />
                        </div>
                        <span className="ml-2 text-sm">AI is thinking...</span>
                      </motion.div>
                    )}
                  </CardContent>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  <div className="max-w-md">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, 0, -5, 0]
                      }}
                      transition={{ 
                        duration: 5,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="mx-auto mb-6 p-3 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center"
                    >
                      <Brain className="h-8 w-8 text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-3">Ask a Medical Question</h3>
                    <p className="text-muted-foreground mb-6">
                      Get evidence-based answers to your medical questions or upload images and documents for analysis
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {exampleQueries.map((query, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Button 
                            variant="outline" 
                            className="w-full justify-start text-left"
                            onClick={() => setPrompt(query)}
                          >
                            <span className="truncate">{query}</span>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 mt-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md flex items-start"
                >
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Input area */}
          <div className="border-t border-border p-4 bg-card">
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your medical question here..."
                  className="w-full min-h-[100px] resize-none focus-visible:ring-primary"
                  disabled={loading}
                />
                
                {/* File upload area */}
                <AnimatePresence>
                  {(selectedImage || selectedPdf) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 overflow-hidden"
                    >
                      {/* Selected image preview */}
                      {selectedImage && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative flex items-center p-2 bg-secondary/20 rounded-md"
                        >
                          <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm truncate max-w-[200px]">{selectedImage.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 ml-1 rounded-full"
                            onClick={clearImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      )}
                      
                      {/* Selected PDF preview */}
                      {selectedPdf && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative flex items-center p-2 bg-secondary/20 rounded-md"
                        >
                          <FileText className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-sm truncate max-w-[200px]">{selectedPdf.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 ml-1 rounded-full"
                            onClick={clearPdf}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          className="rounded-full"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                            disabled={loading}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upload medical image</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => pdfInputRef.current?.click()}
                          disabled={loading}
                          className="rounded-full"
                        >
                          <FileText className="h-4 w-4" />
                          <input 
                            type="file" 
                            ref={pdfInputRef}
                            onChange={handlePdfChange}
                            accept=".pdf"
                            className="hidden"
                            disabled={loading}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upload PDF document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="flex-1 flex justify-end">
                    {loading && (
                      <Button 
                        type="button" 
                        variant="destructive"
                        onClick={handleCancel}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={loading || (!prompt.trim() && !selectedImage && !selectedPdf)}
                      className="px-4 py-2 gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Send
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIChat;