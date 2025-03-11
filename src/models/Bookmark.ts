import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  userId: string; // Firebase UID of the user
  caseId: mongoose.Types.ObjectId | string; // Reference to the case
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
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
    }
  },
  {
    timestamps: true,
  }
);

// Create a compound index for userId and caseId to ensure uniqueness
BookmarkSchema.index({ userId: 1, caseId: 1 }, { unique: true });

// Prevent model recompilation when hot reloading
export const Bookmark = mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema); 