import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  caseId: mongoose.Types.ObjectId;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  replyCount?: number;
}

const CommentSchema = new Schema<IComment>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userAvatar: {
      type: String,
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true
    },
    likes: {
      type: [String],
      default: []
    },
    replyCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for efficient queries
CommentSchema.index({ caseId: 1, parentId: 1 });
CommentSchema.index({ createdAt: -1 });

// Instead of using pre-remove hook (which has TypeScript issues),
// we'll handle cascading deletes at the API level

// Create the model
export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema); 