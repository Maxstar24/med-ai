import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Case } from '@/models/Case';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';

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

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    // Await the params object before destructuring
    const params = await Promise.resolve(context.params);
    const { id } = params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }
    
    // Find the case by ID
    const caseData = await Case.findById(id)
      .populate('createdBy', 'name email')
      .exec();
    
    if (!caseData) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { message: 'Failed to fetch case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT method to update a case
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to update a case' },
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
    
    // Find the case
    const existingCase = await Case.findById(id);
    
    if (!existingCase) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is the creator of the case
    if (existingCase.userFirebaseUid !== decodedToken.uid) {
      return NextResponse.json(
        { message: 'You can only edit cases you created' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const data = await req.json();
    
    // Validate required fields
    if (!data.title || !data.description || !data.content || !data.category) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Update the case
    const updatedCase = await Case.findByIdAndUpdate(
      id,
      {
        title: data.title,
        description: data.description,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        specialties: data.specialties || [],
        difficulty: data.difficulty || 'intermediate',
        answers: data.answers || [],
        mediaUrls: data.mediaUrls || [],
      },
      { new: true }
    );
    
    return NextResponse.json({
      message: 'Case updated successfully',
      case: updatedCase
    });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { message: 'Failed to update case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE method to remove a case
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'You must be logged in to delete a case' },
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
    
    // Find the case
    const existingCase = await Case.findById(id);
    
    if (!existingCase) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is the creator of the case
    if (existingCase.userFirebaseUid !== decodedToken.uid) {
      return NextResponse.json(
        { message: 'You can only delete cases you created' },
        { status: 403 }
      );
    }
    
    // Delete the case
    await Case.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: 'Case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { message: 'Failed to delete case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 