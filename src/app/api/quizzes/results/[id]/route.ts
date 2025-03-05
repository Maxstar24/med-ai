import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Here you would typically fetch from your database
    // For now, return mock data
    const mockResult = {
      id,
      quizId: '1',
      score: 8,
      totalQuestions: 10,
      timeSpent: 600, // seconds
      completedAt: new Date().toISOString(),
      improvement: '+15%',
      streak: 3,
      answers: [
        {
          questionId: '1',
          userAnswer: 'Metoprolol',
          isCorrect: true,
          timeSpent: 45,
        },
        {
          questionId: '2',
          userAnswer: false,
          isCorrect: true,
          timeSpent: 30,
        },
        {
          questionId: '3',
          userAnswer: 'Acetylcholine',
          isCorrect: true,
          timeSpent: 60,
        }
      ],
      questions: [
        {
          id: '1',
          type: 'multiple-choice',
          question: 'Which of the following is a beta-blocker commonly used to treat hypertension?',
          options: [
            'Metoprolol',
            'Amlodipine',
            'Lisinopril',
            'Hydrochlorothiazide'
          ],
          correctAnswer: 'Metoprolol',
          explanation: 'Metoprolol is a selective beta-1 blocker used in the treatment of hypertension, angina, and heart failure. It works by blocking the action of epinephrine and norepinephrine on beta-1 receptors, primarily in the heart.',
          difficulty: 'intermediate',
          topic: 'Pharmacology',
          tags: ['cardiovascular', 'medications', 'hypertension']
        },
        {
          id: '2',
          type: 'true-false',
          question: 'The left ventricle is responsible for pumping blood to the pulmonary circulation.',
          options: ['True', 'False'],
          correctAnswer: false,
          explanation: 'This is false. The right ventricle pumps blood to the pulmonary circulation, while the left ventricle pumps blood to the systemic circulation.',
          difficulty: 'beginner',
          topic: 'Cardiology',
          tags: ['anatomy', 'circulation']
        },
        {
          id: '3',
          type: 'multiple-choice',
          question: 'What is the primary neurotransmitter involved in the parasympathetic nervous system?',
          options: [
            'Acetylcholine',
            'Norepinephrine',
            'Dopamine',
            'Serotonin'
          ],
          correctAnswer: 'Acetylcholine',
          explanation: 'Acetylcholine is the primary neurotransmitter of the parasympathetic nervous system, responsible for the "rest and digest" response.',
          difficulty: 'intermediate',
          topic: 'Neurology',
          tags: ['neurotransmitters', 'autonomic nervous system']
        }
      ]
    };

    return NextResponse.json({
      result: mockResult
    });
  } catch (error) {
    console.error('Quiz result API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz result' },
      { status: 500 }
    );
  }
} 