'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import { Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const { data: session, status } = useSession();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      console.log("User is authenticated, redirecting to dashboard");
      window.location.href = '/dashboard';
    }
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simplify the login process - always redirect to dashboard
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        console.log("Login successful, redirecting to dashboard");
        // Force a hard navigation to the dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError("Failed to sign in");
      setLoading(false);
    }
  };

  // If already authenticated, show loading
  if (status === 'authenticated') {
    return <div className="flex min-h-screen items-center justify-center">Redirecting to dashboard...</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="relative w-full max-w-md overflow-hidden border-slate-800 bg-slate-950/50 p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
        <div className="relative">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Brain className="h-8 w-8 text-blue-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  MedAI
                </span>
              </motion.div>
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-2xl font-bold tracking-tight"
            >
              Welcome back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-sm text-gray-400"
            >
              Sign in to continue your medical learning journey
            </motion.p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            {registered && (
              <div className="p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
                Account created successfully! Please sign in.
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="bg-slate-900"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="bg-slate-900"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-slate-800 bg-slate-900" />
                Remember me
              </label>
              <Link href="/reset-password/request" className="text-sm text-blue-500 hover:text-blue-400">
                Forgot password?
              </Link>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-500 hover:text-blue-400">
                Sign up
              </Link>
            </p>
          </motion.form>
        </div>
      </Card>
    </main>
  );
} 