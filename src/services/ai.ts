import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export interface AIResponse {
  text: string;
  error?: string;
}

export async function generateMedicalResponse(prompt: string): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Add medical context to the prompt and specify markdown format with table support
    const medicalPrompt = `As a medical education AI assistant, please help with the following: ${prompt}
    
    Please provide accurate, evidence-based information and include relevant medical terminology where appropriate. 
    Format your response using proper markdown, including:
    - Headers and subheaders for organization
    - Lists where appropriate
    - Tables for structured data
    - Bold or italics for emphasis
    - Code blocks for any technical information`;

    const result = await model.generateContent(medicalPrompt);
    return { text: result.response.text() };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// New function for streaming responses
export async function streamMedicalResponse(prompt: string) {
  try {
    console.log('Starting streamMedicalResponse with prompt:', prompt);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Add medical context to the prompt and specify markdown format with table support
    const medicalPrompt = `As a medical education AI assistant, please help with the following: ${prompt}
    
    Please provide accurate, evidence-based information and include relevant medical terminology where appropriate. 
    Format your response using proper markdown, including:
    - Headers and subheaders for organization
    - Lists where appropriate
    - Tables for structured data
    - Bold or italics for emphasis
    - Code blocks for any technical information`;

    console.log('Calling generateContentStream...');
    // Create a streaming response
    const result = await model.generateContentStream(medicalPrompt);
    console.log('Stream created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error generating streaming AI response:', error);
    throw error;
  }
}

export async function generateStudyPlan(topic: string): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const studyPrompt = `Create a comprehensive study plan for medical students learning about ${topic}.
    
    Please include:
    1. Key concepts to master
    2. Suggested learning resources
    3. Practice questions or case studies
    4. Common pitfalls to avoid
    5. Clinical correlations
    
    Format the response in a clear, structured way that's easy to follow.`;

    const result = await model.generateContent(studyPrompt);
    return { text: result.response.text() };
  } catch (error) {
    console.error('Error generating study plan:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function generateQuizQuestions(topic: string, numberOfQuestions: number = 5): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const quizPrompt = `Generate ${numberOfQuestions} multiple-choice questions about ${topic} for medical students.
    
    For each question:
    1. Provide the question stem
    2. List 4 answer choices (A, B, C, D)
    3. Indicate the correct answer
    4. Include a brief explanation of why the answer is correct
    
    Format each question clearly and ensure the difficulty is appropriate for medical students.`;

    const result = await model.generateContent(quizPrompt);
    return { text: result.response.text() };
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}