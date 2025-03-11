import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Bookmark } from '@/models/Bookmark';
import { Case } from '@/models/Case';
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

// POST endpoint to toggle bookmark status
export async function POST(req: NextRequest) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to bookmark cases' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Parse the request body
    const data = await req.json();
    const { caseId } = data;
    
    if (!caseId) {
      return NextResponse.json(
        { message: 'Case ID is required' },
        { status: 400 }
      );
    }
    
    // Validate case ID format
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    // Check if the case exists
    const caseExists = await Case.exists({ _id: caseId });
    if (!caseExists) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    // Check if the bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      userId: decodedToken.uid,
      caseId: caseId
    });
    
    let isBookmarked = false;
    
    if (existingBookmark) {
      // If bookmark exists, remove it (unbookmark)
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      isBookmarked = false;
    } else {
      // If bookmark doesn't exist, create it
      await Bookmark.create({
        userId: decodedToken.uid,
        caseId: caseId
      });
      isBookmarked = true;
    }
    
    return NextResponse.json({
      message: isBookmarked ? 'Case bookmarked successfully' : 'Case unbookmarked successfully',
      isBookmarked
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json(
      { message: 'Failed to toggle bookmark', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if a case is bookmarked
export async function GET(req: NextRequest) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to check bookmark status' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get case ID from query params
    const url = new URL(req.url);
    const caseId = url.searchParams.get('caseId');
    
    if (!caseId) {
      return NextResponse.json(
        { message: 'Case ID is required' },
        { status: 400 }
      );
    }
    
    // Validate case ID format
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    // Check if the bookmark exists
    const bookmark = await Bookmark.findOne({
      userId: decodedToken.uid,
      caseId: caseId
    });
    
    return NextResponse.json({
      isBookmarked: !!bookmark
    });
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return NextResponse.json(
      { message: 'Failed to check bookmark status', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 