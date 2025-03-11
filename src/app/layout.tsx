import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { NextAuthProvider } from '@/components/NextAuthProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedAI - Medical Learning Platform",
  description: "AI-powered medical learning platform for students and professionals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn(
        inter.className,
        "min-h-screen bg-black text-slate-50 antialiased"
      )}>
        <NextAuthProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
