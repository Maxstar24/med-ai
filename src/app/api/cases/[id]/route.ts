import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Case } from '@/models/Case';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

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