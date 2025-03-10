import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Profile Schema
const ProfileSchema = new Schema({
  dateOfBirth: {
    type: Date,
    required: false
  },
  specialty: {
    type: String,
    required: false
  },
  experience: {
    type: String,
    required: false
  },
  bio: {
    type: String,
    required: false
  }
});

// Preferences Schema
const PreferencesSchema = new Schema({
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  language: {
    type: String,
    default: 'en'
  }
});

// User Schema
const UserSchema = new Schema({
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true // Allows null values and maintains uniqueness for non-null values
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: false, // Not required for Firebase auth
    minlength: [8, 'Password must be at least 8 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    type: ProfileSchema,
    default: {}
  },
  preferences: {
    type: PreferencesSchema,
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema); 