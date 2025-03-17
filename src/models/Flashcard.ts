import mongoose, { Schema, Document } from 'mongoose';

// Set strictQuery to false to prevent Mongoose from trying to cast query values
mongoose.set('strictQuery', false);

export interface IFlashcard extends Document {
  question: string;
  answer: string;
  explanation?: string;
  category: mongoose.Types.ObjectId;
  tags: string[];
  createdBy: string; // Firebase UID as string
  isPublic: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: Date;
  nextReviewDate?: Date;
  reviewCount: number;
  confidenceLevel: number; // 1-5 scale
  setId?: mongoose.Types.ObjectId; // ID to group flashcards in a set
  topicName?: string; // Name of the topic for the set
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'FlashcardCategory',
      required: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: String, // Changed from Schema.Types.ObjectId to String
      required: true,
      // Add a custom validator to ensure it's a string
      validate: {
        validator: function(v: any) {
          return typeof v === 'string';
        },
        message: props => `${props.value} is not a valid string!`
      }
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    lastReviewed: {
      type: Date,
    },
    nextReviewDate: {
      type: Date,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    confidenceLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    setId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    topicName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
FlashcardSchema.index({ category: 1 });
FlashcardSchema.index({ createdBy: 1 });
FlashcardSchema.index({ tags: 1 });
FlashcardSchema.index({ isPublic: 1 });
FlashcardSchema.index({ nextReviewDate: 1 });
FlashcardSchema.index({ setId: 1, topicName: 1 }); // Index for querying by set

export default mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema); 