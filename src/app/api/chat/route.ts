import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.string().optional(),
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

    // Validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // For now, we'll return a mock response
    // Later, this will be replaced with actual AI model integration
    const mockResponses = {
      "Explain the pathophysiology of Type 2 Diabetes": 
        "Type 2 Diabetes is characterized by insulin resistance and relative insulin deficiency. The pathophysiology involves:\n\n1. Insulin Resistance:\n- Cells become less responsive to insulin\n- Reduced glucose uptake in muscle and fat tissue\n- Increased hepatic glucose production\n\n2. Beta Cell Dysfunction:\n- Initially increased insulin production to compensate\n- Eventually decreased insulin secretion\n- Progressive beta cell failure\n\n3. Metabolic Effects:\n- Hyperglycemia\n- Impaired glucose utilization\n- Increased lipolysis\n\nWould you like to learn more about any specific aspect?",
      
      "What are the key differences between systolic and diastolic heart failure?":
        "The main differences between systolic and diastolic heart failure are:\n\n1. Systolic Heart Failure (HFrEF):\n- Reduced ejection fraction (<40%)\n- Impaired contractility\n- Dilated ventricles\n- Common causes: CAD, MI, cardiomyopathy\n\n2. Diastolic Heart Failure (HFpEF):\n- Preserved ejection fraction (>50%)\n- Impaired relaxation/filling\n- Normal or thickened ventricles\n- Common causes: Hypertension, aging, diabetes\n\nWould you like to explore the treatment approaches for either type?",
      
      "Describe the mechanism of action of beta-blockers":
        "Beta-blockers work by blocking beta-adrenergic receptors. Their mechanism includes:\n\n1. Receptor Blockade:\n- β1 (cardiac) effects: ↓ heart rate, contractility\n- β2 (smooth muscle) effects: bronchial/vascular effects\n\n2. Cardiovascular Effects:\n- Reduced cardiac output\n- Decreased blood pressure\n- Anti-arrhythmic properties\n\n3. Clinical Applications:\n- Hypertension\n- Heart failure\n- Angina\n- Arrhythmias\n\nWould you like to discuss specific beta-blockers or their side effects?",
      
      "What are the clinical features of Kawasaki disease?":
        "Kawasaki disease presents with characteristic clinical features:\n\n1. Principal Clinical Findings (5/6 required):\n- Fever ≥5 days\n- Bilateral conjunctival injection\n- Oral changes\n- Polymorphous rash\n- Extremity changes\n- Cervical lymphadenopathy\n\n2. Additional Features:\n- Cardiovascular complications\n- GI symptoms\n- Joint pain\n\n3. Laboratory Findings:\n- Elevated inflammatory markers\n- Thrombocytosis\n- Anemia\n\nWould you like to discuss the treatment approach or complications?"
    };

    // Find the closest matching response or generate a default one
    const response = mockResponses[validatedData.message as keyof typeof mockResponses] || 
      `Let me help you understand ${validatedData.message}. This is a simulated response for demonstration purposes. In the full version, this will be powered by a sophisticated medical AI model that can provide detailed, accurate information about medical concepts, diseases, treatments, and clinical guidelines.`;

    return NextResponse.json({ message: response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 