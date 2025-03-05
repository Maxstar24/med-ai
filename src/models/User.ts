import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Profile Schema
const ProfileSchema = new mongoose.Schema({
  // Add any profile fields you need
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable _id for embedded document

// Preferences Schema
const PreferencesSchema = new mongoose.Schema({
  // Add any preferences fields you need
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable _id for embedded document

// User Schema
const UserSchema = new mongoose.Schema({
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
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters']
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
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password; // Remove password from JSON
      return ret;
    }
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to check password
UserSchema.methods.comparePassword = async function(candidatePassword: string) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Export the model
const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User; 