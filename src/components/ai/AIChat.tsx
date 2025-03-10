import React, { useState, useRef, useEffect } from 'react';
import Markdown from '@/components/Markdown';

const AIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const responseContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      console.log('Sending request:', { prompt, stream: true });

      // Use streaming API
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'medical',
          prompt,
          stream: true, // Request streaming response
        }),
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
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the response');
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

  return (
    <div className="relative w-full h-[600px] max-w-4xl mx-auto">
      {/* Chat container with fixed height and scrollable content */}
      <div className="absolute inset-0 flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {/* Scrollable response area */}
        <div 
          ref={responseContainerRef}
          className="flex-1 overflow-y-auto p-6 custom-scrollbar"
        >
          {response ? (
            <div className="rounded-md bg-card">
              <Markdown 
                text={response} 
                className="prose max-w-none dark:prose-invert" 
              />
              {isStreaming && (
                <div className="mt-4 text-primary flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></span>
                  <span>AI is thinking...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Ask a medical question to get started</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 mt-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded">
              <p>{error}</p>
            </div>
          )}
        </div>
        
        {/* Input area - fixed at bottom */}
        <div className="border-t border-border p-4 bg-background">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your medical question here..."
                className="w-full p-3 border border-input rounded-md min-h-[100px] bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
              <div className="flex space-x-3">
                <button 
                  type="submit" 
                  disabled={loading || !prompt.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed flex-grow transition-colors"
                >
                  {loading ? 'Processing...' : 'Submit'}
                </button>
                {loading && (
                  <button 
                    type="button" 
                    onClick={handleCancel}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChat;