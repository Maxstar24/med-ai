'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const CasesPage = () => {
  const router = useRouter();
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Medical Cases</h1>
      
      <div className="max-w-4xl mx-auto">
        <p className="text-lg text-center mb-12 text-muted-foreground">
          Explore real-world medical cases or create your own. Practice your diagnostic skills and learn from detailed explanations.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* User-created cases option */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border border-border rounded-lg p-6 bg-card shadow-sm hover:shadow-md transition-all"
          >
            <h2 className="text-2xl font-semibold mb-4">Create Your Own Case</h2>
            <p className="mb-6 text-muted-foreground">
              Share your medical knowledge by creating detailed case studies with questions, answers, and explanations.
            </p>
            <ul className="mb-6 space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Add images, tables, and formatted text</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Create questions with detailed answers</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Share with the medical community</span>
              </li>
            </ul>
            <button 
              onClick={() => router.push('/cases/create')}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Create a Case
            </button>
          </motion.div>
          
          {/* AI-generated cases option */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border border-border rounded-lg p-6 bg-card shadow-sm hover:shadow-md transition-all"
          >
            <h2 className="text-2xl font-semibold mb-4">Request AI-Generated Case</h2>
            <p className="mb-6 text-muted-foreground">
              Let our AI create customized medical cases based on your specifications and learning needs.
            </p>
            <ul className="mb-6 space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Specify medical specialty and difficulty</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Get detailed cases with evidence-based content</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Practice with AI-generated questions and answers</span>
              </li>
            </ul>
            <button 
              onClick={() => router.push('/cases/generate')}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Generate a Case
            </button>
          </motion.div>
        </div>
        
        <div className="mt-12 text-center">
          <Link 
            href="/cases/browse" 
            className="text-primary hover:underline font-medium"
          >
            Browse All Cases →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CasesPage; 