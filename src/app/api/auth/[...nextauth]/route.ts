import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        try {
          const client = await connectToDatabase();
          const db = mongoose.connection.db;

          if (!db) {
            throw new Error('Database connection failed');
          }

          const user = await db.collection('users').findOne({ 
            email: credentials.email 
          });

          if (!user) {
            throw new Error('No user found with this email');
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            throw new Error('Incorrect password');
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error('Error:', error);
          throw new Error('Authentication error');
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user = {
          ...session.user,
          id: token.id as string
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect called with URL:", url);
      
      // Handle sign out - always redirect to home page
      if (url.includes('/signout') || url.includes('/api/auth/signout')) {
        console.log("Sign out detected, redirecting to home page");
        return '/';
      }
      
      // If the URL is the login page with a callback to dashboard, return the callback URL
      if (url.includes('/login') && url.includes('callbackUrl')) {
        const callbackUrl = new URL(url).searchParams.get('callbackUrl');
        console.log("Login with callback detected, redirecting to:", callbackUrl);
        return callbackUrl || '/dashboard';
      }
      
      // Handle relative URLs - allow access to all app routes
      if (url.startsWith('/')) {
        console.log("Relative URL detected, returning:", url);
        return url;
      }
      
      // If the URL is absolute but belongs to the same site, allow it
      if (url.startsWith(baseUrl)) {
        console.log("Absolute URL from same site detected, returning:", url);
        return url;
      }
      
      // Default redirect to dashboard only for external URLs
      console.log("External URL detected, redirecting to dashboard");
      return '/dashboard';
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };