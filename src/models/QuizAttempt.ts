import mongoose, { Schema, Document } from 'mongoose';

interface Answer {
  questionId: string;
  selectedAnswer: string | string[];
  isCorrect: boolean;
  timeSpent: number;
}

interface QuizAttemptDocument extends Document {
  quizId: string;
  userFirebaseUid: string;
  userId?: string;
  startedAt: Date;
  completedAt?: Date;
  score: number;
  totalQuestions: number;
  questionsAttempted: number;
  answers: Answer[];
  calculateAccuracy: () => number;
}

const QuizAttemptSchema = new Schema<QuizAttemptDocument>({
  quizId: {
    type: String,
    required: true,
  },
  userFirebaseUid: {
    type: String,
    required: true
  },
  // Add userId for backward compatibility
  userId: {
    type: String,
    required: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  questionsAttempted: {
    type: Number,
    default: 0
  },
  answers: [{
    questionId: {
      type: String,
      required: true
    },
    selectedAnswer: {
      type: Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    timeSpent: {
      type: Number,
      default: 0
    }
  }]
}, { timestamps: true });

// Create a single index on quizId
QuizAttemptSchema.index({ quizId: 1 });
// Add an index for user attempts
QuizAttemptSchema.index({ userFirebaseUid: 1 });

// Virtual for completion status
QuizAttemptSchema.virtual('isCompleted').get(function() {
  return !!this.completedAt;
});

// Virtual for completion time
QuizAttemptSchema.virtual('totalTimeSpent').get(function() {
  if (!this.completedAt) return null;
  return this.completedAt.getTime() - this.startedAt.getTime();
});

// Method to calculate accuracy
QuizAttemptSchema.methods.calculateAccuracy = function() {
  if (this.questionsAttempted === 0) return 0;
  const correctAnswers = this.answers.filter((answer: { isCorrect: boolean }) => answer.isCorrect).length;
  return (correctAnswers / this.questionsAttempted) * 100;
};

const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model<QuizAttemptDocument>('QuizAttempt', QuizAttemptSchema);

export default QuizAttempt; 