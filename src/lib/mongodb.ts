import mongoose from 'mongoose';

declare global {
  var mongoose: {
    conn: ReturnType<typeof mongoose.connect> | null;
    promise: ReturnType<typeof mongoose.connect> | null;
  } | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
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
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

export default connectDB; 