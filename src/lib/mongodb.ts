import mongoose from 'mongoose';

interface GlobalMongoose {
  conn: Promise<typeof mongoose> | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const cached: GlobalMongoose = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(process.env.MONGODB_URI!, opts);
  }

  try {
    const conn = await cached.promise;
    cached.conn = cached.promise;
    return conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

export default connectDB; 