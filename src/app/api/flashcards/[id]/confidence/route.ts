import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Flashcard from '@/models/Flashcard';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import mongoose from 'mongoose';

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Verify Firebase token
async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// PATCH handler to update flashcard confidence level
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const uid = decodedToken.uid;
    // Fix for NextJS 15+ - await params before using properties
    const { id: flashcardId } = await Promise.resolve(params);
    
    // Validate flashcard ID
    if (!mongoose.Types.ObjectId.isValid(flashcardId)) {
      return NextResponse.json(
        { error: 'Invalid flashcard ID format' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const data = await req.json();
    const { confidenceLevel } = data;
    
    // Validate confidence level
    if (confidenceLevel === undefined || confidenceLevel < 1 || confidenceLevel > 5) {
      return NextResponse.json(
        { error: 'Confidence level must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Find the flashcard
    const flashcard = await Flashcard.findById(flashcardId);
    
    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      );
    }
    
    // Verify the user owns the flashcard or it's public
    if (flashcard.createdBy.toString() !== uid && !flashcard.isPublic) {
      return NextResponse.json(
        { error: 'You do not have permission to update this flashcard' },
        { status: 403 }
      );
    }
    
    // Calculate next review date based on confidence level
    const now = new Date();
    let nextReviewDate = new Date();
    
    // Spaced repetition algorithm based on confidence level
    switch (confidenceLevel) {
      case 1: // Not confident at all - review in 1 day
        nextReviewDate.setDate(now.getDate() + 1);
        break;
      case 2: // Slightly confident - review in 3 days
        nextReviewDate.setDate(now.getDate() + 3);
        break;
      case 3: // Somewhat confident - review in 7 days
        nextReviewDate.setDate(now.getDate() + 7);
        break;
      case 4: // Very confident - review in 14 days
        nextReviewDate.setDate(now.getDate() + 14);
        break;
      case 5: // Extremely confident - review in 30 days
        nextReviewDate.setDate(now.getDate() + 30);
        break;
      default:
        nextReviewDate.setDate(now.getDate() + 1);
    }
    
    // Update the flashcard
    const updatedFlashcard = await Flashcard.findByIdAndUpdate(
      flashcardId,
      {
        $set: {
          confidenceLevel,
          nextReviewDate,
          lastReviewedAt: now
        },
        $inc: { reviewCount: 1 }
      },
      { new: true }
    );
    
    return NextResponse.json(updatedFlashcard);
  } catch (error: any) {
    console.error('Error updating flashcard confidence:', error);
    return NextResponse.json(
      { error: 'Failed to update flashcard confidence', details: error.message || String(error) },
      { status: 500 }
    );
  }
} 