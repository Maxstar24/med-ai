import { NextRequest, NextResponse } from 'next/server';
import { Case } from '@/models/Case';
import { Bookmark } from '@/models/Bookmark';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuth } from 'firebase-admin/auth';
import mongoose from 'mongoose';

// Add dynamic export to ensure the route is always fresh
export const dynamic = 'force-dynamic';

// Helper function to verify Firebase token
async function verifyFirebaseToken(request: NextRequest) {
  try {
    // Get the Firebase token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to view saved cases' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Find all bookmarks for this user
    const bookmarks = await Bookmark.find({ userId: decodedToken.uid })
      .sort({ createdAt: -1 });
    
    // Extract case IDs from bookmarks
    const caseIds = bookmarks.map(bookmark => bookmark.caseId);
    
    // Fetch the actual cases
    const cases = await Case.find({ _id: { $in: caseIds } })
      .select('title description category tags difficulty specialties isAIGenerated createdAt createdBy')
      .populate('createdBy', 'name email');
    
    // Sort cases to match the order of bookmarks (most recently bookmarked first)
    const sortedCases = caseIds.map(id => 
      cases.find(c => c._id.toString() === id.toString())
    ).filter(Boolean);
    
    return NextResponse.json({ cases: sortedCases });
  } catch (error) {
    console.error('Error fetching saved cases:', error);
    
    // Check if the error is related to an invalid ObjectId
    if (error instanceof mongoose.Error.CastError && error.path === '_id') {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to fetch saved cases', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 