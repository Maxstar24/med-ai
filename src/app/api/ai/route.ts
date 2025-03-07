import { NextRequest, NextResponse } from 'next/server';
import { generateMedicalResponse, generateQuizQuestions, generateStudyPlan } from '@/services/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, action, topic, numberOfQuestions } = body;
    
    let response;
    
    console.log('Received request:', { action, prompt, topic, numberOfQuestions });

    switch (action) {
      case 'medical':
        response = await generateMedicalResponse(prompt);
        break;
      case 'study':
        response = await generateStudyPlan(topic);
        break;
      case 'quiz':
        response = await generateQuizQuestions(topic, numberOfQuestions);
        break;
      default:
        response = await generateMedicalResponse(prompt);
    }
    
    console.log('AI response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in AI route:', error);
    return NextResponse.json(
      { text: '', error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}