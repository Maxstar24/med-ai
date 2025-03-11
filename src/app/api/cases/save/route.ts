import { NextRequest, NextResponse } from 'next/server';
import { Case } from '@/models/Case';
import { connectToDatabase } from '@/lib/mongodb';
import * as admin from 'firebase-admin';
import User from '@/models/User';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    // Check if we have the service account key
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables');
    }

    // Parse the service account key JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    // Initialize the app
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

// Add dynamic export to ensure the route is always fresh
export const dynamic = 'force-dynamic';

// Helper function to verify Firebase token
async function verifyFirebaseToken(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    
    // Get the Firebase token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('Token extracted, length:', token.length);
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Token verified for user:', decodedToken.uid);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log('POST request received at /api/cases/save');
  
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      console.error('Authentication failed');
      return NextResponse.json(
        { message: 'You must be logged in to create a case' },
        { status: 401 }
      );
    }
    
    console.log('Connecting to database...');
    // Connect to the database
    await connectToDatabase();
    
    // Find the user by Firebase UID
    console.log('Finding user with Firebase UID:', decodedToken.uid);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      console.error('User not found in database');
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    console.log('User found:', user.name, user._id);
    
    // Parse the request body
    const data = await req.json();
    console.log('Received case data:', {
      title: data.title,
      description: data.description?.substring(0, 50) + '...',
      contentLength: data.content?.length || 0,
      category: data.category,
      difficulty: data.difficulty,
      numAnswers: data.answers?.length || 0
    });
    
    // Validate required fields
    if (!data.title || !data.description || !data.content || !data.category) {
      console.error('Missing required fields');
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('Creating new case...');
    // Create the case
    const newCase = await Case.create({
      ...data,
      createdBy: user._id,
      userFirebaseUid: decodedToken.uid,
    });
    
    console.log('Case created successfully with ID:', newCase._id);
    
    return NextResponse.json(
      { message: 'Case created successfully', caseId: newCase._id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { message: 'Failed to create case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 