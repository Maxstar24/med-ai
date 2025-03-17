import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Flashcard from '@/models/Flashcard';
import FlashcardCategory from '@/models/FlashcardCategory';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { ObjectId } from 'mongodb';

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

// GET handler to fetch flashcards
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
    const categoryId = url.searchParams.get('category');
    const isPublic = url.searchParams.get('isPublic') === 'true';
    const dueOnly = url.searchParams.get('dueOnly') === 'true';
    const setId = url.searchParams.get('setId');
    const groupBySet = url.searchParams.get('groupBySet') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    
    // Build query
    const query: any = {};
    
    // Filter by category if provided
    if (categoryId) {
      query.category = categoryId;
    }
    
    // Filter by set ID if provided
    if (setId) {
      query.setId = setId;
    }
    
    // Filter by public status or user's own cards
    if (isPublic) {
      query.isPublic = true;
    } else {
      query.createdBy = uid;
    }
    
    // Filter by due date if requested
    if (dueOnly) {
      query.nextReviewDate = { $lte: new Date() };
    }
    
    // If grouping by set is requested, we'll handle it differently
    if (groupBySet) {
      // First, get all unique sets with their topics
      const sets = await Flashcard.aggregate([
        { $match: { ...query, setId: { $exists: true, $ne: null } } },
        { 
          $group: { 
            _id: "$setId", 
            topicName: { $first: "$topicName" },
            category: { $first: "$category" },
            difficulty: { $first: "$difficulty" },
            cardCount: { $sum: 1 },
            createdAt: { $first: "$createdAt" }
          } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
      
      // Get total count for pagination
      const totalSets = await Flashcard.aggregate([
        { $match: { ...query, setId: { $exists: true, $ne: null } } },
        { $group: { _id: "$setId" } },
        { $count: "total" }
      ]);
      
      const total = totalSets.length > 0 ? totalSets[0].total : 0;
      
      // For each set, get a sample card to represent the set
      const setsWithSample = await Promise.all(sets.map(async (set) => {
        const sampleCard = await Flashcard.findOne({ setId: set._id })
          .populate('category', 'name color icon');
        
        return {
          setId: set._id,
          topicName: set.topicName,
          cardCount: set.cardCount,
          difficulty: set.difficulty,
          category: sampleCard?.category,
          sampleQuestion: sampleCard?.question,
          createdAt: set.createdAt
        };
      }));
      
      return NextResponse.json({
        flashcardSets: setsWithSample,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + sets.length < total
        }
      });
    } else {
      // Regular query for individual flashcards
      const flashcards = await Flashcard.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name color icon');
      
      // Get total count for pagination
      const total = await Flashcard.countDocuments(query);
      
      return NextResponse.json({
        flashcards,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + flashcards.length < total
        }
      });
    }
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
}

// POST handler to create a new flashcard
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
    const { question, answer, explanation, category, tags, isPublic, difficulty } = data;
    
    console.log('Creating flashcard with data:', {
      question: question?.substring(0, 20) + '...',
      answer: answer?.substring(0, 20) + '...',
      category,
      tags,
      isPublic,
      difficulty
    });
    
    // Validate required fields
    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    try {
      const categoryExists = await FlashcardCategory.findById(category);
      console.log('Category check result:', categoryExists ? 'Found' : 'Not found');
      
      if (!categoryExists) {
        return NextResponse.json(
          { error: `Category not found with ID: ${category}` },
          { status: 404 }
        );
      }
      
      // Verify the user owns the category
      if (categoryExists.createdBy.toString() !== uid) {
        return NextResponse.json(
          { error: 'You do not have permission to add flashcards to this category' },
          { status: 403 }
        );
      }
    } catch (categoryError: any) {
      console.error('Error checking category:', categoryError);
      return NextResponse.json(
        { error: `Invalid category ID format or database error: ${categoryError.message}` },
        { status: 400 }
      );
    }
    
    // Create new flashcard
    try {
      const newFlashcard = new Flashcard({
        question,
        answer,
        explanation: explanation || '',
        category,
        tags: tags || [],
        createdBy: uid,
        isPublic: isPublic || false,
        difficulty: difficulty || 'medium',
        reviewCount: 0,
        confidenceLevel: 3,
        nextReviewDate: new Date() // Set initial review date to today
      });
      
      const savedFlashcard = await newFlashcard.save();
      console.log('Flashcard saved successfully with ID:', savedFlashcard._id);
      
      // Update category card count
      await FlashcardCategory.findByIdAndUpdate(
        category,
        { $inc: { cardCount: 1 } }
      );
      
      return NextResponse.json(savedFlashcard, { status: 201 });
    } catch (saveError: any) {
      console.error('Error saving flashcard:', saveError);
      return NextResponse.json(
        { error: `Failed to save flashcard: ${saveError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating flashcard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create flashcard' },
      { status: 500 }
    );
  }
}

// PATCH handler to update a flashcard
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
    const { id, question, answer, explanation, category, tags, isPublic, difficulty, confidenceLevel, reviewResult } = data;
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }
    
    // Find the flashcard
    const flashcard = await Flashcard.findOne({
      _id: id,
      createdBy: uid
    });
    
    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }
    
    // Update fields if provided
    if (question) flashcard.question = question;
    if (answer) flashcard.answer = answer;
    if (explanation !== undefined) flashcard.explanation = explanation;
    if (category) flashcard.category = category;
    if (tags) flashcard.tags = tags;
    if (isPublic !== undefined) flashcard.isPublic = isPublic;
    if (difficulty) flashcard.difficulty = difficulty;
    
    // Handle review result if provided
    if (reviewResult) {
      // Update review count
      flashcard.reviewCount += 1;
      
      // Update last reviewed date
      flashcard.lastReviewed = new Date();
      
      // Update confidence level if provided
      if (confidenceLevel) {
        flashcard.confidenceLevel = confidenceLevel;
      }
      
      // Calculate next review date based on spaced repetition algorithm
      const interval = calculateReviewInterval(flashcard.confidenceLevel, flashcard.reviewCount);
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
      flashcard.nextReviewDate = nextReviewDate;
    }
    
    await flashcard.save();
    
    return NextResponse.json(flashcard);
  } catch (error) {
    console.error('Error updating flashcard:', error);
    return NextResponse.json(
      { error: 'Failed to update flashcard' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a flashcard
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
        { error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }
    
    // Find and delete the flashcard
    const flashcard = await Flashcard.findOneAndDelete({
      _id: id,
      createdBy: uid
    });
    
    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    return NextResponse.json(
      { error: 'Failed to delete flashcard' },
      { status: 500 }
    );
  }
}

// Helper function to calculate review interval based on confidence level and review count
function calculateReviewInterval(confidenceLevel: number, reviewCount: number): number {
  // Default to 1 day for first review
  if (reviewCount <= 1) return 1;
  
  // Calculate interval based on confidence level (1-5)
  // 1: Review again in 1 day
  // 2: Review again in 3 days
  // 3: Review again in 7 days
  // 4: Review again in 14 days
  // 5: Review again in 30 days
  switch (confidenceLevel) {
    case 1: return 1;
    case 2: return 3;
    case 3: return 7;
    case 4: return 14;
    case 5: return 30;
    default: return 1;
  }
} 