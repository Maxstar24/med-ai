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
      // Handle sign out - always redirect to home page
      if (url.includes('/signout') || url.includes('/api/auth/signout')) {
        return '/';
      }
      
      // If URL is just the domain without a path, redirect to dashboard
      if (url === baseUrl || url === `${baseUrl}/`) {
        return '/dashboard';
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        return url;
      }
      
      // Default redirect to dashboard
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