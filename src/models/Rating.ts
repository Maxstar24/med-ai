import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  userId: string; // Firebase UID of the user
  caseId: mongoose.Types.ObjectId | string; // Reference to the case
  rating: number; // Rating value (1-5)
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: [true, 'Case ID is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    }
  },
  {
    timestamps: true,
  }
);

// Create a compound index for userId and caseId to ensure uniqueness (one rating per user per case)
RatingSchema.index({ userId: 1, caseId: 1 }, { unique: true });

// Prevent model recompilation when hot reloading
export const Rating = mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema); 