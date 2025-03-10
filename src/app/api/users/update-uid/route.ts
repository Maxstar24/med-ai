import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email, firebaseUid } = await request.json();
    
    if (!email || !firebaseUid) {
      return NextResponse.json(
        { error: 'Email and firebaseUid are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update Firebase UID
    user.firebaseUid = firebaseUid;
    await user.save();
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        firebaseUid: user.firebaseUid
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
} 