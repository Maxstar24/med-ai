import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export interface AIResponse {
  text: string;
  error?: string;
}

async function fileToGenerativePart(file: File): Promise<Part> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Determine MIME type based on file extension
  const fileType = file.name.split('.').pop()?.toLowerCase();
  let mimeType = file.type;
  
  if (!mimeType) {
    // Fallback MIME types if not provided
    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png'].includes(fileType || '')) {
      mimeType = `image/${fileType}`;
    }
  }
  
  // Check for unsupported file types
  if (mimeType === 'image/gif') {
    throw new Error('GIF images are not supported by the AI model. Please use JPG or PNG images instead.');
  }
  
  // Validate supported MIME types
  const supportedMimeTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'application/pdf'
  ];
  
  if (!supportedMimeTypes.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Please use JPG, PNG, or PDF files.`);
  }
  
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mimeType
    }
  } as Part;
}

export async function generateMedicalResponse(
  prompt: string,
  imageFile?: File | null,
  pdfFile?: File | null
): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-pro-exp-02-05",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
    
    // Add medical context to the prompt and specify markdown format with table support
    const medicalPrompt = `As a medical education AI assistant for healthcare professionals and medical students, please help with the following: ${prompt}
    
    Please provide accurate, evidence-based information and include relevant medical terminology where appropriate.
    This is for educational purposes in a medical context.
    Format your response using proper markdown, including:
    - Headers and subheaders for organization
    - Lists where appropriate
    - Tables for structured data
    - Bold or italics for emphasis
    - Code blocks for any technical information`;

    let result;
    
    // Handle different content types
    if (imageFile || pdfFile) {
      const parts: Part[] = [{ text: medicalPrompt }];
      
      // Add image if provided
      if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        parts.push(imagePart);
        parts.push({ text: "Please analyze this medical image and incorporate relevant findings into your response. This is for medical education purposes only." });
      }
      
      // Add PDF if provided
      if (pdfFile) {
        const pdfPart = await fileToGenerativePart(pdfFile);
        parts.push(pdfPart);
        parts.push({ text: "Please analyze this medical document and incorporate relevant information into your response. This is for medical education purposes only." });
      }
      
      result = await model.generateContent(parts);
    } else {
      result = await model.generateContent(medicalPrompt);
    }

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
export async function streamMedicalResponse(
  prompt: string,
  imageFile?: File | null,
  pdfFile?: File | null
) {
  try {
    console.log('Starting streamMedicalResponse with prompt:', prompt);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-pro-exp-02-05",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });
    
    // Add medical context to the prompt and specify markdown format with table support
    const medicalPrompt = `As a medical education AI assistant for healthcare professionals and medical students, please help with the following: ${prompt}
    
    Please provide accurate, evidence-based information and include relevant medical terminology where appropriate.
    This is for educational purposes in a medical context.
    Format your response using proper markdown, including:
    - Headers and subheaders for organization
    - Lists where appropriate
    - Tables for structured data
    - Bold or italics for emphasis
    - Code blocks for any technical information`;

    console.log('Calling generateContentStream...');
    
    // Handle different content types
    if (imageFile || pdfFile) {
      const parts: Part[] = [{ text: medicalPrompt }];
      
      // Add image if provided
      if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        parts.push(imagePart);
        parts.push({ text: "Please analyze this medical image and incorporate relevant findings into your response. This is for medical education purposes only." });
      }
      
      // Add PDF if provided
      if (pdfFile) {
        const pdfPart = await fileToGenerativePart(pdfFile);
        parts.push(pdfPart);
        parts.push({ text: "Please analyze this medical document and incorporate relevant information into your response. This is for medical education purposes only." });
      }
      
      // Create a streaming response
      const result = await model.generateContentStream(parts);
      console.log('Stream created successfully with media:', result);
      return result;
    } else {
      // Create a streaming response
      const result = await model.generateContentStream(medicalPrompt);
      console.log('Stream created successfully:', result);
      return result;
    }
  } catch (error) {
    console.error('Error generating streaming AI response:', error);
    throw error;
  }
}

export async function generateStudyPlan(topic: string): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-pro-exp-02-05",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ]
    });
    
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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-pro-exp-02-05",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ]
    });
    
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