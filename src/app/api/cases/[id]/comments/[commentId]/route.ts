import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Comment } from '@/models/Comment';
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

// PUT endpoint to update a comment
export async function PUT(
  req: NextRequest,
  context: { params: { id: string; commentId: string } }
) {
  try {
    const { params } = context;
    // Verify user authentication
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(params.id) || 
        !mongoose.Types.ObjectId.isValid(params.commentId)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the comment
    const comment = await Comment.findById(params.commentId);
    
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user is the author of the comment
    if (comment.userId !== decodedToken.uid) {
      return NextResponse.json(
        { message: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { content } = body;

    // Validate content
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { message: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Update the comment
    comment.content = content.trim();
    await comment.save();

    return NextResponse.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a comment
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string; commentId: string } }
) {
  try {
    const { params } = context;
    // Verify user authentication
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(params.id) || 
        !mongoose.Types.ObjectId.isValid(params.commentId)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the comment
    const comment = await Comment.findById(params.commentId);
    
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user is the author of the comment
    if (comment.userId !== decodedToken.uid) {
      return NextResponse.json(
        { message: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment
    await Comment.findByIdAndDelete(params.commentId);
    
    // Delete all replies to this comment (cascade delete)
    await Comment.deleteMany({ parentId: params.commentId });

    // If this was a reply, decrement the parent's reply count
    if (comment.parentId) {
      await Comment.findByIdAndUpdate(comment.parentId, {
        $inc: { replyCount: -1 }
      });
    }

    return NextResponse.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

// POST endpoint to like/unlike a comment
export async function POST(
  req: NextRequest,
  context: { params: { id: string; commentId: string } }
) {
  try {
    const { params } = context;
    // Verify user authentication
    const decodedToken = await verifyFirebaseToken(req);
    if (!decodedToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(params.id) || 
        !mongoose.Types.ObjectId.isValid(params.commentId)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the comment
    const comment = await Comment.findById(params.commentId);
    
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user has already liked the comment
    const userId = decodedToken.uid;
    const hasLiked = comment.likes.includes(userId);
    
    if (hasLiked) {
      // Unlike: remove user from likes array
      comment.likes = comment.likes.filter((id: string) => id !== userId);
    } else {
      // Like: add user to likes array
      comment.likes.push(userId);
    }
    
    await comment.save();

    return NextResponse.json({
      message: hasLiked ? 'Comment unliked' : 'Comment liked',
      liked: !hasLiked
    });
  } catch (error) {
    console.error('Error liking/unliking comment:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to like/unlike comment' },
      { status: 500 }
    );
  }
} 