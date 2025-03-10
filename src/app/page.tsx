'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Brain, 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  Calendar, 
  Video, 
  FileAudio, 
  ArrowRight,
  Sparkles,
  Clock,
  Target,
  Share2
} from "lucide-react";
import { MainNav } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const float = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const features = [
  {
    title: "AI Learning Assistant",
    description: "Get instant AI-powered responses for medical concepts, diseases, treatments, and clinical guidelines.",
    icon: Brain,
    delay: 0.2
  },
  {
    title: "Case-Based Learning",
    description: "Learn through interactive case studies with step-by-step diagnostic and treatment pathways.",
    icon: BookOpen,
    delay: 0.3
  },
  {
    title: "Smart Flashcards",
    description: "Upload your lecture notes and let AI create structured flashcards for efficient learning.",
    icon: GraduationCap,
    delay: 0.4
  },
  {
    title: "Duolingo-Style Practice",
    description: "Engage with adaptive quizzes, earn XP points, and maintain learning streaks.",
    icon: Trophy,
    delay: 0.5
  }
];

const additionalFeatures = [
  {
    title: "Personalized Study Plans",
    description: "AI-generated schedules based on your exam dates with progress tracking and weak area suggestions.",
    icon: Calendar,
    highlights: ["Smart scheduling", "Progress tracking", "Weak area analysis"]
  },
  {
    title: "Spaced Repetition",
    description: "TikTok-style short videos for quick revision with gamified engagement features.",
    icon: Video,
    highlights: ["Quick video lessons", "Gamified learning", "Social features"]
  },
  {
    title: "Content Summarization",
    description: "Upload any medical content and get AI-powered summaries with key point extraction.",
    icon: FileAudio,
    highlights: ["Text summarization", "Audio generation", "Key point extraction"]
  }
];

export default function Home() {
  return (
    <>
      <MainNav />
      <main className="flex min-h-screen flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 pt-36 md:px-8 md:pt-44">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeIn}
              className="text-center"
            >
              <motion.div className="relative inline-block">
                <motion.h1
                  className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl relative z-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Your AI Medical
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {" "}Learning Companion
                  </span>
                </motion.h1>
                <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full z-0" />
              </motion.div>
              <motion.p
                className="mt-6 text-lg leading-8 text-gray-300 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                An AI-powered learning assistant designed for medical students. Master concepts faster with
                interactive study experiences, personalized plans, and innovative learning tools.
              </motion.p>
              <motion.div
                className="mt-10 flex items-center justify-center gap-x-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Button size="lg" className="group" onClick={() => window.location.href = '/cases/browse'}>
                  Browse Cases
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.location.href = '/ai-learning'}>
                  AI Learning
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Core Features
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Everything you need to excel in your medical studies, powered by advanced AI technology.
            </p>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: feature.delay }}
              >
                <Card className="relative overflow-hidden border-slate-800 bg-slate-950/50 p-6 hover:border-slate-700 transition-colors duration-300">
                  <motion.div
                    variants={float}
                    animate="animate"
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900"
                  >
                    <feature.icon className="h-6 w-6 text-blue-500" />
                  </motion.div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-gray-400">{feature.description}</p>
                  {feature.title === "Case-Based Learning" && (
                    <Button 
                      variant="link" 
                      className="mt-4 p-0 text-blue-500 flex items-center"
                      onClick={() => window.location.href = '/cases/browse'}
                    >
                      Browse Cases
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                  {feature.title === "AI Learning Assistant" && (
                    <Button 
                      variant="link" 
                      className="mt-4 p-0 text-blue-500 flex items-center"
                      onClick={() => window.location.href = '/ai-learning'}
                    >
                      Try AI Learning
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Additional Features Section */}
        <section className="bg-slate-950/50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 * index }}
                viewport={{ once: true }}
                className={cn(
                  "flex flex-col gap-8 mb-20 last:mb-0 lg:mb-32 lg:flex-row lg:items-center",
                  index % 2 === 1 && "lg:flex-row-reverse"
                )}
              >
                <div className="flex-1">
                  <motion.div
                    variants={float}
                    animate="animate"
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-6"
                  >
                    <feature.icon className="h-8 w-8 text-blue-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-gray-300 mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 lg:flex lg:justify-center">
                  <Card className="relative w-full max-w-md overflow-hidden border-slate-800 bg-slate-900/50 p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
                    <div className="relative grid grid-cols-2 gap-4">
                      {[Clock, Target, Share2, Sparkles].map((Icon, i) => (
                        <motion.div
                          key={i}
                          variants={float}
                          animate="animate"
                          className="flex h-20 items-center justify-center rounded-lg bg-slate-800/50"
                        >
                          <Icon className="h-8 w-8 text-blue-500" />
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
