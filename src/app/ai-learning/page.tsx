'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Brain,
  Send,
  BookOpen,
  MessageSquare,
  Stethoscope,
  Database,
  ArrowRight,
  Search,
  Clock,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { queryAI, formatMedicalPrompt } from '@/lib/ai';

const exampleQueries = [
  "Explain the pathophysiology of Type 2 Diabetes",
  "What are the key differences between systolic and diastolic heart failure?",
  "Describe the mechanism of action of beta-blockers",
  "What are the clinical features of Kawasaki disease?"
];

const caseStudies = [
  {
    title: "Acute Coronary Syndrome",
    description: "58-year-old male presents with chest pain and shortness of breath",
    difficulty: "Intermediate",
    time: "15 mins",
    rating: 4.8
  },
  {
    title: "Pediatric Fever",
    description: "3-year-old presents with high fever and rash",
    difficulty: "Beginner",
    time: "10 mins",
    rating: 4.5
  },
  {
    title: "Neurological Assessment",
    description: "45-year-old with sudden onset weakness",
    difficulty: "Advanced",
    time: "20 mins",
    rating: 4.9
  }
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AILearningPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const prompt = formatMedicalPrompt(inputValue);
      const response = await queryAI({
        message: prompt,
        temperature: 0.7,
        maxTokens: 1000,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <MainNav />
      <main className="container pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">AI Learning Assistant</h1>
                <p className="text-slate-400">Your personal medical knowledge companion</p>
              </div>
              <TabsList className="bg-slate-900/50">
                <TabsTrigger value="chat" className="data-[state=active]:bg-blue-500">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="cases" className="data-[state=active]:bg-blue-500">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Cases
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="data-[state=active]:bg-blue-500">
                  <Database className="w-4 h-4 mr-2" />
                  Knowledge Base
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="space-y-4">
              {/* Chat Messages */}
              <Card className="p-6 border-slate-800 bg-slate-900/50 min-h-[400px] flex flex-col">
                <div className="flex-1 space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-400 mt-8">
                      <Brain className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                      <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                      <p className="mb-6">Ask any medical question or try one of the examples below</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {exampleQueries.map((query, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-start text-left"
                            onClick={() => setInputValue(query)}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            {query}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'assistant'
                              ? 'bg-slate-800 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          {message.content}
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-slate-800 rounded-lg p-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask a medical question..."
                    className="flex-1 bg-slate-800 border-slate-700"
                  />
                  <Button type="submit" disabled={isLoading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="cases" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caseStudies.map((study, index) => (
                  <motion.div
                    key={study.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <BookOpen className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold">{study.title}</h3>
                      </div>
                      <p className="text-slate-400 mb-4">{study.description}</p>
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {study.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {study.rating}
                        </div>
                      </div>
                      <Button className="w-full mt-4">
                        Start Case <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4">
              <Card className="p-6 border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-4 mb-6">
                  <Input
                    placeholder="Search medical knowledge base..."
                    className="flex-1 bg-slate-800 border-slate-700"
                  />
                  <Button>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-slate-800 bg-slate-800/50">
                    <h3 className="font-semibold mb-2">Disease Database</h3>
                    <p className="text-sm text-slate-400">
                      Comprehensive information about diseases, symptoms, and treatments
                    </p>
                  </Card>
                  <Card className="p-4 border-slate-800 bg-slate-800/50">
                    <h3 className="font-semibold mb-2">Drug Reference</h3>
                    <p className="text-sm text-slate-400">
                      Detailed medication information and interactions
                    </p>
                  </Card>
                  <Card className="p-4 border-slate-800 bg-slate-800/50">
                    <h3 className="font-semibold mb-2">Clinical Guidelines</h3>
                    <p className="text-sm text-slate-400">
                      Evidence-based protocols and best practices
                    </p>
                  </Card>
                  <Card className="p-4 border-slate-800 bg-slate-800/50">
                    <h3 className="font-semibold mb-2">Medical Calculators</h3>
                    <p className="text-sm text-slate-400">
                      Common clinical scoring systems and calculations
                    </p>
                  </Card>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 