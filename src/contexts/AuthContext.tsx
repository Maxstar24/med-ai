'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, signIn as firebaseSignIn, signOut as firebaseSignOut, createUser as firebaseCreateUser } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { UserCredential } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string, name: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {
    throw new Error('Not implemented');
  },
  signUp: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {
    throw new Error('Not implemented');
  },
  refreshToken: async () => {
    throw new Error('Not implemented');
  },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<UserCredential> => {
    try {
      // Create Firebase user
      const result = await firebaseCreateUser(email, password);
      const firebaseUid = result.user.uid;
      
      // Create or update user in MongoDB
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          firebaseUid,
          name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user in database');
      }
      
      router.push('/dashboard');
      return result;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const result = await firebaseSignIn(email, password);
      
      // Check if user exists in MongoDB and update Firebase UID if needed
      const response = await fetch('/api/users/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      // If user exists but doesn't have Firebase UID, update it
      if (data.exists && !data.user.firebaseUid) {
        await fetch('/api/users/update-uid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            firebaseUid: result.user.uid 
          })
        });
      }
      
      router.push('/dashboard');
      return result;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Add a method to refresh the token
  const refreshToken = async (): Promise<string | null> => {
    try {
      if (!user) return null;
      
      // Force refresh the token
      const token = await user.getIdToken(true);
      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    signIn: login,
    signUp,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 