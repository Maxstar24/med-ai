import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Case } from '@/models/Case';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Add dynamic export to ensure the route is always fresh
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'You must be logged in to create a case' },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.title || !data.description || !data.content || !data.category) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create the case
    const newCase = await Case.create({
      ...data,
      createdBy: session.user.id,
    });
    
    return NextResponse.json(
      { message: 'Case created successfully', caseId: newCase._id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { message: 'Failed to create case', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const difficulty = url.searchParams.get('difficulty');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Build query
    const query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    
    try {
      // Get total count for pagination
      const total = await Case.countDocuments(query);
      
      // Get cases with pagination
      const cases = await Case.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email')
        .select('title description category tags difficulty specialties isAIGenerated createdAt createdBy');
      
      return NextResponse.json({
        cases,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (modelError) {
      // Return empty array as fallback
      return NextResponse.json({
        cases: [],
        pagination: {
          total: 0,
          page: 1,
          limit,
          pages: 0,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch cases', 
        error: error instanceof Error ? error.message : 'Unknown error',
        cases: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        }
      },
      { status: 200 } // Return 200 with empty data instead of error
    );
  }
} 