interface AIRequestOptions {
  message: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIResponse {
  message: string;
  tokens?: number;
  error?: string;
}

export async function queryAI(options: AIRequestOptions): Promise<AIResponse> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: options.message,
        context: options.context,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get AI response');
    }

    const data = await response.json();
    return {
      message: data.message,
      tokens: data.tokens,
    };
  } catch (error) {
    console.error('AI query error:', error);
    return {
      message: '',
      error: error instanceof Error ? error.message : 'Failed to get AI response',
    };
  }
}

export function formatMedicalPrompt(question: string): string {
  return `As a medical AI assistant, please provide a detailed and accurate response to the following question:

${question}

Please ensure your response:
1. Is evidence-based and clinically accurate
2. Uses proper medical terminology
3. Includes relevant explanations and examples
4. Cites any specific guidelines or studies when applicable
5. Avoids overly technical language unless necessary

Response:`;
}

export function formatCasePrompt(caseDetails: string): string {
  return `As a medical AI assistant, please analyze this clinical case:

${caseDetails}

Please provide:
1. Differential diagnoses
2. Key findings that support each diagnosis
3. Recommended diagnostic tests
4. Initial management plan
5. Important considerations and red flags

Analysis:`;
}

export function formatFeedbackPrompt(answer: string, correctAnswer: string): string {
  return `As a medical education AI assistant, please provide detailed feedback on this student's answer:

Student's Answer:
${answer}

Correct Answer:
${correctAnswer}

Please provide:
1. Assessment of accuracy
2. Key concepts correctly identified
3. Important points missed or incorrect
4. Suggestions for improvement
5. Additional learning resources or topics to review

Feedback:`;
} 