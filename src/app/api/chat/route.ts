import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // Here you would typically:
    // 1. Process the message
    // 2. Call your AI service
    // 3. Return the response
    
    // For now, we'll return a mock response
    const response = {
      message: `Hello ${session.user.name}, I received your message: "${validatedData.message}"`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
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