import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Rating } from '@/models/Rating';
import { Case } from '@/models/Case';
import { getAuth } from 'firebase-admin/auth';
import mongoose from 'mongoose';

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

// POST endpoint to rate a case
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to rate a case' },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    // Get case ID from params
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const data = await req.json();
    const { rating } = data;
    
    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Check if the case exists
    const caseExists = await Case.exists({ _id: id });
    if (!caseExists) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Check if the user has already rated this case
      const existingRating = await Rating.findOne({
        userId: decodedToken.uid,
        caseId: id
      }).session(session);
      
      let oldRating = 0;
      
      if (existingRating) {
        // Store the old rating value
        oldRating = existingRating.rating;
        
        // Update the existing rating
        existingRating.rating = rating;
        await existingRating.save({ session });
      } else {
        // Create a new rating
        await Rating.create([{
          userId: decodedToken.uid,
          caseId: id,
          rating
        }], { session });
      }
      
      // Update the case's rating information
      const caseToUpdate = await Case.findById(id).session(session);
      
      if (existingRating) {
        // If updating an existing rating, adjust the sum
        caseToUpdate.ratingSum = caseToUpdate.ratingSum - oldRating + rating;
      } else {
        // If adding a new rating, increment count and add to sum
        caseToUpdate.ratingCount += 1;
        caseToUpdate.ratingSum += rating;
      }
      
      // Calculate the new average
      if (caseToUpdate.ratingCount > 0) {
        caseToUpdate.ratingAvg = caseToUpdate.ratingSum / caseToUpdate.ratingCount;
      }
      
      await caseToUpdate.save({ session });
      
      // Commit the transaction
      await session.commitTransaction();
      
      return NextResponse.json({
        message: existingRating ? 'Rating updated successfully' : 'Rating added successfully',
        rating,
        caseRating: {
          count: caseToUpdate.ratingCount,
          average: caseToUpdate.ratingAvg
        }
      });
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    console.error('Error rating case:', error);
    return NextResponse.json(
      { message: 'Failed to rate case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if a user has rated a case and get the case's rating info
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get case ID from params
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Get the case's rating information
    const caseData = await Case.findById(id).select('ratingCount ratingAvg');
    
    if (!caseData) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is logged in
    const decodedToken = await verifyFirebaseToken(req);
    let userRating = null;
    
    if (decodedToken) {
      // Get the user's rating for this case
      const ratingData = await Rating.findOne({
        userId: decodedToken.uid,
        caseId: id
      });
      
      if (ratingData) {
        userRating = ratingData.rating;
      }
    }
    
    return NextResponse.json({
      caseRating: {
        count: caseData.ratingCount,
        average: caseData.ratingAvg
      },
      userRating
    });
  } catch (error) {
    console.error('Error getting rating info:', error);
    return NextResponse.json(
      { message: 'Failed to get rating information', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 