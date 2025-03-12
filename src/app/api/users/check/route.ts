import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Checking user with Firebase UID:', decodedToken.uid);
    
    // Find the user by Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      console.log('User not found in database');
      return NextResponse.json({ 
        exists: false, 
        message: 'User not found in database',
        firebaseUid: decodedToken.uid,
        email: decodedToken.email
      });
    }
    
    console.log('User found in database:', user.email);
    
    return NextResponse.json({ 
      exists: true, 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (error: any) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Failed to check user', details: error.message },
      { status: 500 }
    );
  }
} 