import mongoose, { Schema, Document } from 'mongoose';

// Set strictQuery to false to prevent Mongoose from trying to cast query values
mongoose.set('strictQuery', false);

export interface IFlashcardCategory extends Document {
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdBy: string; // Firebase UID as string
  isPublic: boolean;
  flashcardCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardCategorySchema = new Schema<IFlashcardCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#4f46e5', // Default indigo color
    },
    icon: {
      type: String,
      default: 'book', // Default icon
    },
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
    flashcardCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
FlashcardCategorySchema.index({ createdBy: 1 });
FlashcardCategorySchema.index({ isPublic: 1 });
FlashcardCategorySchema.index({ name: 'text' });

export default mongoose.models.FlashcardCategory || 
  mongoose.model<IFlashcardCategory>('FlashcardCategory', FlashcardCategorySchema); 