'use client';

import { MainNav } from "@/components/ui/navigation-menu";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, BookOpen, Sparkles, MessageSquare, Database, Stethoscope, ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const features = [
  {
    title: "Medical Knowledge Base",
    description: "Access comprehensive medical information from trusted sources",
    icon: Database,
    delay: 0.2
  },
  {
    title: "Clinical Guidelines",
    description: "Get up-to-date clinical guidelines and treatment protocols",
    icon: Stethoscope,
    delay: 0.3
  },
  {
    title: "Interactive Learning",
    description: "Engage in dynamic conversations about medical concepts",
    icon: MessageSquare,
    delay: 0.4
  }
];

const exampleQueries = [
  "Explain the pathophysiology of Type 2 Diabetes",
  "What are the key differences between systolic and diastolic heart failure?",
  "Describe the mechanism of action of beta-blockers",
  "What are the clinical features of Kawasaki disease?"
];

const demoResponses = [
  {
    question: "What are the key differences between systolic and diastolic heart failure?",
    answer: "Systolic heart failure occurs when the heart muscle can't contract with enough force, leading to reduced ejection fraction. Diastolic heart failure happens when the heart can't properly fill with blood due to stiff ventricles. Want to learn more? Sign in to explore detailed explanations and clinical cases.",
  },
  {
    question: "Explain the pathophysiology of Type 2 Diabetes",
    answer: "Type 2 Diabetes involves insulin resistance and decreased insulin production. This leads to impaired glucose uptake and elevated blood sugar levels. Sign in to access comprehensive explanations with visual aids and clinical correlations.",
  }
];

export default function AILearning() {
  const [query, setQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(0);

  const handleAskDemo = () => {
    if (query === demoResponses[0].question) {
      setSelectedDemo(0);
      setShowPreview(true);
    } else if (query === demoResponses[1].question) {
      setSelectedDemo(1);
      setShowPreview(true);
    }
  };

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
                  AI Learning
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {" "}Assistant
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
                Your personal AI tutor for medical education. Ask questions, explore concepts,
                and deepen your understanding of medicine through interactive conversations.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Chat Interface */}
        <section className="mx-auto max-w-4xl w-full px-6 py-12">
          <Card className="relative border-slate-800 bg-slate-950/50 p-6">
            <div className="flex flex-col space-y-4">
              <div className="min-h-[300px] rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                {!showPreview ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <p>Try our demo questions below!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <Brain className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-400">Question</p>
                        <p className="mt-1">{demoResponses[selectedDemo].question}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-400">Answer</p>
                        <p className="mt-1">{demoResponses[selectedDemo].answer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Try our demo questions below..."
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAskDemo}>
                  Ask
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[demoResponses[0].question, demoResponses[1].question].map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={() => setQuery(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
              
              {/* Sign up call-to-action */}
              <Card className="mt-6 border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Lock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Unlock Full Access</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Sign up to ask unlimited questions, access detailed explanations,
                      and get personalized learning recommendations.
                    </p>
                    <div className="flex gap-3">
                      <Link href="/signup" className="flex-1 sm:flex-none">
                        <Button className="w-full">Sign up now</Button>
                      </Link>
                      <Link href="/login" className="flex-1 sm:flex-none">
                        <Button variant="outline" className="w-full">Log in</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </section>

        {/* Features Section */}
        <section className="bg-slate-950/50 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Powered by Advanced AI
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Our AI assistant combines cutting-edge technology with comprehensive medical knowledge
                to provide accurate and helpful responses.
              </p>
            </motion.div>

            <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: feature.delay }}
                >
                  <Card className="relative overflow-hidden border-slate-800 bg-slate-950/50 p-6 hover:border-slate-700 transition-colors duration-300">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900">
                      <feature.icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-gray-400">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
} 