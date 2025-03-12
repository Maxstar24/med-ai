import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );
    
    if (!serviceAccount.project_id) {
      console.error('Invalid Firebase service account key. Please check your environment variables.');
    }
    
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

export const auth = getAuth();
export const db = getFirestore();

// Helper function to verify Firebase token
export async function verifyFirebaseToken(authHeader: string | null) {
  try {
    console.log('Verifying Firebase token...');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return null;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid auth header format, does not start with "Bearer "');
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.error('Token is empty after splitting');
      return null;
    }
    
    console.log('Token length:', token.length);
    
    // Verify the token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      console.log('Token verified successfully for user:', decodedToken.uid);
      return decodedToken;
    } catch (verifyError: any) {
      console.error('Token verification failed:', verifyError.message);
      return null;
    }
  } catch (error) {
    console.error('Error in verifyFirebaseToken:', error);
    return null;
  }
} 