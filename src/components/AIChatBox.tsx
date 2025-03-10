import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Markdown from '@/components/Markdown';

interface AIChatBoxProps {
  onClose?: () => void;
}

export function AIChatBox({ onClose }: AIChatBoxProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  return (
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
        
        <div 
          ref={chatContainerRef}
          className="h-[300px] overflow-y-auto p-2 border rounded-md bg-muted"
        >
          {response && <Markdown text={response} />}
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
  );
}