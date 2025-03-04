import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedAI Companion - Your AI-Powered Medical Learning Assistant",
  description: "An AI-powered learning assistant designed for medical students, featuring interactive Q&A, case-based reasoning, and personalized study plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        inter.className,
        "min-h-screen bg-black text-slate-50 antialiased"
      )}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
