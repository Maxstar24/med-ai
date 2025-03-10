import mongoose, { Document, Schema } from 'mongoose';
import User from './User';

export interface ICase extends Document {
  title: string;
  description: string;
  content: string; // Markdown content including tables, images, etc.
  isAIGenerated: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  userFirebaseUid: string; // Add Firebase UID
  category: string;
  tags: string[];
  mediaUrls: string[]; // URLs to images or other media
  createdAt: Date;
  updatedAt: Date;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  specialties: string[]; // Medical specialties this case relates to
  answers: {
    question: string;
    answer: string;
    explanation?: string;
    imageUrl?: string;
  }[];
}

const CaseSchema = new Schema<ICase>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    userFirebaseUid: {
      type: String,
      required: false, // Not required for backward compatibility
      index: true, // Add index for faster queries
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    mediaUrls: [{
      type: String,
      trim: true,
    }],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    specialties: [{
      type: String,
      trim: true,
    }],
    answers: [{
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: String,
        required: true,
      },
      explanation: {
        type: String,
      },
      imageUrl: {
        type: String,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation when hot reloading
export const Case = mongoose.models.Case || mongoose.model<ICase>('Case', CaseSchema); 