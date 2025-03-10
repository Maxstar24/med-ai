'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MainNav } from '@/components/ui/navigation-menu';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Book, 
  Target, 
  Award, 
  Clock, 
  TrendingUp, 
  History, 
  Video, 
  Upload, 
  Plus, 
  BookOpen, 
  Lightbulb, 
  Calendar, 
  ArrowRight, 
  Activity,
  FileText,
  CheckCircle2,
  BarChart3,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Fetch recent cases
  useEffect(() => {
    const fetchRecentCases = async () => {
      try {
        const response = await fetch('/api/cases?limit=3');
        const data = await response.json();
        setRecentCases(data.cases || []);
      } catch (error) {
        console.error('Error fetching recent cases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentCases();
  }, []);

  // Get time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto p-6">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Header Section */}
          <motion.div 
            variants={fadeIn}
            className="relative mb-8 p-8 rounded-xl overflow-hidden bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20"
          >
            <div className="absolute inset-0 bg-grid-white dark:bg-grid-dark [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-2">
                {getGreeting()}, {session?.user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Welcome to your personalized medical learning dashboard. Track your progress, access learning resources, and continue your medical education journey.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button asChild>
                  <Link href="/ai-learning">
                    Ask AI Assistant <Zap className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/cases/browse">
                    Browse Cases <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            variants={fadeIn}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card className="p-6 border-border bg-card hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Goal</p>
                  <p className="text-2xl font-bold">75%</p>
                </div>
              </div>
              <Progress value={75} className="mt-4" />
            </Card>

            <Card className="p-6 border-border bg-card hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">7 days</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Study Time</p>
                  <p className="text-2xl font-bold">2.5h</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border bg-card hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">+15%</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <motion.div 
              variants={fadeIn}
              className="lg:col-span-2 space-y-6"
            >
              {/* Tabs Section */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Learning Resources</CardTitle>
                  <CardDescription>Access your learning materials and tools</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="features" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="features">Key Features</TabsTrigger>
                      <TabsTrigger value="recent">Recent Cases</TabsTrigger>
                      <TabsTrigger value="recommended">Recommended</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="features" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/ai-learning" className="block">
                          <Card className="p-6 hover:shadow-lg transition-shadow h-full border-border bg-card">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <Brain className="w-6 h-6 text-primary" />
                              </div>
                              <h2 className="text-xl font-semibold">AI Learning Assistant</h2>
                            </div>
                            <p className="text-muted-foreground mb-4">
                              Get instant answers to your medical questions and engage in case-based learning.
                            </p>
                            <Button className="w-full">Start Learning</Button>
                          </Card>
                        </Link>

                        <Link href="/quizzes" className="block">
                          <Card className="p-6 hover:shadow-lg transition-shadow h-full border-border bg-card">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <Book className="w-6 h-6 text-primary" />
                              </div>
                              <h2 className="text-xl font-semibold">Practice Quizzes</h2>
                            </div>
                            <p className="text-muted-foreground mb-4">
                              Test your knowledge with our adaptive quizzes and track your progress.
                            </p>
                            <Button className="w-full">Take a Quiz</Button>
                          </Card>
                        </Link>

                        <Link href="/cases/browse" className="block">
                          <Card className="p-6 hover:shadow-lg transition-shadow h-full border-border bg-card">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <BookOpen className="w-6 h-6 text-primary" />
                              </div>
                              <h2 className="text-xl font-semibold">Medical Cases</h2>
                            </div>
                            <p className="text-muted-foreground mb-4">
                              Browse through real medical cases and enhance your diagnostic skills.
                            </p>
                            <Button className="w-full">Browse Cases</Button>
                          </Card>
                        </Link>

                        <Link href="/quizzes/history" className="block">
                          <Card className="p-6 hover:shadow-lg transition-shadow h-full border-border bg-card">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <History className="w-6 h-6 text-primary" />
                              </div>
                              <h2 className="text-xl font-semibold">Quiz History</h2>
                            </div>
                            <p className="text-muted-foreground mb-4">
                              Review your past quiz attempts and track your improvement over time.
                            </p>
                            <Button className="w-full">View History</Button>
                          </Card>
                        </Link>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="recent">
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <Card key={i} className="p-4 border-border bg-card">
                              <div className="flex gap-4">
                                <div className="w-16 h-16 bg-muted rounded-md animate-pulse"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                                  <div className="flex gap-2">
                                    <div className="h-6 w-16 bg-muted rounded-full animate-pulse"></div>
                                    <div className="h-6 w-16 bg-muted rounded-full animate-pulse"></div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : recentCases.length > 0 ? (
                        <div className="space-y-4">
                          {recentCases.map((caseItem: any) => (
                            <Link href={`/cases/${caseItem._id}`} key={caseItem._id}>
                              <Card className="p-4 hover:shadow-md transition-all border-border bg-card">
                                <div className="flex gap-4">
                                  <div className="p-2 rounded-lg bg-primary/10 h-16 w-16 flex items-center justify-center">
                                    <BookOpen className="h-8 w-8 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-semibold">{caseItem.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{caseItem.description}</p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge variant="secondary">{caseItem.category}</Badge>
                                      <Badge variant="outline" className={
                                        caseItem.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        caseItem.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                      }>
                                        {caseItem.difficulty.charAt(0).toUpperCase() + caseItem.difficulty.slice(1)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          ))}
                          <div className="text-center">
                            <Button asChild variant="outline">
                              <Link href="/cases/browse">
                                View All Cases <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No cases yet</h3>
                          <p className="text-muted-foreground mb-4">Start exploring medical cases to enhance your knowledge</p>
                          <Button asChild>
                            <Link href="/cases/browse">Browse Cases</Link>
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="recommended">
                      <div className="space-y-4">
                        <Card className="p-4 hover:shadow-md transition-all border-border bg-card">
                          <div className="flex gap-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 h-16 w-16 flex items-center justify-center">
                              <Lightbulb className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">Cardiovascular Examination Techniques</h3>
                              <p className="text-sm text-muted-foreground">Recommended based on your recent activity</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">Cardiology</Badge>
                                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  Beginner
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-4 hover:shadow-md transition-all border-border bg-card">
                          <div className="flex gap-4">
                            <div className="p-2 rounded-lg bg-purple-500/10 h-16 w-16 flex items-center justify-center">
                              <Lightbulb className="h-8 w-8 text-purple-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">Neurological Differential Diagnosis</h3>
                              <p className="text-sm text-muted-foreground">Popular among students in your field</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">Neurology</Badge>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                  Intermediate
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-4 hover:shadow-md transition-all border-border bg-card">
                          <div className="flex gap-4">
                            <div className="p-2 rounded-lg bg-green-500/10 h-16 w-16 flex items-center justify-center">
                              <Lightbulb className="h-8 w-8 text-green-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">Pharmacology of Antibiotics</h3>
                              <p className="text-sm text-muted-foreground">Trending topic in medical education</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">Pharmacy</Badge>
                                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  Beginner
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Frequently used tools and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button className="flex flex-col h-auto py-4 gap-2" asChild>
                      <Link href="/quizzes">
                        <Plus className="h-5 w-5" />
                        <span>New Quiz</span>
                      </Link>
                    </Button>
                    
                    <Button className="flex flex-col h-auto py-4 gap-2" variant="outline" asChild>
                      <Link href="/cases/create">
                        <FileText className="h-5 w-5" />
                        <span>Create Case</span>
                      </Link>
                    </Button>
                    
                    <Button className="flex flex-col h-auto py-4 gap-2" variant="outline" asChild>
                      <Link href="/ai-learning">
                        <Brain className="h-5 w-5" />
                        <span>AI Chat</span>
                      </Link>
                    </Button>
                    
                    <Button className="flex flex-col h-auto py-4 gap-2" variant="outline" asChild>
                      <Link href="/cases/browse">
                        <BookOpen className="h-5 w-5" />
                        <span>Browse Cases</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column */}
            <motion.div 
              variants={fadeIn}
              className="space-y-6"
            >
              {/* Study Schedule */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Today's Schedule</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/schedule">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 h-10 w-10 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Cardiology Review</p>
                        <p className="text-sm text-muted-foreground">9:00 AM - 10:30 AM</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 h-10 w-10 flex items-center justify-center shrink-0">
                        <Book className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Pharmacology Quiz</p>
                        <p className="text-sm text-muted-foreground">1:00 PM - 2:00 PM</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 h-10 w-10 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Anatomy Video Lecture</p>
                        <p className="text-sm text-muted-foreground">4:00 PM - 5:30 PM</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <Button variant="ghost" size="sm">View All</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 relative">
                    <div className="absolute top-0 bottom-0 left-5 w-px bg-border"></div>
                    
                    <div className="flex gap-3 relative">
                      <div className="p-2 rounded-full bg-green-500/10 h-10 w-10 flex items-center justify-center z-10">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Completed Quiz</p>
                        <p className="text-sm text-muted-foreground">Pharmacology Basics • 85% Score</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 relative">
                      <div className="p-2 rounded-full bg-blue-500/10 h-10 w-10 flex items-center justify-center z-10">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Viewed Case</p>
                        <p className="text-sm text-muted-foreground">Atropine Antidotes</p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 relative">
                      <div className="p-2 rounded-full bg-purple-500/10 h-10 w-10 flex items-center justify-center z-10">
                        <Brain className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">AI Learning Session</p>
                        <p className="text-sm text-muted-foreground">Discussed Neurological Disorders</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Summary */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Learning Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Cardiology</span>
                        <span className="text-sm text-muted-foreground">65%</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Pharmacology</span>
                        <span className="text-sm text-muted-foreground">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Neurology</span>
                        <span className="text-sm text-muted-foreground">40%</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Anatomy</span>
                        <span className="text-sm text-muted-foreground">70%</span>
                      </div>
                      <Progress value={70} className="h-2" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/progress">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Detailed Analytics
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 