import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { connectToDatabase } from '@/lib/mongodb';
import FlashcardSession from '@/models/FlashcardSession';
import Flashcard from '@/models/Flashcard';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Server-side cache for statistics
interface CacheEntry {
  data: any;
  timestamp: number;
}

const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clean expired cache entries
const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of statsCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      statsCache.delete(key);
    }
  }
};

// Schedule cache cleaning every minute
setInterval(cleanCache, 60 * 1000);

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

// GET handler to fetch user's study sessions
export async function GET(req: NextRequest) {
  try {
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
    
    try {
      // Use the native MongoDB driver to bypass Mongoose's type casting
      const db = mongoose.connection.db;
      
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get('sessionId');
      const categoryId = searchParams.get('categoryId');
      const limit = parseInt(searchParams.get('limit') || '10');
      const page = parseInt(searchParams.get('page') || '1');
      const skip = (page - 1) * limit;
      
      if (sessionId) {
        // Get a specific session
        const session = await db.collection('flashcardsessions').findOne({
          _id: new ObjectId(sessionId),
          user: uid
        });
        
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        
        // If the session has a category, fetch the category details
        if (session.category) {
          const category = await db.collection('flashcardcategories').findOne({
            _id: session.category
          }, { projection: { name: 1, color: 1, icon: 1 } });
          
          if (category) {
            session.category = category;
          }
        }
        
        return NextResponse.json(session);
      } else {
        // Get all sessions for the user
        const query: any = { user: uid };
        
        if (categoryId) {
          query.category = new ObjectId(categoryId);
        }
        
        // Fetch sessions
        const sessions = await db.collection('flashcardsessions')
          .find(query)
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
        // Fetch categories for the sessions
        const categoryIds = sessions
          .filter(session => session.category)
          .map(session => session.category);
        
        if (categoryIds.length > 0) {
          const categories = await db.collection('flashcardcategories')
            .find({ _id: { $in: categoryIds } }, { projection: { name: 1, color: 1, icon: 1 } })
            .toArray();
          
          const categoryMap = new Map();
          categories.forEach(category => {
            categoryMap.set(category._id.toString(), category);
          });
          
          // Replace category IDs with category objects
          sessions.forEach(session => {
            if (session.category) {
              const categoryId = session.category.toString();
              if (categoryMap.has(categoryId)) {
                session.category = categoryMap.get(categoryId);
              }
            }
          });
        }
        
        const total = await db.collection('flashcardsessions').countDocuments(query);
        
        return NextResponse.json({
          sessions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        });
      }
    } catch (innerError: any) {
      console.error('Error in sessions retrieval:', innerError);
      return NextResponse.json(
        { error: 'Failed to retrieve sessions', details: innerError.message || String(innerError) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching flashcard sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcard sessions', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// POST handler to create a new study session
export async function POST(req: NextRequest) {
  try {
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
    console.log('[SESSION API] Processing session creation for user:', uid);
    
    try {
      // Parse request body
      const data = await req.json();
      const { 
        categoryId, 
        cardsStudied, 
        correctAnswers, 
        incorrectAnswers, 
        skippedCards, 
        totalTimeSpent,
        setId,
        topicName
      } = data;
      
      console.log('[SESSION API] Creating session with data:', JSON.stringify({
        uid,
        categoryId,
        cardsStudied,
        correctAnswers,
        incorrectAnswers,
        skippedCards,
        totalTimeSpent,
        setId,
        topicName
      }, null, 2));
      
      // Create a new session document
      const session = new FlashcardSession({
        user: uid,
        category: categoryId ? new ObjectId(categoryId) : null,
        startTime: new Date(Date.now() - (totalTimeSpent * 1000 || 0)),
        endTime: new Date(),
        cardsStudied: cardsStudied || 0,
        correctAnswers: correctAnswers || 0,
        incorrectAnswers: incorrectAnswers || 0,
        skippedCards: skippedCards || 0,
        totalTimeSpent: totalTimeSpent || 0,
        cards: [], // We'll handle individual card results in a future update
        set: setId ? new ObjectId(setId) : null,
        topicName: topicName || null
      });
      
      // Save the session
      const savedSession = await session.save();
      console.log('[SESSION API] Session saved successfully:', savedSession._id, 'with stats:', {
        cardsStudied: savedSession.cardsStudied,
        correctAnswers: savedSession.correctAnswers,
        incorrectAnswers: savedSession.incorrectAnswers,
        skippedCards: savedSession.skippedCards,
        totalTimeSpent: savedSession.totalTimeSpent
      });
      
      // Clear the stats cache to force a refresh
      const cacheKey = `stats_${uid}`;
      statsCache.delete(cacheKey);
      console.log('[SESSION API] Cleared stats cache for user:', uid);
      
      return NextResponse.json(savedSession);
    } catch (innerError: any) {
      console.error('[SESSION API] Error creating session:', innerError);
      return NextResponse.json(
        { error: 'Failed to create session', details: innerError.message || String(innerError) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[SESSION API] Error creating flashcard session:', error);
    return NextResponse.json(
      { error: 'Failed to create flashcard session', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH handler to fetch user's study statistics
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
    console.log('[STATS API] Processing statistics request for user:', uid);
    
    // Parse request body
    const data = await req.json();
    const { type } = data;
    
    // If type is 'statistics', return user statistics
    if (type === 'statistics') {
      // Check if we have cached statistics for this user
      const cacheKey = `stats_${uid}`;
      const cachedStats = statsCache.get(cacheKey);
      if (cachedStats && (Date.now() - cachedStats.timestamp < CACHE_TTL)) {
        console.log('[STATS API] Returning cached statistics for user:', uid);
        return NextResponse.json(cachedStats.data);
      }
      
      console.log('[STATS API] Calculating fresh statistics for user:', uid);
      
      // Get total sessions
      const totalSessions = await FlashcardSession.countDocuments({ user: uid });
      console.log('[STATS API] Total sessions:', totalSessions);
      
      // Get total cards
      const totalCards = await Flashcard.countDocuments({ createdBy: uid });
      console.log('[STATS API] Total cards:', totalCards);
      
      // Get cards due for review
      const now = new Date();
      const cardsDue = await Flashcard.countDocuments({
        createdBy: uid,
        nextReviewDate: { $lte: now }
      });
      console.log('[STATS API] Cards due:', cardsDue);
      
      // Calculate total correct, incorrect, and skipped answers
      const sessionStats = await FlashcardSession.aggregate([
        { $match: { user: uid } },
        { $group: {
            _id: null,
            totalCorrect: { $sum: '$correctAnswers' },
            totalIncorrect: { $sum: '$incorrectAnswers' },
            totalSkipped: { $sum: '$skippedCards' },
            totalTimeSpent: { $sum: '$totalTimeSpent' },
            totalCardsStudied: { $sum: '$cardsStudied' }
          }
        }
      ]);
      
      console.log('[STATS API] Raw session stats from DB:', JSON.stringify(sessionStats, null, 2));
      
      const totalCorrect = sessionStats.length > 0 ? sessionStats[0].totalCorrect : 0;
      const totalIncorrect = sessionStats.length > 0 ? sessionStats[0].totalIncorrect : 0;
      const totalSkipped = sessionStats.length > 0 ? sessionStats[0].totalSkipped : 0;
      const totalTimeSpent = sessionStats.length > 0 ? sessionStats[0].totalTimeSpent : 0;
      const totalCardsStudied = sessionStats.length > 0 ? sessionStats[0].totalCardsStudied : 0;
      
      console.log('[STATS API] Processed session stats:', { 
        totalCorrect, 
        totalIncorrect, 
        totalSkipped, 
        totalTimeSpent,
        totalCardsStudied
      });
      
      // Calculate accuracy
      const totalAnswered = totalCorrect + totalIncorrect;
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
      console.log('[STATS API] Accuracy:', accuracy);
      
      // Get daily session counts for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailySessions = await FlashcardSession.aggregate([
        {
          $match: {
            user: uid,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            date: { $first: '$createdAt' }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);
      
      console.log('[STATS API] Daily sessions count:', dailySessions.length);
      
      // Calculate current streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if user studied today
      const studiedToday = dailySessions.some(session => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      
      if (studiedToday) {
        currentStreak = 1; // Start with today
        
        // Check previous days
        let checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);
        
        while (true) {
          const studiedOnDate = dailySessions.some(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === checkDate.getTime();
          });
          
          if (studiedOnDate) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      
      console.log('[STATS API] Current streak:', currentStreak);
      
      // Format daily sessions for chart
      const last30Days = [];
      const currentDate = new Date(thirtyDaysAgo);
      
      while (currentDate <= today) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        
        const matchingSession = dailySessions.find(session => 
          session._id.year === year && 
          session._id.month === month && 
          session._id.day === day
        );
        
        last30Days.push({
          date: new Date(currentDate).toISOString().split('T')[0],
          count: matchingSession ? matchingSession.count : 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Prepare statistics object
      const statistics = {
        totalCards,
        totalSessions,
        cardsDue,
        currentStreak,
        totalCorrect,
        totalIncorrect,
        totalSkipped,
        accuracy,
        totalTimeSpent,
        totalCardsStudied,
        last30Days
      };
      
      console.log('[STATS API] Final statistics object:', JSON.stringify(statistics, null, 2));
      
      // Cache the statistics
      statsCache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now()
      });
      
      console.log('[STATS API] Statistics calculated and cached for user:', uid);
      
      return NextResponse.json(statistics);
    }
    
    // Handle other PATCH operations here
    
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (error) {
    console.error('Error updating flashcard session:', error);
    return NextResponse.json(
      { error: 'Failed to update flashcard session' },
      { status: 500 }
    );
  }
} 