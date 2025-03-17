import mongoose, { Schema, Document } from 'mongoose';

// Set strictQuery to false to prevent Mongoose from trying to cast query values
mongoose.set('strictQuery', false);

export interface IFlashcardSession extends Document {
  user: string; // Firebase UID as string
  category?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedCards: number;
  cards: {
    card: mongoose.Types.ObjectId;
    result: 'correct' | 'incorrect' | 'skipped';
    confidenceBefore?: number;
    confidenceAfter?: number;
    timeSpent?: number; // in seconds
  }[];
  totalTimeSpent?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSessionSchema = new Schema<IFlashcardSession>(
  {
    user: {
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
    category: {
      type: Schema.Types.ObjectId,
      ref: 'FlashcardCategory',
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    cardsStudied: {
      type: Number,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    incorrectAnswers: {
      type: Number,
      default: 0,
    },
    skippedCards: {
      type: Number,
      default: 0,
    },
    cards: [{
      card: {
        type: Schema.Types.ObjectId,
        ref: 'Flashcard',
        required: true,
      },
      result: {
        type: String,
        enum: ['correct', 'incorrect', 'skipped'],
        required: true,
      },
      confidenceBefore: {
        type: Number,
        min: 1,
        max: 5,
      },
      confidenceAfter: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeSpent: {
        type: Number, // in seconds
      },
    }],
    totalTimeSpent: {
      type: Number, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
FlashcardSessionSchema.index({ user: 1 });
FlashcardSessionSchema.index({ category: 1 });
FlashcardSessionSchema.index({ startTime: -1 });

export default mongoose.models.FlashcardSession || 
  mongoose.model<IFlashcardSession>('FlashcardSession', FlashcardSessionSchema); 