'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UploadDocument } from '@/components/upload-document';
import { motion } from 'framer-motion';
import {
  FileText,
  Brain,
  Lightbulb,
  BookOpen,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface GeneratedQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
  tags?: string[];
}

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [savedToQuizzes, setSavedToQuizzes] = useState(false);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const handleQuestionsGenerated = (newQuestions: GeneratedQuestion[]) => {
    setQuestions(newQuestions);
    setActiveTab('preview');
    setSavedToQuizzes(false);
  };

  const handleSaveQuiz = async () => {
    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          title: 'Generated Quiz', // You could add a title input
          description: 'Generated from uploaded document',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiz');
      }

      setSavedToQuizzes(true);
    } catch (error) {
      console.error('Error saving quiz:', error);
      // Show error message to user
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <MainNav />
      <main className="container pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Generate Questions</h1>
              <p className="text-slate-400">Upload your study material and let AI create practice questions</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900/50 mb-8">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-500">
                <FileText className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-blue-500" disabled={questions.length === 0}>
                <Brain className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <UploadDocument onQuestionsGenerated={handleQuestionsGenerated} />
            </TabsContent>

            <TabsContent value="preview">
              {questions.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questions.map((question) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="p-6 border-slate-800 bg-slate-900/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                              {question.type === 'multiple-choice' ? (
                                <Lightbulb className="h-5 w-5 text-blue-500" />
                              ) : question.type === 'true-false' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <BookOpen className="h-5 w-5 text-purple-500" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium capitalize">{question.type}</span>
                              {question.topic && (
                                <span className="text-xs text-slate-400 ml-2">• {question.topic}</span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm mb-4">{question.question}</p>

                          {question.type === 'multiple-choice' && question.options && (
                            <div className="space-y-2 mb-4">
                              {question.options.map((option, index) => (
                                <div
                                  key={index}
                                  className={`p-2 rounded text-sm ${
                                    index === question.correctAnswer
                                      ? 'bg-green-500/10 text-green-500'
                                      : 'bg-slate-800'
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="text-xs text-slate-400">
                            <span className="font-medium">Explanation: </span>
                            {question.explanation}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveQuiz}
                      disabled={savedToQuizzes}
                      className="flex items-center gap-2"
                    >
                      {savedToQuizzes ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Saved to Quizzes
                        </>
                      ) : (
                        <>
                          Save as Quiz
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 