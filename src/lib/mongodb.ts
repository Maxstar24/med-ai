import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

const uri = process.env.MONGODB_URI;

// Set strictQuery to false to prevent Mongoose from trying to cast query values
mongoose.set('strictQuery', false);

interface GlobalWithMongoose extends globalThis.Global {
  mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  }
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
// Fix the type error by explicitly typing the 'cached' variable as 'GlobalWithMongoose'.
let cached: GlobalWithMongoose = global as GlobalWithMongoose;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

// Using named export to fix the import error
export async function connectToDatabase() {
  if (cached.mongoose.conn) {
    return cached.mongoose.conn;
  }

  if (!cached.mongoose.promise) {
    const opts = {
      bufferCommands: true,
    };

    cached.mongoose.promise = mongoose.connect(uri, opts);
  }

  try {
    cached.mongoose.conn = await cached.mongoose.promise;
  } catch (e) {
    cached.mongoose.promise = null;
    throw e;
  }

  return cached.mongoose.conn;
}