'use client';

import { useState, useEffect } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen,
  MessageSquare,
  Stethoscope,
  Database,
  ArrowRight,
  Plus,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import AIChat from '@/components/ai/AIChat';

interface Case {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  specialties: string[];
  isAIGenerated: boolean;
  createdAt: string;
}

export default function AILearningPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('chat');
  const [featuredCases, setFeaturedCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  // Fetch featured cases
  useEffect(() => {
    const fetchFeaturedCases = async () => {
      try {
        setLoadingCases(true);
        
        // Check if user is authenticated
        if (!user) {
          setFeaturedCases([]);
          return;
        }
        
        const response = await fetch('/api/cases?limit=3');
        if (!response.ok) {
          setFeaturedCases([]);
          return;
        }
        
        const data = await response.json();
        setFeaturedCases(data.cases || []);
      } catch (error) {
        console.error('Error fetching featured cases:', error);
        // Set empty array instead of throwing error
        setFeaturedCases([]);
      } finally {
        setLoadingCases(false);
      }
    };

    if (activeTab === 'cases') {
      fetchFeaturedCases();
    }
  }, [activeTab, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    redirect('/login');
  }

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
              {/* Use our enhanced AIChat component */}
              <AIChat />
            </TabsContent>

            <TabsContent value="cases" className="space-y-6">
              {/* Case Creation Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card 
                    className="p-6 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer h-full"
                    onClick={() => router.push('/cases/create')}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Plus className="h-6 w-6 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-semibold">Create Your Own Case</h3>
                    </div>
                    <p className="text-slate-400 mb-4">
                      Share your medical knowledge by creating detailed case studies with questions and answers.
                    </p>
                    <Button className="w-full mt-auto">
                      Create Case <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                </motion.div>
                
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card 
                    className="p-6 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer h-full"
                    onClick={() => router.push('/cases/generate')}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Sparkles className="h-6 w-6 text-purple-500" />
                      </div>
                      <h3 className="text-lg font-semibold">Generate AI Case</h3>
                    </div>
                    <p className="text-slate-400 mb-4">
                      Let our AI create customized medical cases based on your specifications and learning needs.
                    </p>
                    <Button className="w-full mt-auto" variant="secondary">
                      Generate Case <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                </motion.div>
              </div>
              
              {/* Featured Cases */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Featured Cases</h3>
                  <Button variant="link" onClick={() => router.push('/cases/browse')}>
                    View All Cases <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                {loadingCases ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-slate-400">Loading cases...</p>
                  </div>
                ) : featuredCases.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 mb-4">No cases available yet</p>
                    <div className="flex justify-center space-x-4">
                      <button 
                        onClick={() => router.push('/cases/create')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Create a Case
                      </button>
                      <button 
                        onClick={() => router.push('/cases/generate')}
                        className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors"
                      >
                        Generate with AI
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredCases.map((caseItem, index) => (
                      <motion.div
                        key={caseItem._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                      >
                        <Card 
                          className="p-6 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer"
                          onClick={() => router.push(`/cases/${caseItem._id}`)}
                        >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <BookOpen className="h-6 w-6 text-blue-500" />
                        </div>
                            <h3 className="text-lg font-semibold">{caseItem.title}</h3>
                      </div>
                          <p className="text-slate-400 mb-4">{caseItem.description}</p>
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md text-xs ${
                                caseItem.difficulty === 'beginner' ? 'bg-green-500/20 text-green-300' :
                                caseItem.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {caseItem.difficulty}
                              </span>
                        </div>
                            <div>
                              {new Date(caseItem.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button className="w-full mt-4">
                        Start Case <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Card>
                  </motion.div>
                ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4">
              <Card className="p-6 border-slate-800 bg-slate-900/50">
                <h3 className="text-xl font-semibold mb-4">Medical Knowledge Base</h3>
                <p className="text-slate-400 mb-6">
                  Access comprehensive medical information organized by specialty and topic.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer">
                    <h4 className="font-medium mb-2">Cardiology</h4>
                    <p className="text-sm text-slate-400">Heart diseases, ECG interpretation, treatments</p>
                  </Card>
                  <Card className="p-4 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer">
                    <h4 className="font-medium mb-2">Neurology</h4>
                    <p className="text-sm text-slate-400">Neurological disorders, assessments, therapies</p>
                  </Card>
                  <Card className="p-4 border-slate-800 bg-slate-900/50 hover:bg-slate-900/75 transition-all cursor-pointer">
                    <h4 className="font-medium mb-2">Pediatrics</h4>
                    <p className="text-sm text-slate-400">Child development, common conditions, vaccinations</p>
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