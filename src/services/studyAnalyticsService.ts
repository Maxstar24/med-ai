import { Types } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { 
  StudyAnalyticsModel, 
  StudyGoalModel, 
  StudyInsightModel 
} from '@/models/StudyAnalyticsModel';
import { StudyPlanModel } from '@/models/StudyPlanModel';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { 
  StudyAnalytics, 
  StudyGoal, 
  StudyInsight,
  CreateStudyGoalInput,
  RecordStudySessionInput, 
  DailyStudyStats
} from '@/models/StudyAnalytics';
import { StudySession } from '@/models/StudyPlan';

export class StudyAnalyticsService {
  /**
   * Initialize analytics for a new user
   */
  static async initializeAnalytics(userId: string) {
    try {
      await connectToDatabase();
      
      // Check if analytics already exist
      const existingAnalytics = await StudyAnalyticsModel.findOne({ userId });
      if (existingAnalytics) {
        return existingAnalytics;
      }
      
      // Create new analytics record
      const analytics = new StudyAnalyticsModel({
        userId: new Types.ObjectId(userId),
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
        averageSessionLength: 0,
        completedResources: 0,
        totalResources: 0,
        completedTopics: 0,
        totalTopics: 0,
        studySubjects: [],
        productivityByTimeOfDay: {
          morning: 0,
          afternoon: 0,
          evening: 0,
          night: 0
        },
        dailyStats: [],
        weeklyStats: [],
        monthlyStats: [],
        lastUpdated: new Date()
      });
      
      await analytics.save();
      return analytics;
    } catch (error) {
      console.error('Error initializing analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get analytics for the current authenticated user
   */
  static async getCurrentUserAnalytics() {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      let analytics = await StudyAnalyticsModel.findOne({ userId });
      
      if (!analytics) {
        analytics = await this.initializeAnalytics(userId);
      }
      
      return analytics;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get analytics for a specific user (admin only or self)
   */
  static async getUserAnalytics(userId: string) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      // Allow only if admin or self
      if (session.user.id !== userId && session.user.role !== 'admin') {
        throw new Error('Unauthorized access');
      }
      
      await connectToDatabase();
      
      let analytics = await StudyAnalyticsModel.findOne({ userId });
      
      if (!analytics) {
        analytics = await this.initializeAnalytics(userId);
      }
      
      return analytics;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }
  
  /**
   * Record a study session and update analytics
   */
  static async recordStudySession(data: RecordStudySessionInput) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const { planId, topicId, startTime, endTime, notes } = data;
      
      // Calculate duration in minutes
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      if (durationMinutes <= 0) {
        throw new Error('Invalid session duration. End time must be after start time.');
      }
      
      // Create the study session
      const studySession = {
        planId,
        topicId,
        startTime: start,
        endTime: end,
        duration: durationMinutes,
        notes
      };
      
      // Save the session to the study plan
      if (planId) {
        await StudyPlanModel.findByIdAndUpdate(
          planId,
          { $push: { sessions: studySession } }
        );
      }
      
      // Update analytics
      let analytics = await StudyAnalyticsModel.findOne({ userId });
      
      if (!analytics) {
        analytics = await this.initializeAnalytics(userId);
      }
      
      // Update total study time and session stats
      analytics.totalStudyTime += durationMinutes;
      analytics.lastUpdated = new Date();
      
      // Calculate average session length
      const totalSessions = analytics.dailyStats.reduce((sum, day) => sum + day.sessionsCount, 0) + 1;
      analytics.averageSessionLength = Math.round(analytics.totalStudyTime / totalSessions);
      
      // Update productivity by time of day
      const hour = start.getHours();
      if (hour >= 5 && hour < 12) {
        analytics.productivityByTimeOfDay.morning += durationMinutes;
      } else if (hour >= 12 && hour < 17) {
        analytics.productivityByTimeOfDay.afternoon += durationMinutes;
      } else if (hour >= 17 && hour < 22) {
        analytics.productivityByTimeOfDay.evening += durationMinutes;
      } else {
        analytics.productivityByTimeOfDay.night += durationMinutes;
      }
      
      // Update daily stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let dailyStat = analytics.dailyStats.find(stat => {
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === today.getTime();
      });
      
      if (!dailyStat) {
        dailyStat = {
          date: today,
          totalMinutes: 0,
          sessionsCount: 0,
          topicsStudied: [],
          resources: {
            completed: 0,
            total: 0
          }
        };
        analytics.dailyStats.push(dailyStat);
      }
      
      dailyStat.totalMinutes += durationMinutes;
      dailyStat.sessionsCount += 1;
      
      if (topicId && !dailyStat.topicsStudied.includes(topicId)) {
        dailyStat.topicsStudied.push(topicId);
      }
      
      // Update streak
      analytics.updateStreak(today);
      
      // Save the updated analytics
      await analytics.save();
      
      // Generate insights if appropriate
      if (durationMinutes > 60) {
        await this.createInsight(userId, {
          type: 'achievement',
          title: 'Long Study Session!',
          description: `You completed a focused study session of over ${Math.floor(durationMinutes / 60)} hour(s)!`,
          metadata: {
            duration: durationMinutes,
            date: new Date()
          }
        });
      }
      
      // Check if any goals are completed
      await this.updateGoalsProgress(userId);
      
      return { success: true, session: studySession };
    } catch (error) {
      console.error('Error recording study session:', error);
      throw error;
    }
  }
  
  /**
   * Create a study goal
   */
  static async createStudyGoal(data: CreateStudyGoalInput) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const { title, targetMinutes, targetDays, startDate, endDate } = data;
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        throw new Error('End date must be after start date');
      }
      
      // Create the goal
      const goal = new StudyGoalModel({
        userId: new Types.ObjectId(userId),
        title,
        targetMinutes,
        targetDays,
        startDate: start,
        endDate: end,
        currentProgress: 0,
        currentStreakDays: 0,
        status: 'active'
      });
      
      await goal.save();
      
      return goal;
    } catch (error) {
      console.error('Error creating study goal:', error);
      throw error;
    }
  }
  
  /**
   * Get all study goals for current user
   */
  static async getCurrentUserGoals() {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const goals = await StudyGoalModel.find({ userId }).sort({ createdAt: -1 });
      
      return goals;
    } catch (error) {
      console.error('Error getting user goals:', error);
      throw error;
    }
  }
  
  /**
   * Update progress for all active goals
   */
  static async updateGoalsProgress(userId: string) {
    try {
      await connectToDatabase();
      
      // Get active goals
      const activeGoals = await StudyGoalModel.find({ 
        userId, 
        status: 'active',
        endDate: { $gte: new Date() }
      });
      
      if (activeGoals.length === 0) {
        return;
      }
      
      // Get analytics
      const analytics = await StudyAnalyticsModel.findOne({ userId });
      if (!analytics) {
        return;
      }
      
      // Update each goal
      for (const goal of activeGoals) {
        // Calculate date ranges for the goal
        const startDate = new Date(goal.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(goal.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        const now = new Date();
        
        // Get relevant daily stats
        const relevantStats = analytics.dailyStats.filter(stat => {
          const statDate = new Date(stat.date);
          return statDate >= startDate && statDate <= (now < endDate ? now : endDate);
        });
        
        // Calculate progress
        const activeMinutes = relevantStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
        const activeDays = relevantStats.filter(stat => stat.totalMinutes > 0).length;
        
        // Calculate percentage based on time and days
        const timeProgress = Math.min(100, (activeMinutes / (goal.targetMinutes * goal.targetDays)) * 100);
        const daysProgress = Math.min(100, (activeDays / goal.targetDays) * 100);
        
        // Use the minimum as overall progress
        const overallProgress = Math.round(Math.min(timeProgress, daysProgress));
        
        // Calculate streak days
        let streakDays = 0;
        const sortedDays = relevantStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        for (let i = 0; i < sortedDays.length; i++) {
          if (sortedDays[i].totalMinutes >= goal.targetMinutes / goal.targetDays) {
            streakDays++;
          } else {
            streakDays = 0; // Reset streak if daily target not met
          }
        }
        
        // Update goal status if needed
        let status = goal.status;
        if (now > endDate) {
          status = overallProgress >= 100 ? 'completed' : 'failed';
        } else if (overallProgress >= 100) {
          status = 'completed';
          
          // Create an insight for goal completion
          await this.createInsight(userId, {
            type: 'achievement',
            title: 'Goal Achieved!',
            description: `You've successfully completed your goal: ${goal.title}`,
            metadata: {
              goalId: goal._id,
              date: new Date()
            }
          });
        }
        
        // Update the goal
        goal.currentProgress = overallProgress;
        goal.currentStreakDays = streakDays;
        goal.status = status;
        await goal.save();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating goals progress:', error);
      throw error;
    }
  }
  
  /**
   * Create a study insight
   */
  static async createInsight(userId: string, insightData: Partial<StudyInsight>) {
    try {
      await connectToDatabase();
      
      const insight = new StudyInsightModel({
        userId: new Types.ObjectId(userId),
        type: insightData.type,
        title: insightData.title,
        description: insightData.description,
        createdAt: new Date(),
        metadata: insightData.metadata || {}
      });
      
      await insight.save();
      return insight;
    } catch (error) {
      console.error('Error creating insight:', error);
      throw error;
    }
  }
  
  /**
   * Get all insights for current user
   */
  static async getCurrentUserInsights() {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const insights = await StudyInsightModel.find({ 
        userId,
        dismissedAt: { $exists: false }
      }).sort({ createdAt: -1 });
      
      return insights;
    } catch (error) {
      console.error('Error getting user insights:', error);
      throw error;
    }
  }
  
  /**
   * Dismiss an insight
   */
  static async dismissInsight(insightId: string) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the insight belongs to the user
      const insight = await StudyInsightModel.findOne({ 
        _id: insightId,
        userId 
      });
      
      if (!insight) {
        throw new Error('Insight not found or not authorized');
      }
      
      // Update the insight
      insight.dismissedAt = new Date();
      await insight.save();
      
      return { success: true };
    } catch (error) {
      console.error('Error dismissing insight:', error);
      throw error;
    }
  }

  /**
   * Generate analytical reports for a specific time range
   */
  static async generateReport(timeRange: 'week' | 'month' | 'year') {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const analytics = await StudyAnalyticsModel.findOne({ userId });
      
      if (!analytics) {
        throw new Error('Analytics not found');
      }
      
      const now = new Date();
      let startDate = new Date();
      
      // Set start date based on time range
      if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      // Filter stats within the range
      const relevantStats = analytics.dailyStats.filter(stat => {
        const statDate = new Date(stat.date);
        return statDate >= startDate && statDate <= now;
      });
      
      // Calculate report data
      const totalMinutes = relevantStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
      const sessionsCount = relevantStats.reduce((sum, stat) => sum + stat.sessionsCount, 0);
      const activeDays = relevantStats.filter(stat => stat.totalMinutes > 0).length;
      
      // Get all topics studied in this period
      const allTopics = new Set<string>();
      relevantStats.forEach(stat => {
        stat.topicsStudied.forEach(topic => allTopics.add(topic));
      });
      
      // Get all study plans for topics
      const studyPlans = await StudyPlanModel.find({
        userId,
        "topics._id": { $in: Array.from(allTopics) }
      });
      
      // Compile the report
      const report = {
        timeRange,
        period: {
          start: startDate,
          end: now
        },
        summary: {
          totalMinutes,
          sessionsCount,
          activeDays,
          averageMinutesPerDay: activeDays ? Math.round(totalMinutes / activeDays) : 0,
          topicsStudied: allTopics.size
        },
        // Add plan and topic details
        plans: studyPlans.map(plan => ({
          id: plan._id,
          title: plan.title,
          subject: plan.subject,
          topicsStudied: plan.topics
            .filter(topic => allTopics.has(topic._id.toString()))
            .map(topic => ({
              id: topic._id,
              title: topic.title,
              completed: topic.completed
            }))
        })),
        // Add daily breakdown
        dailyBreakdown: relevantStats.map(stat => ({
          date: stat.date,
          minutes: stat.totalMinutes,
          sessions: stat.sessionsCount
        }))
      };
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
} 