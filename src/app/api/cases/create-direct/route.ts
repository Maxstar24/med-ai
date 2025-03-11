import { NextRequest, NextResponse } from 'next/server';
import { Case } from '@/models/Case';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';

// Add dynamic export to ensure the route is always fresh
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('POST request received at /api/cases/create-direct');
  
  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    let uid = 'temp-user-id';
    let decodedToken = null;
    
    // Verify the token if present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        console.log('Token extracted, length:', token.length);
        
        // Verify the Firebase ID token
        console.log('Attempting to verify Firebase ID token...');
        decodedToken = await getAuth().verifyIdToken(token);
        uid = decodedToken.uid;
        console.log('Token verified successfully for user:', uid);
      } catch (tokenError) {
        console.warn('Token verification failed, using temporary user ID:', tokenError);
        // Continue with temporary user ID
      }
    } else {
      console.warn('No auth header present, using temporary user ID');
    }
    
    // Connect to the database
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connection established');
    
    // Parse the request body
    const data = await req.json();
    console.log('Received case data:', {
      title: data.title,
      description: data.description?.substring(0, 50) + '...',
      contentLength: data.content?.length || 0,
      category: data.category,
      difficulty: data.difficulty,
      answersCount: data.answers?.length || 0
    });
    
    // Validate required fields
    if (!data.title || !data.description || !data.content || !data.category) {
      console.error('Missing required fields');
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create a temporary user ID
    const userId = new mongoose.Types.ObjectId();
    
    console.log('Creating new case...');
    // Create the case
    const newCase = await Case.create({
      ...data,
      createdBy: userId,
      userFirebaseUid: uid, // Use the verified UID or temp ID
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