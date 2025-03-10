import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email, firebaseUid, name } = await request.json();
    
    if (!email || !firebaseUid || !name) {
      return NextResponse.json(
        { error: 'Email, firebaseUid, and name are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Update existing user with Firebase UID if not already set
      if (!existingUser.firebaseUid) {
        existingUser.firebaseUid = firebaseUid;
        await existingUser.save();
        return NextResponse.json({ 
          success: true, 
          user: existingUser,
          message: 'Existing user updated with Firebase UID'
        });
      }
      
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create new user
    const newUser = new User({
      firebaseUid,
      email,
      name,
      role: 'user',
    });
    
    await newUser.save();
    
    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 