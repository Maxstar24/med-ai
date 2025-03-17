import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { connectToDatabase } from '@/lib/mongodb';
import FlashcardCategory from '@/models/FlashcardCategory';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { ObjectId } from 'mongodb';
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

// GET handler to fetch categories
export async function GET(req: NextRequest) {
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
    
    // Parse query parameters
    const url = new URL(req.url);
    const isPublic = url.searchParams.get('isPublic') === 'true';
    
    // Build query
    const query: any = {};
    
    if (isPublic) {
      // If requesting public categories, get both public categories and user's own categories
      query.$or = [
        { isPublic: true },
        { createdBy: uid }
      ];
    } else {
      // If not specified, only get user's categories
      query.createdBy = uid;
    }
    
    // Fetch categories
    const categories = await FlashcardCategory.find(query).sort({ name: 1 });
    
    // Get flashcard counts for each category
    const Flashcard = mongoose.models.Flashcard;
    if (Flashcard) {
      // Use Promise.all to update all categories concurrently
      await Promise.all(categories.map(async (category) => {
        const count = await Flashcard.countDocuments({ 
          category: category._id,
          createdBy: uid
        });
        category.flashcardCount = count;
      }));
    }
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST handler to create a new category
export async function POST(req: NextRequest) {
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
    
    // Parse request body
    const data = await req.json();
    const { name, description, color, icon, isPublic } = data;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    // Create new category
    const newCategory = new FlashcardCategory({
      name,
      description: description || '',
      color: color || '#4f46e5', // Default indigo color
      icon: icon || 'book', // Default icon
      createdBy: uid,
      isPublic: isPublic || false,
      cardCount: 0
    });
    
    await newCategory.save();
    
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PATCH handler to update a category
export async function PATCH(req: NextRequest) {
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
    
    // Parse request body
    const data = await req.json();
    const { id, name, description, color, icon, isPublic } = data;
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // Find the category
    const category = await FlashcardCategory.findOne({
      _id: id,
      createdBy: uid
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }
    
    // Update fields if provided
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (color) category.color = color;
    if (icon) category.icon = icon;
    if (isPublic !== undefined) category.isPublic = isPublic;
    
    await category.save();
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a category
export async function DELETE(req: NextRequest) {
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
    
    // Parse query parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    // Find and delete the category
    const category = await FlashcardCategory.findOneAndDelete({
      _id: id,
      createdBy: uid
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
} 