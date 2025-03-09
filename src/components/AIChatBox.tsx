import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import MarkdownIt from 'markdown-it';
import 'tailwindcss/tailwind.css';

// Initialize markdown-it with all features enabled
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

// Add inline CSS for additional styling
const markdownStyles = `
  .markdown-content h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content h3 {
    font-size: 1.1rem;
    font-weight: bold;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content p {
    margin-bottom: 0.5rem;
  }
  
  .markdown-content ul, .markdown-content ol {
    margin-left: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .markdown-content ul {
    list-style-type: disc;
  }
  
  .markdown-content ol {
    list-style-type: decimal;
  }
  
  .markdown-content li {
    margin-bottom: 0.25rem;
  }
  
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    table-layout: fixed;
  }
  
  .markdown-content table th {
    background-color: #f1f1f1;
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  .markdown-content table td {
    border: 1px solid #ddd;
    padding: 8px;
    word-wrap: break-word;
  }
  
  .markdown-content code {
    background-color: #f1f1f1;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .markdown-content pre {
    background-color: #f1f1f1;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 4px;
  }
  
  .markdown-content strong {
    font-weight: bold;
  }
  
  .markdown-content em {
    font-style: italic;
  }
`;

interface AIChatBoxProps {
  onClose?: () => void;
}

export function AIChatBox({ onClose }: AIChatBoxProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat container when response changes
  useEffect(() => {
    if (chatContainerRef.current && response) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', 'medical');
      formData.append('prompt', prompt);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResponse(data.text);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Render markdown content
  const renderMarkdown = (content: string) => {
    return { __html: md.render(content) };
  };

  return (
    <>
      {/* Add the style tag with markdown styles */}
      <style>{markdownStyles}</style>
      
      <Card className="fixed bottom-4 right-4 w-[400px] p-4 shadow-xl">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
          
          {/* Chat container with fixed height and scroll */}
          <div 
            ref={chatContainerRef}
            className="h-[300px] overflow-y-auto p-2 border rounded-md bg-muted"
          >
            {response && (
              <div 
                className="markdown-content" 
                dangerouslySetInnerHTML={renderMarkdown(response)}
              />
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="text-sm"
              accept=".pdf,.doc,.docx,.txt"
            />
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Ask me anything about medicine..."
              value={prompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Send'}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}