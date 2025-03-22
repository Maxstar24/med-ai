// Define interfaces for the StudyAnalytics model

export interface DailyStudyStats {
  date: Date;
  totalMinutes: number;
  sessionsCount: number;
  topicsStudied: string[];
  resources: {
    completed: number;
    total: number;
  };
}

export interface WeeklyStudyStats {
  weekStartDate: Date;
  weekEndDate: Date;
  dailyStats: DailyStudyStats[];
  totalMinutes: number;
  averageMinutesPerDay: number;
  mostProductiveDay?: Date;
  completedTopics: number;
  inProgressTopics: number;
}

export interface MonthlyStudyStats {
  month: number; // 0-11
  year: number;
  weeklyStats: WeeklyStudyStats[];
  totalMinutes: number;
  averageMinutesPerDay: number;
  mostProductiveWeek?: {
    weekStartDate: Date;
    weekEndDate: Date;
  };
  completedTopics: number;
  topicsProgress: {
    topicId: string;
    topicTitle: string;
    percentComplete: number;
  }[];
}

export interface StudyAnalytics {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number; // in minutes
  averageSessionLength: number; // in minutes
  completedResources: number;
  totalResources: number;
  completedTopics: number;
  totalTopics: number;
  studySubjects: {
    subject: string;
    timeSpent: number; // in minutes
    percentageOfTotal: number;
  }[];
  productivityByTimeOfDay: {
    morning: number; // percentage (0-100)
    afternoon: number;
    evening: number;
    night: number;
  };
  dailyStats: DailyStudyStats[];
  weeklyStats: WeeklyStudyStats[];
  monthlyStats: MonthlyStudyStats[];
  lastUpdated: Date;
}

export interface StudyInsight {
  id: string;
  userId: string;
  type: 'recommendation' | 'achievement' | 'pattern' | 'milestone';
  title: string;
  description: string;
  createdAt: Date;
  dismissedAt?: Date;
  metadata?: {
    [key: string]: any;
  };
}

export interface StudyGoal {
  id: string;
  userId: string;
  title: string;
  targetMinutes: number;
  targetDays: number;
  startDate: Date;
  endDate: Date;
  currentProgress: number; // percentage (0-100)
  currentStreakDays: number;
  status: 'active' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudyGoalInput {
  title: string;
  targetMinutes: number;
  targetDays: number;
  startDate: Date;
  endDate: Date;
}

export interface UpdateStudyGoalInput {
  title?: string;
  targetMinutes?: number;
  targetDays?: number;
  endDate?: Date;
  status?: 'active' | 'completed' | 'failed';
}

export interface StudyAnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  subject?: string;
  groupBy?: 'day' | 'week' | 'month';
}
