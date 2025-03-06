import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse, generateStudyPlan, generateQuizQuestions } from '@/services/ai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const prompt = formData.get('prompt') as string;
    const file = formData.get('file') as File | null;
    const topic = formData.get('topic') as string;
    const numberOfQuestions = Number(formData.get('numberOfQuestions')) || 5;

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