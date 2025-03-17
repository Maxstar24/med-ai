import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse, streamMedicalResponse } from '@/services/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let message: string;
    let streaming = false;
    let imageFile: File | null = null;
    let pdfFile: File | null = null;
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
      
      // Handle file uploads
      imageFile = formData.get('image') as File | null;
      pdfFile = formData.get('pdf') as File | null;
      
      // Validate image file if present
      if (imageFile) {
        console.log('Image file received:', imageFile.name, imageFile.type, `${Math.round(imageFile.size / 1024)}KB`);
        
        // Check supported image types
        const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!supportedImageTypes.includes(imageFile.type)) {
          return NextResponse.json(
            { text: '', error: `Unsupported image format: ${imageFile.type}. Please use JPG or PNG images.` },
            { status: 400 }
          );
        }
        
        // Check file size (limit to 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { text: '', error: 'Image file is too large. Please use an image smaller than 5MB.' },
            { status: 400 }
          );
        }
      }
      
      // Validate PDF file if present
      if (pdfFile) {
        console.log('PDF file received:', pdfFile.name, pdfFile.type, `${Math.round(pdfFile.size / 1024)}KB`);
        
        // Check file type
        if (pdfFile.type !== 'application/pdf') {
          return NextResponse.json(
            { text: '', error: 'Please upload a valid PDF file.' },
            { status: 400 }
          );
        }
        
        // Check file size (limit to 10MB)
        if (pdfFile.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { text: '', error: 'PDF file is too large. Please use a PDF smaller than 10MB.' },
            { status: 400 }
          );
        }
      }
    } else {
      return NextResponse.json(
        { text: '', error: 'Unsupported content type' },
        { status: 400 }
      );
    }
    
    console.log('Received request:', { 
      message, 
      streaming, 
      hasImage: !!imageFile, 
      hasPdf: !!pdfFile 
    });

    if (!message && !imageFile && !pdfFile) {
      return NextResponse.json(
        { text: 'Please provide a prompt or upload a file for the AI to respond to.' },
        { status: 400 }
      );
    }
    
    // Handle streaming response
    if (streaming) {
      try {
        console.log('Starting streaming response...');
        const streamResult = await streamMedicalResponse(message, imageFile, pdfFile);
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
            // Try to write error message to the stream
            try {
              const errorMessage = error instanceof Error ? 
                error.message : 
                'An error occurred during streaming';
              
              // Format user-friendly error message
              let userMessage = errorMessage;
              if (errorMessage.includes('Unsupported MIME type') || errorMessage.includes('Unsupported file type')) {
                userMessage = 'The file format you uploaded is not supported. Please use JPG or PNG for images, or PDF for documents.';
              } else if (errorMessage.includes('Candidate was blocked due to SAFETY')) {
                userMessage = 'The AI could not process this request due to safety guidelines. Please try a different query or image.';
              }
              
              await writer.write(`\n\nError: ${userMessage}`);
            } catch (writeError) {
              console.error('Error writing error message to stream:', writeError);
            }
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
        
        // Format user-friendly error message
        let errorMessage = error instanceof Error ? 
          error.message : 
          'An error occurred during streaming';
        
        if (errorMessage.includes('Unsupported MIME type') || errorMessage.includes('Unsupported file type')) {
          errorMessage = 'The file format you uploaded is not supported. Please use JPG or PNG for images, or PDF for documents.';
        } else if (errorMessage.includes('Candidate was blocked due to SAFETY')) {
          errorMessage = 'The AI could not process this request due to safety guidelines. Please try a different query or image.';
        }
        
        return NextResponse.json(
          { text: '', error: errorMessage },
          { status: 500 }
        );
      }
    }
    
    // Non-streaming response (original behavior)
    try {
      const response = await generateMedicalResponse(message, imageFile, pdfFile);
      console.log('AI response generated successfully');
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Format user-friendly error message
      let errorMessage = error instanceof Error ? 
        error.message : 
        'An unknown error occurred';
      
      if (errorMessage.includes('Unsupported MIME type') || errorMessage.includes('Unsupported file type')) {
        errorMessage = 'The file format you uploaded is not supported. Please use JPG or PNG for images, or PDF for documents.';
      } else if (errorMessage.includes('Candidate was blocked due to SAFETY')) {
        errorMessage = 'The AI could not process this request due to safety guidelines. Please try a different query or image.';
      }
      
      return NextResponse.json(
        { text: '', error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in AI route:', error);
    return NextResponse.json(
      { text: '', error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}