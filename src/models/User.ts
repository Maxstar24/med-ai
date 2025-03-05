import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Profile Schema
const ProfileSchema = new mongoose.Schema({
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return v <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other', 'prefer-not-to-say'],
      message: '{VALUE} is not a valid gender option'
    }
  },
  education: {
    level: {
      type: String,
      enum: {
        values: ['high_school', 'undergraduate', 'graduate', 'phd', 'other'],
        message: '{VALUE} is not a valid education level'
      }
    },
    field: {
      type: String,
      trim: true
    },
    institution: {
      type: String,
      trim: true
    },
    graduationYear: {
      type: Number,
      min: [1900, 'Year must be after 1900'],
      max: [2100, 'Year must be before 2100']
    }
  },
  interests: [{
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be longer than 500 characters'],
    trim: true
  },
  socialLinks: {
    linkedin: {
      type: String,
      trim: true,
      match: [/^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/, 'Please provide a valid URL']
    },
    github: {
      type: String,
      trim: true,
      match: [/^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/, 'Please provide a valid URL']
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  _id: false,
  timestamps: true 
});

// Preferences Schema
const PreferencesSchema = new mongoose.Schema({
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    appointments: { type: Boolean, default: true },
    results: { type: Boolean, default: true }
  },
  language: { 
    type: String, 
    default: 'en',
    enum: {
      values: ['en', 'es', 'fr'],
      message: '{VALUE} is not a supported language'
    }
  },
  theme: { 
    type: String, 
    default: 'light',
    enum: {
      values: ['light', 'dark', 'system'],
      message: '{VALUE} is not a valid theme'
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  _id: false,
  timestamps: true 
});

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