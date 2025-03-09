import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse } from '@/services/ai';

export async function POST(req: NextRequest) {
  try {
    let message: string;
    const contentType = req.headers.get('content-type');
    
    // Handle different request formats (JSON or FormData)
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      console.log('JSON Request body:', body);
      message = body.message || body.prompt; // Extract message or prompt field
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      console.log('Form data received');
      message = formData.get('prompt')?.toString() || formData.get('message')?.toString() || '';
      // You can also handle file uploads here if needed
    } else {
      return NextResponse.json(
        { text: '', error: 'Unsupported content type' },
        { status: 400 }
      );
    }
    
    console.log('Received request:', { message });

    if (!message) {
      return NextResponse.json(
        { text: 'Please provide a prompt for the AI to respond to.' },
        { status: 400 }
      );
    }
    
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