import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#3498db'
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

categorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema); 