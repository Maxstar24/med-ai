import connectDB from './mongodb';
import User from '@/models/User';
import { Types } from 'mongoose';

export async function createUser({ 
  name, 
  email, 
  password 
}: { 
  name: string; 
  email: string; 
  password: string; 
}) {
  try {
    console.log('Starting user creation process...');
    await connectDB();
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user with embedded profile and preferences
    const user = new User({
      name,
      email,
      password,
      profile: {},
      preferences: {}
    });

    // Save user to database
    await user.save();
    console.log('User created successfully:', { id: user._id, email: user.email });

    // Return user without password
    const userObject = user.toJSON();
    return userObject;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  try {
    await connectDB();
    console.log('Querying user by email:', email);
    const user = await User.findOne({ email }).select('-password');
    console.log('User query result:', user ? 'User found' : 'No user found');
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

export async function getUserById(id: string) {
  try {
    await connectDB();
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID');
    }
    const user = await User.findById(id).select('-password');
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
} 