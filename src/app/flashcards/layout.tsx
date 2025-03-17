import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flashcards | MedAI',
  description: 'Create and study flashcards to enhance your medical knowledge',
};

export default function FlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 