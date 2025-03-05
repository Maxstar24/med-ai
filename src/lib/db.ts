import mongoose from 'mongoose';
import User from '@/models/User';
import { Types } from 'mongoose';

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

let cached: GlobalMongoose = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI!).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

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
    await connectToDatabase();
    
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
    await connectToDatabase();
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
    await connectToDatabase();
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