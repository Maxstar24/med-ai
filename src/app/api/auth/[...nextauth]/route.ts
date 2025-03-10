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
      console.log('NextAuth redirect callback:', { url, baseUrl });
      
      // In development, always redirect to the dashboard
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: redirecting to dashboard');
        return `${baseUrl}/dashboard`;
      }
      
      // For production, use normal redirect logic
      if (url.startsWith('/')) {
        console.log('Redirecting to relative URL:', `${baseUrl}${url}`);
        return `${baseUrl}${url}`;
      }
      
      if (new URL(url).origin === baseUrl) {
        console.log('Redirecting to same-origin URL:', url);
        return url;
      }
      
      console.log('Redirecting to default dashboard');
      return `${baseUrl}/dashboard`;
    }
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  ...(process.env.NODE_ENV === 'development' && {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000'
  })
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };