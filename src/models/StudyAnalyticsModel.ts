import mongoose, { Schema } from 'mongoose';
import { StudyAnalytics, StudyGoal, StudyInsight } from './StudyAnalytics';

// Daily Stats Schema
const DailyStudyStatsSchema = new Schema({
  date: {
    type: Date,
    required: true
  },
  totalMinutes: {
    type: Number,
    default: 0
  },
  sessionsCount: {
    type: Number,
    default: 0
  },
  topicsStudied: [String],
  resources: {
    completed: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  }
});

// Weekly Stats Schema
const WeeklyStudyStatsSchema = new Schema({
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  dailyStats: [DailyStudyStatsSchema],
  totalMinutes: {
    type: Number,
    default: 0
  },
  averageMinutesPerDay: {
    type: Number,
    default: 0
  },
  mostProductiveDay: Date,
  completedTopics: {
    type: Number,
    default: 0
  },
  inProgressTopics: {
    type: Number,
    default: 0
  }
});

// Topic Progress Schema
const TopicProgressSchema = new Schema({
  topicId: {
    type: String,
    required: true
  },
  topicTitle: {
    type: String,
    required: true
  },
  percentComplete: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

// Monthly Stats Schema
const MonthlyStudyStatsSchema = new Schema({
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  year: {
    type: Number,
    required: true
  },
  weeklyStats: [WeeklyStudyStatsSchema],
  totalMinutes: {
    type: Number,
    default: 0
  },
  averageMinutesPerDay: {
    type: Number,
    default: 0
  },
  mostProductiveWeek: {
    weekStartDate: Date,
    weekEndDate: Date
  },
  completedTopics: {
    type: Number,
    default: 0
  },
  topicsProgress: [TopicProgressSchema]
});

// Subject Schema
const StudySubjectSchema = new Schema({
  subject: {
    type: String,
    required: true
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  percentageOfTotal: {
    type: Number,
    default: 0
  }
});

// StudyAnalytics Schema
const StudyAnalyticsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  totalStudyTime: {
    type: Number,
    default: 0
  },
  averageSessionLength: {
    type: Number,
    default: 0
  },
  completedResources: {
    type: Number,
    default: 0
  },
  totalResources: {
    type: Number,
    default: 0
  },
  completedTopics: {
    type: Number,
    default: 0
  },
  totalTopics: {
    type: Number,
    default: 0
  },
  studySubjects: [StudySubjectSchema],
  productivityByTimeOfDay: {
    morning: {
      type: Number,
      default: 0
    },
    afternoon: {
      type: Number,
      default: 0
    },
    evening: {
      type: Number,
      default: 0
    },
    night: {
      type: Number,
      default: 0
    }
  },
  dailyStats: [DailyStudyStatsSchema],
  weeklyStats: [WeeklyStudyStatsSchema],
  monthlyStats: [MonthlyStudyStatsSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// StudyInsight Schema
const StudyInsightSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['recommendation', 'achievement', 'pattern', 'milestone'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  dismissedAt: Date,
  metadata: {
    type: Object,
    default: {}
  }
});

// StudyGoal Schema
const StudyGoalSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  targetMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  targetDays: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  currentProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStreakDays: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// Update streak method
StudyAnalyticsSchema.methods.updateStreak = function(studyDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format the study date to midnight
  const studyDateMidnight = new Date(studyDate);
  studyDateMidnight.setHours(0, 0, 0, 0);
  
  // If study date is today, increment streak if yesterday was active
  if (studyDateMidnight.getTime() === today.getTime()) {
    // Check if there's a record for yesterday
    const hasYesterdayRecord = this.dailyStats.some((stat: any) => {
      const statDate = new Date(stat.date);
      statDate.setHours(0, 0, 0, 0);
      return statDate.getTime() === yesterday.getTime();
    });
    
    if (hasYesterdayRecord) {
      this.currentStreak += 1;
    } else {
      // No activity yesterday, reset streak to 1 (today)
      this.currentStreak = 1;
    }
  }
  
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
};

// Export the models
export const StudyAnalyticsModel = 
  mongoose.models.StudyAnalytics || mongoose.model<StudyAnalytics & mongoose.Document>('StudyAnalytics', StudyAnalyticsSchema);

export const StudyInsightModel = 
  mongoose.models.StudyInsight || mongoose.model<StudyInsight & mongoose.Document>('StudyInsight', StudyInsightSchema);

export const StudyGoalModel = 
  mongoose.models.StudyGoal || mongoose.model<StudyGoal & mongoose.Document>('StudyGoal', StudyGoalSchema); 