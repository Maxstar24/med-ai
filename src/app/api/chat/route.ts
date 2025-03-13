import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateMedicalResponse } from '@/services/ai';
import { auth } from '@/lib/firebase-admin';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check authentication using Firebase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      // Verify the Firebase token
      await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // Generate AI response using Gemini
    const response = await generateMedicalResponse(validatedData.message);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({ message: response.text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 