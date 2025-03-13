import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Comment } from '@/models/Comment';
import { Case } from '@/models/Case';
import mongoose from 'mongoose';
import { getAuth } from 'firebase-admin/auth';

// Helper function to verify Firebase token
async function verifyFirebaseToken(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';

// GET comments for a case
export async function GET(req, context) {
  const { params } = context;
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate case ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Build query
    const query: any = { caseId: params.id };
    
    // If parentId is 'null' string, find top-level comments
    if (parentId === 'null') {
      query.parentId = null;
    } 
    // If parentId is provided, find replies to that comment
    else if (parentId) {
      query.parentId = parentId;
    }

    // Count total documents for pagination
    const total = await Comment.countDocuments(query);
    const pages = Math.ceil(total / limit);
    
    // Get comments with pagination
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      comments,
      pagination: {
        total,
        page,
        pages,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST a new comment
export async function POST(req, context) {
  const { params } = context;
  try {
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate case ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: 'Invalid case ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if case exists
    const caseExists = await Case.findById(params.id);
    if (!caseExists) {
      return NextResponse.json(
        { message: 'Case not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { content, parentId } = body;

    // Validate content
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { message: 'Comment content is required' },
        { status: 400 }
      );
    }

    // If parentId is provided, check if it exists
    if (parentId && !await Comment.findById(parentId)) {
      return NextResponse.json(
        { message: 'Parent comment not found' },
        { status: 404 }
      );
    }

    // Create new comment
    const newComment = new Comment({
      caseId: params.id,
      userId: decodedToken.uid,
      userName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous',
      userAvatar: decodedToken.picture || null,
      content: content.trim(),
      parentId: parentId || null,
      likes: []
    });

    await newComment.save();

    // If this is a reply, increment the parent's reply count
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { replyCount: 1 }
      });
    }

    return NextResponse.json({
      message: 'Comment added successfully',
      comment: newComment
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to add comment' },
      { status: 500 }
    );
  }
} 