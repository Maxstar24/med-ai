import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse, streamMedicalResponse } from '@/services/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let message: string;
    let streaming = false;
    const contentType = req.headers.get('content-type');
    
    // Handle different request formats (JSON or FormData)
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      console.log('JSON Request body:', body);
      message = body.message || body.prompt; // Extract message or prompt field
      streaming = body.stream === true; // Check if streaming is requested
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      console.log('Form data received');
      message = formData.get('prompt')?.toString() || formData.get('message')?.toString() || '';
      streaming = formData.get('stream') === 'true';
      // You can also handle file uploads here if needed
    } else {
      return NextResponse.json(
        { text: '', error: 'Unsupported content type' },
        { status: 400 }
      );
    }
    
    console.log('Received request:', { message, streaming });

    if (!message) {
      return NextResponse.json(
        { text: 'Please provide a prompt for the AI to respond to.' },
        { status: 400 }
      );
    }
    
    // Handle streaming response
    if (streaming) {
      try {
        console.log('Starting streaming response...');
        const streamResult = await streamMedicalResponse(message);
        console.log('Stream result received');
        
        // Use a TransformStream for more reliable streaming
        const encoder = new TextEncoder();
        const transformStream = new TransformStream({
          async transform(chunk, controller) {
            controller.enqueue(encoder.encode(chunk));
          },
        });
        
        const writer = transformStream.writable.getWriter();
        
        // Process the stream in the background
        (async () => {
          try {
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              if (text) {
                await writer.write(text);
              }
            }
          } catch (error) {
            console.error('Error processing stream chunks:', error);
          } finally {
            writer.close();
          }
        })();
        
        // Return the readable part of the transform stream
        return new Response(transformStream.readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error) {
        console.error('Error in streaming response:', error);
        return NextResponse.json(
          { text: '', error: error instanceof Error ? error.message : 'An error occurred during streaming' },
          { status: 500 }
        );
      }
    }
    
    // Non-streaming response (original behavior)
    const response = await generateMedicalResponse(message);
    console.log('AI response generated successfully');
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in AI route:', error);
    return NextResponse.json(
      { text: '', error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}