import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Flashcards | MedAI',
  description: 'Create new flashcards for your medical studies',
};

export default function CreateFlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 