import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the Question interface
interface IQuestion {
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching';
  question: string;
  options: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  tags: string[];
}

// Define the Quiz interface
export interface IQuiz extends Document {
  title: string;
  description: string;
  questions: IQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  createdBy: Types.ObjectId;
  userFirebaseUid: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
}

// Define the Question schema
const QuestionSchema = new Schema<IQuestion>({
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'fill-in-blank', 'matching'],
    required: true
  },
  question: {
    type: String, 
    required: true
  },
  options: {
    type: [String],
    required: true
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  }
});

// Define the Quiz schema
const QuizSchema = new Schema<IQuiz>({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  questions: {
    type: [QuestionSchema],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userFirebaseUid: {
    type: String,
    required: false,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate questionCount as a virtual property
QuizSchema.virtual('questionCount').get(function(this: IQuiz) {
  return this.questions.length;
});

// Ensure virtual fields are included when converting to JSON
QuizSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Check if the model already exists to prevent overwriting
export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);