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
  BookMarked,
  Menu,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Use useEffect to ensure we're rendering on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const navItems = [
    {
      title: 'Home',
      href: '/',
      icon: <Home className="h-5 w-5 mr-3" />,
      showWhen: 'always'
    },
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Layers className="h-5 w-5 mr-3" />,
      showWhen: 'authenticated'
    },
    {
      title: 'AI Learning',
      href: '/ai-learning',
      icon: <Brain className="h-5 w-5 mr-3" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Cases',
      href: '/cases/browse',
      icon: <BookOpen className="h-5 w-5 mr-3" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Quizzes',
      href: '/quizzes',
      icon: <FlaskConical className="h-5 w-5 mr-3" />,
      showWhen: 'authenticated'
    },
    {
      title: 'Flashcards',
      href: '/flashcards',
      icon: <BookMarked className="h-5 w-5 mr-3" />,
      showWhen: 'authenticated'
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80%] max-w-[300px] px-0">
        <div className="flex flex-col h-full">
          <div className="px-4 py-6 border-b">
            <div className="flex items-center">
              <Image src="/logo.png" alt="Med AI Logo" width={32} height={32} />
              <span className="font-bold ml-2">Med AI</span>
            </div>
          </div>
          <nav className="flex-1 px-2 py-4">
            <div className="space-y-1">
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
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center py-3 px-3 text-base font-medium rounded-md transition-colors",
                        pathname === item.href || pathname?.startsWith(`${item.href}/`)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </nav>
          <div className="px-4 py-4 border-t">
            <p className="text-xs text-muted-foreground">
              {user ? `Signed in as ${user.email}` : 'Not signed in'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
