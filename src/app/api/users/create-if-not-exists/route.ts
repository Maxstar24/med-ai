import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
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
    
    console.log('Creating user if not exists with Firebase UID:', decodedToken.uid);
    
    // Find the user by Firebase UID or email
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: decodedToken.uid },
        { email: decodedToken.email }
      ]
    });
    
    if (user) {
      // Update Firebase UID if it's not set
      if (!user.firebaseUid) {
        user.firebaseUid = decodedToken.uid;
        await user.save();
        console.log('Updated existing user with Firebase UID');
      } else {
        console.log('User already exists in database');
      }
      
      return NextResponse.json({ 
        success: true, 
        created: false,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          firebaseUid: user.firebaseUid
        }
      });
    }
    
    // Get the request body for additional user data
    const body = await request.json();
    const name = body.name || decodedToken.name || decodedToken.email?.split('@')[0] || 'User';
    
    // Create new user
    const newUser = new User({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: name,
      role: 'user',
    });
    
    await newUser.save();
    console.log('Created new user in database');
    
    return NextResponse.json({ 
      success: true,
      created: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        firebaseUid: newUser.firebaseUid
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
} 