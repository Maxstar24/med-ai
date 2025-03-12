import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    console.log('Auth test endpoint called');
    
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.log('Token verification failed');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Token verification failed'
      }, { status: 401 });
    }
    
    console.log('Token verified successfully for user:', decodedToken.uid);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Authentication successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      }
    });
  } catch (error: any) {
    console.error('Error in auth test endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
} 