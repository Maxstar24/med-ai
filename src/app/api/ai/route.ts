import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse, generateStudyPlan, generateQuizQuestions } from '@/services/ai';

export async function POST(request: NextRequest) {
  try {
    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || '';
    
    let type, prompt, file, topic, numberOfQuestions;
    
    // Handle JSON requests
    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      type = jsonData.type || 'medical';
      prompt = jsonData.message || jsonData.prompt || '';
      topic = jsonData.topic || '';
      numberOfQuestions = jsonData.numberOfQuestions || 5;
      file = null;
    } 
    // Handle FormData requests
    else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      type = formData.get('type') as string || 'medical';
      prompt = formData.get('prompt') as string || '';
      file = formData.get('file') as File | null;
      topic = formData.get('topic') as string || '';
      numberOfQuestions = Number(formData.get('numberOfQuestions')) || 5;
    } 
    // Handle unsupported content types
    else {
      return NextResponse.json(
        { error: 'Unsupported content type. Please use JSON or FormData.' },
        { status: 400 }
      );
    }

    // Process file if it exists
    let fileContent = '';
    if (file) {
      fileContent = await file.text();
    }

    let enhancedPrompt = prompt;
    if (fileContent) {
      enhancedPrompt = `${prompt}\n\nContext from uploaded file:\n${fileContent}`;
    }

    let response;
    switch (type) {
      case 'medical':
        response = await generateMedicalResponse(enhancedPrompt);
        break;
      case 'study':
        response = await generateStudyPlan(topic);
        break;
      case 'quiz':
        response = await generateQuizQuestions(topic, numberOfQuestions);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid request type' },
          { status: 400 }
        );
    }

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}