'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

// Get time of day greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Define the Case type
interface Case {
  id: string;
  title: string;
  category: string;
  description?: string;
  difficulty?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication effect - must be the first useEffect
  useEffect(() => {
    console.log("Dashboard auth status:", status);
    if (status === 'unauthenticated') {
      console.log("User is not authenticated, redirecting to login");
      window.location.href = '/login';
    }
  }, [status]);

  // Data fetching effect - must be the second useEffect
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

    if (status === 'authenticated') {
      fetchRecentCases();
    }
  }, [status]);

  // If still loading session or not authenticated, show loading
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div variants={fadeIn}>
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-blue-500" />
                    Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">68%</div>
                  <Progress value={68} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    17 of 25 modules completed
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Book className="mr-2 h-5 w-5 text-green-500" />
                    Cases Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">24</div>
                  <Progress value={48} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    24 of 50 cases completed
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Target className="mr-2 h-5 w-5 text-red-500" />
                    Accuracy Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">82%</div>
                  <Progress value={82} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Above average by 7%
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Award className="mr-2 h-5 w-5 text-amber-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">7</div>
                  <Progress value={35} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    7 of 20 badges earned
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="learning">Learning Path</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <motion.div variants={fadeIn} className="lg:col-span-2">
                  <Card className="border-none shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <History className="mr-2 h-5 w-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Your latest learning activities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Completed Case: Acute Appendicitis</h4>
                            <Badge variant="outline">Case</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Diagnosed correctly with 92% accuracy</p>
                          <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Watched: Advanced ECG Interpretation</h4>
                            <Badge variant="outline">Video</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Completed 45-minute lecture</p>
                          <p className="text-xs text-muted-foreground mt-1">Yesterday</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Completed Quiz: Respiratory Disorders</h4>
                            <Badge variant="outline">Quiz</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Scored 85% (17/20 correct)</p>
                          <p className="text-xs text-muted-foreground mt-1">2 days ago</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/activity">
                          View all activity <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                {/* Recent Cases */}
                <motion.div variants={fadeIn}>
                  <Card className="border-none shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Book className="mr-2 h-5 w-5 text-primary" />
                        Recent Cases
                      </CardTitle>
                      <CardDescription>Continue where you left off</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loading ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      ) : recentCases.length > 0 ? (
                        recentCases.map((caseItem, index) => (
                          <div key={index} className="flex flex-col space-y-2 p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{caseItem.title}</h4>
                              <Badge>{caseItem.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{caseItem.description?.substring(0, 60)}...</p>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/cases/${caseItem.id}`}>
                                Continue Case
                              </Link>
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <p>No recent cases found</p>
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <Link href="/cases/browse">Browse Cases</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/cases/browse">
                          Browse all cases <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="learning">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={fadeIn} className="lg:col-span-2">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                        Your Learning Path
                      </CardTitle>
                      <CardDescription>Personalized curriculum based on your progress</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-[2px] before:bg-muted">
                          <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="space-y-2 pb-8">
                            <h4 className="font-medium">Fundamentals of Clinical Diagnosis</h4>
                            <p className="text-sm text-muted-foreground">Completed on May 15, 2023</p>
                            <div className="flex items-center">
                              <Badge variant="secondary" className="mr-2">Module</Badge>
                              <Badge variant="outline">100% Complete</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-[2px] before:bg-muted">
                          <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="space-y-2 pb-8">
                            <h4 className="font-medium">Advanced Cardiac Assessment</h4>
                            <p className="text-sm text-muted-foreground">In progress - 68% complete</p>
                            <Progress value={68} className="h-2 mt-2 mb-2" />
                            <div className="flex items-center">
                              <Badge variant="secondary" className="mr-2">Module</Badge>
                              <Badge variant="outline">Current</Badge>
                            </div>
                            <Button size="sm" className="mt-2" asChild>
                              <Link href="/learning/cardiac">Continue Learning</Link>
                            </Button>
                          </div>
                        </div>

                        <div className="relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-[2px] before:bg-muted">
                          <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Neurological Examination Techniques</h4>
                            <p className="text-sm text-muted-foreground">Upcoming module</p>
                            <div className="flex items-center">
                              <Badge variant="secondary" className="mr-2">Module</Badge>
                              <Badge variant="outline">Locked</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/learning">
                          View full curriculum <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-primary" />
                        Upcoming Deadlines
                      </CardTitle>
                      <CardDescription>Stay on track with your learning goals</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-amber-500/10 p-2 rounded-full">
                          <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Cardiac Assessment Quiz</h4>
                          <p className="text-sm text-muted-foreground mt-1">Due in 2 days</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-blue-500/10 p-2 rounded-full">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Case Study: Respiratory Distress</h4>
                          <p className="text-sm text-muted-foreground mt-1">Due in 5 days</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="bg-green-500/10 p-2 rounded-full">
                          <BarChart3 className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Monthly Progress Review</h4>
                          <p className="text-sm text-muted-foreground mt-1">Due in 1 week</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/calendar">
                          View calendar <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="resources">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div variants={fadeIn}>
                  <Card className="border-none shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Video className="mr-2 h-5 w-5 text-primary" />
                        Video Lectures
                      </CardTitle>
                      <CardDescription>Curated educational videos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="group relative rounded-lg overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          <Image 
                            src="/images/video-thumbnail-1.jpg" 
                            alt="ECG Interpretation" 
                            fill 
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="sm">
                              Watch Now
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-medium mt-2">Advanced ECG Interpretation</h4>
                        <p className="text-sm text-muted-foreground">45 min • Dr. Sarah Chen</p>
                      </div>

                      <div className="group relative rounded-lg overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          <Image 
                            src="/images/video-thumbnail-2.jpg" 
                            alt="Respiratory Assessment" 
                            fill 
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="sm">
                              Watch Now
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-medium mt-2">Respiratory Assessment Techniques</h4>
                        <p className="text-sm text-muted-foreground">38 min • Dr. Michael Johnson</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/resources/videos">
                          Browse all videos <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <Card className="border-none shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BookOpen className="mr-2 h-5 w-5 text-primary" />
                        Clinical Guidelines
                      </CardTitle>
                      <CardDescription>Evidence-based practice resources</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium">ACLS Guidelines 2023</h4>
                        <p className="text-sm text-muted-foreground mt-1">American Heart Association</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Download PDF
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium">Sepsis Management Protocol</h4>
                        <p className="text-sm text-muted-foreground mt-1">Surviving Sepsis Campaign</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Download PDF
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium">Stroke Assessment & Management</h4>
                        <p className="text-sm text-muted-foreground mt-1">American Stroke Association</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Download PDF
                        </Button>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/resources/guidelines">
                          View all guidelines <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <Card className="border-none shadow-md h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Upload className="mr-2 h-5 w-5 text-primary" />
                        Upload Resources
                      </CardTitle>
                      <CardDescription>Share your own learning materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <h4 className="font-medium">Drag & drop files here</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                          Support for PDF, DOCX, PPTX, JPG, PNG
                        </p>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" /> Upload File
                        </Button>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium mb-2">Recently Uploaded</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm">Clinical_Notes_2023.pdf</span>
                            </div>
                            <Badge variant="outline">PDF</Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm">Cardiac_Case_Study.docx</span>
                            </div>
                            <Badge variant="outline">DOCX</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="ml-auto" asChild>
                        <Link href="/resources/my-uploads">
                          Manage uploads <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
} 