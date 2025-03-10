import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    return NextResponse.json({ 
      exists: !!user,
      user: user ? {
        id: user._id,
        email: user.email,
        name: user.name,
        firebaseUid: user.firebaseUid
      } : null
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
} 