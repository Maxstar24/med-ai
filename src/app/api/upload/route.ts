import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

const uploadRequestSchema = z.object({
  content: z.string(),
  fileName: z.string(),
  fileType: z.enum(['pdf', 'png', 'docx', 'txt']),
  topic: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
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

    // Get the form data
    const body = await request.json();
    const validatedData = uploadRequestSchema.parse(body);

    // Format the prompt for question generation
    const prompt = `Based on the following ${validatedData.fileType} content, generate a set of educational questions.
Content:
${validatedData.content}

Please create:
1. Multiple choice questions
2. True/False questions
3. Fill in the blank questions
4. Matching questions

For each question:
- Include the correct answer
- Provide a detailed explanation
- Add relevant context
- Set an appropriate difficulty level
- Tag with relevant topics/categories

Format the response as a JSON array of questions.`;

    try {
      // Call your AI model
      const response = await fetch(process.env.AI_MODEL_ENDPOINT!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AI_MODEL_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          temperature: 0.7,
          max_tokens: 2000,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error('AI model request failed');
      }

      const data = await response.json();

      // Store the generated questions in your database
      // This is where you'd save to your database
      // For now, we'll just return them
      
      return NextResponse.json({
        questions: data.questions,
        message: 'Questions generated successfully',
      });
    } catch (error) {
      console.error('AI processing error:', error);
      return NextResponse.json(
        { error: 'Failed to process document with AI' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Helper function to chunk content for large documents
function chunkContent(content: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const sentences = content.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
} 