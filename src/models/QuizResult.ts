import mongoose, { Schema, Document, Types } from 'mongoose';

// Define interfaces for type safety
interface IAnswer {
  questionId: Types.ObjectId;
  userAnswer: string | number | boolean;
  isCorrect: boolean;
  timeSpent: number;
}

export interface IQuizResult extends Document {
  quizId: Types.ObjectId;
  userId: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: IAnswer[];
  completedAt: Date;
  improvement: string | null;
  streak: number;
  percentageScore: number;
}

// Define the Answer schema for individual question responses
const AnswerSchema = new Schema<IAnswer>({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  userAnswer: {
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
});

// Define the QuizResult schema
const QuizResultSchema = new Schema<IQuizResult>({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  answers: {
    type: [AnswerSchema],
    required: true,
    validate: {
      validator: function(answers: IAnswer[]) {
        return answers.length > 0;
      },
      message: 'At least one answer is required'
    }
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  improvement: {
    type: String,
    default: null
  },
  streak: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: true
});

// Calculate percentage score as a virtual property
QuizResultSchema.virtual('percentageScore').get(function(this: IQuizResult) {
  return Number((this.score / this.totalQuestions * 100).toFixed(2));
});

// Ensure virtual fields are included when converting to JSON
QuizResultSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Add index for common queries
QuizResultSchema.index({ userId: 1, completedAt: -1 });
QuizResultSchema.index({ quizId: 1, userId: 1 });

// Check if the model already exists to prevent overwriting
export default mongoose.models.QuizResult || mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);