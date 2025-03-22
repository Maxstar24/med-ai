'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BookOpen, 
  Brain,
  Layers,
  FlaskConical,
  BookMarked
} from 'lucide-react';
import { UserProfile } from './UserProfile';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  // Use useEffect to ensure we're rendering on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: <Home className="h-4 w-4 mr-2" />,
      showWhen: 'always'
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Layers className="h-4 w-4 mr-2" />,
      showWhen: 'authenticated'
    },
    {
      title: 'AI Learning',
      href: '/ai-learning',
      icon: <Brain className="h-4 w-4 mr-2" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Cases',
      href: '/cases/browse',
      icon: <BookOpen className="h-4 w-4 mr-2" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Quizzes',
      href: '/quizzes',
      icon: <FlaskConical className="h-4 w-4 mr-2" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Flashcards',
      href: '/flashcards',
      icon: <BookMarked className="h-4 w-4 mr-2" />,
      showWhen: 'authenticated'
    }
  ];

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="flex items-center mr-8">
          <Image src="/logo.png" alt="Med AI Logo" width={32} height={32} />
          <span className="hidden sm:inline-block font-bold">Med AI</span>
        </Link>
        
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6 hidden md:flex">
          {navItems.map((item) => {
            // Only show items that match the current auth state
            if (
              item.showWhen === 'always' || 
              (item.showWhen === 'authenticated' && isClient && user) ||
              (item.showWhen === 'unauthenticated' && isClient && !user)
            ) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href || pathname?.startsWith(`${item.href}/`)
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              );
            }
            return null;
          })}
        </nav>
        
        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </div>
  );
} 