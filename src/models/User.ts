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

// Achievement Schema
const AchievementSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
  category: { 
    type: String, 
    enum: ['general', 'flashcards', 'quizzes', 'streak'], 
    default: 'general' 
  }
});

// Badge Schema
const BadgeSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  tier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum'], 
    default: 'bronze' 
  }
});

// Specialty Progress Schema
const SpecialtyProgressSchema = new Schema({
  specialtyId: { type: String, required: true },
  name: { type: String, required: true },
  progress: { type: Number, default: 0 }, // 0-100 percentage
  cardsCompleted: { type: Number, default: 0 },
  quizzesCompleted: { type: Number, default: 0 },
  lastStudied: { type: Date }
});

// Gamification Schema
const GamificationSchema = new Schema({
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [AchievementSchema],
  badges: [BadgeSchema],
  specialtyProgress: [SpecialtyProgressSchema],
  
  // Streak related fields
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActive: { type: Date },
  dailyGoal: { type: Number, default: 10 }, // Number of cards/questions per day
  dailyProgress: { type: Number, default: 0 },
  
  // Stats and metrics
  totalCardsStudied: { type: Number, default: 0 },
  totalQuizzesTaken: { type: Number, default: 0 },
  totalCorrectAnswers: { type: Number, default: 0 },
  totalIncorrectAnswers: { type: Number, default: 0 },
  averageAccuracy: { type: Number, default: 0 }, // 0-100 percentage
  studyTime: { type: Number, default: 0 } // Total minutes spent studying
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
  gamification: {
    type: GamificationSchema,
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
UserSchema.methods.comparePassword = async function(candidatePassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Gamification Methods

// Calculate level based on XP
UserSchema.methods.calculateLevel = function() {
  // Formula: Level = 1 + floor(√(XP / 100))
  // This creates a curve where each level requires more XP than the last
  const level = 1 + Math.floor(Math.sqrt(this.gamification.xp / 100));
  this.gamification.level = level;
  return level;
};

// Add XP and update level
UserSchema.methods.addXP = function(amount: number) {
  this.gamification.xp += amount;
  this.calculateLevel();
  return this.gamification.xp;
};

// Update streak based on activity
UserSchema.methods.updateStreak = function() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if user was active in the last 24 hours
  if (!this.gamification.lastActive) {
    this.gamification.currentStreak = 1;
  } else if (this.gamification.lastActive.toDateString() === today.toDateString()) {
    // Already marked active today, no change
  } else if (this.gamification.lastActive.toDateString() === yesterday.toDateString()) {
    // Active yesterday, increment streak
    this.gamification.currentStreak += 1;
  } else {
    // Streak broken, reset
    this.gamification.currentStreak = 1;
  }
  
  // Update longest streak if current is higher
  if (this.gamification.currentStreak > this.gamification.longestStreak) {
    this.gamification.longestStreak = this.gamification.currentStreak;
  }
  
  this.gamification.lastActive = today;
  return this.gamification.currentStreak;
};

// Update daily progress
UserSchema.methods.updateDailyProgress = function(amount: number) {
  // Reset progress if it's a new day
  const today = new Date();
  if (!this.gamification.lastActive || 
      this.gamification.lastActive.toDateString() !== today.toDateString()) {
    this.gamification.dailyProgress = 0;
  }
  
  // Add progress
  this.gamification.dailyProgress += amount;
  this.gamification.lastActive = today;
  
  // Check if daily goal met
  return this.gamification.dailyProgress >= this.gamification.dailyGoal;
};

export default mongoose.models.User || mongoose.model('User', UserSchema); 