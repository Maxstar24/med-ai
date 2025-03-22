import {
  StudyAnalytics,
  DailyStudyStats,
  WeeklyStudyStats,
  MonthlyStudyStats,
  StudyInsight,
  StudyGoal,
  CreateStudyGoalInput,
  UpdateStudyGoalInput,
  StudyAnalyticsFilter
} from '@/models/StudyAnalytics';
import { v4 as uuidv4 } from 'uuid';

// Mock database for demonstration - would be replaced by actual database calls
const studyAnalytics: Record<string, StudyAnalytics> = {};
const studyInsights: StudyInsight[] = [];
const studyGoals: StudyGoal[] = [];

// Initialize user analytics if they don't exist
function initializeUserAnalytics(userId: string): StudyAnalytics {
  if (!studyAnalytics[userId]) {
    studyAnalytics[userId] = {
      id: uuidv4(),
      userId,
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
    };
  }
  return studyAnalytics[userId];
}

export async function getUserAnalytics(userId: string): Promise<StudyAnalytics> {
  return initializeUserAnalytics(userId);
}

export async function recordStudySession(
  userId: string,
  subject: string,
  topicId: string,
  topicTitle: string,
  startTime: Date,
  endTime: Date,
  completedResources: number = 0,
  totalResources: number = 0
): Promise<StudyAnalytics> {
  const analytics = initializeUserAnalytics(userId);
  const now = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // in minutes
  
  // Update total study time
  analytics.totalStudyTime += duration;
  
  // Update resources count
  analytics.completedResources += completedResources;
  analytics.totalResources += totalResources;
  
  // Update study subjects
  const subjectIndex = analytics.studySubjects.findIndex(s => s.subject === subject);
  if (subjectIndex >= 0) {
    analytics.studySubjects[subjectIndex].timeSpent += duration;
  } else {
    analytics.studySubjects.push({
      subject,
      timeSpent: duration,
      percentageOfTotal: 0 // Will be recalculated
    });
  }
  
  // Recalculate subject percentages
  analytics.studySubjects.forEach(subj => {
    subj.percentageOfTotal = Math.round((subj.timeSpent / analytics.totalStudyTime) * 100);
  });
  
  // Update productivity by time of day
  const hour = startTime.getHours();
  if (hour >= 5 && hour < 12) {
    analytics.productivityByTimeOfDay.morning += duration;
  } else if (hour >= 12 && hour < 17) {
    analytics.productivityByTimeOfDay.afternoon += duration;
  } else if (hour >= 17 && hour < 22) {
    analytics.productivityByTimeOfDay.evening += duration;
  } else {
    analytics.productivityByTimeOfDay.night += duration;
  }
  
  // Update average session length
  const sessionCount = analytics.dailyStats.reduce((count, day) => count + day.sessionsCount, 0) + 1;
  analytics.averageSessionLength = Math.round(analytics.totalStudyTime / sessionCount);
  
  // Update streak
  updateStreak(analytics);
  
  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dailyStats = analytics.dailyStats.find(day => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() === today.getTime();
  });
  
  if (!dailyStats) {
    dailyStats = {
      date: today,
      totalMinutes: 0,
      sessionsCount: 0,
      topicsStudied: [],
      resources: {
        completed: 0,
        total: 0
      }
    };
    analytics.dailyStats.push(dailyStats);
  }
  
  dailyStats.totalMinutes += duration;
  dailyStats.sessionsCount += 1;
  if (!dailyStats.topicsStudied.includes(topicTitle)) {
    dailyStats.topicsStudied.push(topicTitle);
  }
  dailyStats.resources.completed += completedResources;
  dailyStats.resources.total += totalResources;
  
  // Limit daily stats history to last 30 days
  analytics.dailyStats = analytics.dailyStats
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 30);
  
  // Update weekly stats
  updateWeeklyStats(analytics);
  
  // Update monthly stats
  updateMonthlyStats(analytics);
  
  // Update last updated time
  analytics.lastUpdated = now;
  
  // Generate insights if applicable
  generateInsights(userId, analytics);
  
  return analytics;
}

function updateStreak(analytics: StudyAnalytics): void {
  // Sort daily stats by date in descending order
  const sortedStats = [...analytics.dailyStats].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  if (sortedStats.length === 0) return;
  
  // Check if studied today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStats = sortedStats[0];
  const todayDate = new Date(todayStats.date);
  todayDate.setHours(0, 0, 0, 0);
  
  // If not studied today, streak is broken
  if (todayDate.getTime() !== today.getTime()) {
    analytics.currentStreak = 0;
    return;
  }
  
  // Count consecutive days
  let streak = 1; // Today counts as 1
  let previousDate = todayDate;
  
  for (let i = 1; i < sortedStats.length; i++) {
    const currentDate = new Date(sortedStats[i].date);
    currentDate.setHours(0, 0, 0, 0);
    
    // Check if dates are consecutive
    const diffTime = previousDate.getTime() - currentDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // Consecutive day
      streak++;
      previousDate = currentDate;
    } else {
      // Break in streak
      break;
    }
  }
  
  analytics.currentStreak = streak;
  analytics.longestStreak = Math.max(analytics.longestStreak, streak);
}

function updateWeeklyStats(analytics: StudyAnalytics): void {
  // Group daily stats by week
  const weekMap = new Map<string, DailyStudyStats[]>();
  
  analytics.dailyStats.forEach(day => {
    const date = new Date(day.date);
    // Get week start date (Sunday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // Get week end date (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekKey = `${weekStart.toISOString()}_${weekEnd.toISOString()}`;
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    
    weekMap.get(weekKey)!.push(day);
  });
  
  // Convert to weekly stats
  analytics.weeklyStats = Array.from(weekMap.entries()).map(([weekKey, days]) => {
    const [weekStartStr, weekEndStr] = weekKey.split('_');
    const weekStartDate = new Date(weekStartStr);
    const weekEndDate = new Date(weekEndStr);
    
    const totalMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
    const daysWithStudy = days.length;
    const avgMinutesPerDay = daysWithStudy > 0 ? Math.round(totalMinutes / daysWithStudy) : 0;
    
    // Find most productive day
    let mostProductiveDay: Date | undefined;
    let maxMinutes = 0;
    
    days.forEach(day => {
      if (day.totalMinutes > maxMinutes) {
        maxMinutes = day.totalMinutes;
        mostProductiveDay = new Date(day.date);
      }
    });
    
    // Count unique completed topics
    const completedTopics = new Set<string>();
    const inProgressTopics = new Set<string>();
    days.forEach(day => {
      day.topicsStudied.forEach(topic => {
        // For this example, we're assuming topics are "completed" if resources completed equals total
        if (day.resources.completed === day.resources.total && day.resources.total > 0) {
          completedTopics.add(topic);
        } else {
          inProgressTopics.add(topic);
        }
      });
    });
    
    return {
      weekStartDate,
      weekEndDate,
      dailyStats: days,
      totalMinutes,
      averageMinutesPerDay: avgMinutesPerDay,
      mostProductiveDay,
      completedTopics: completedTopics.size,
      inProgressTopics: inProgressTopics.size - completedTopics.size
    } as WeeklyStudyStats;
  }).sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
}

function updateMonthlyStats(analytics: StudyAnalytics): void {
  // Group weekly stats by month
  const monthMap = new Map<string, WeeklyStudyStats[]>();
  
  analytics.weeklyStats.forEach(week => {
    const date = new Date(week.weekStartDate);
    const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!monthMap.has(monthYear)) {
      monthMap.set(monthYear, []);
    }
    
    monthMap.get(monthYear)!.push(week);
  });
  
  // Convert to monthly stats
  analytics.monthlyStats = Array.from(monthMap.entries()).map(([monthYear, weeks]) => {
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0);
    const totalDays = weeks.reduce((days, week) => {
      // Count days with study activity
      return days + week.dailyStats.length;
    }, 0);
    
    const avgMinutesPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
    
    // Find most productive week
    let mostProductiveWeek: { weekStartDate: Date, weekEndDate: Date } | undefined;
    let maxMinutes = 0;
    
    weeks.forEach(week => {
      if (week.totalMinutes > maxMinutes) {
        maxMinutes = week.totalMinutes;
        mostProductiveWeek = {
          weekStartDate: new Date(week.weekStartDate),
          weekEndDate: new Date(week.weekEndDate)
        };
      }
    });
    
    // Calculate topic progress
    const topicsMap = new Map<string, { completed: number, total: number }>();
    weeks.forEach(week => {
      week.dailyStats.forEach(day => {
        day.topicsStudied.forEach(topic => {
          if (!topicsMap.has(topic)) {
            topicsMap.set(topic, { completed: 0, total: 0 });
          }
          
          const topicStats = topicsMap.get(topic)!;
          topicStats.completed += day.resources.completed;
          topicStats.total += day.resources.total;
        });
      });
    });
    
    const topicsProgress = Array.from(topicsMap.entries())
      .map(([topicTitle, stats]) => ({
        topicId: topicTitle, // Using title as ID for this example
        topicTitle,
        percentComplete: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.percentComplete - a.percentComplete);
    
    const completedTopics = topicsProgress.filter(t => t.percentComplete === 100).length;
    
    return {
      month,
      year,
      weeklyStats: weeks,
      totalMinutes,
      averageMinutesPerDay: avgMinutesPerDay,
      mostProductiveWeek,
      completedTopics,
      topicsProgress
    } as MonthlyStudyStats;
  }).sort((a, b) => {
    // Sort by year descending, then month descending
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export async function getStudyInsights(userId: string): Promise<StudyInsight[]> {
  return studyInsights.filter(insight => insight.userId === userId && !insight.dismissedAt);
}

export async function dismissInsight(insightId: string): Promise<boolean> {
  const insightIndex = studyInsights.findIndex(insight => insight.id === insightId);
  if (insightIndex === -1) return false;
  
  studyInsights[insightIndex].dismissedAt = new Date();
  return true;
}

export async function createStudyGoal(userId: string, input: CreateStudyGoalInput): Promise<StudyGoal> {
  const now = new Date();
  
  const newGoal: StudyGoal = {
    id: uuidv4(),
    userId,
    title: input.title,
    targetMinutes: input.targetMinutes,
    targetDays: input.targetDays,
    startDate: input.startDate,
    endDate: input.endDate,
    currentProgress: 0,
    currentStreakDays: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
  
  studyGoals.push(newGoal);
  return newGoal;
}

export async function updateStudyGoal(goalId: string, input: UpdateStudyGoalInput): Promise<StudyGoal | null> {
  const goalIndex = studyGoals.findIndex(goal => goal.id === goalId);
  if (goalIndex === -1) return null;
  
  studyGoals[goalIndex] = {
    ...studyGoals[goalIndex],
    ...input,
    updatedAt: new Date()
  };
  
  return studyGoals[goalIndex];
}

export async function getUserStudyGoals(userId: string): Promise<StudyGoal[]> {
  return studyGoals.filter(goal => goal.userId === userId);
}

export async function getFilteredAnalytics(userId: string, filter: StudyAnalyticsFilter): Promise<any> {
  const analytics = initializeUserAnalytics(userId);
  
  // Filter by date range if provided
  let filteredDailyStats = [...analytics.dailyStats];
  
  if (filter.startDate) {
    filteredDailyStats = filteredDailyStats.filter(day => 
      new Date(day.date).getTime() >= new Date(filter.startDate!).getTime()
    );
  }
  
  if (filter.endDate) {
    filteredDailyStats = filteredDailyStats.filter(day => 
      new Date(day.date).getTime() <= new Date(filter.endDate!).getTime()
    );
  }
  
  // Filter by subject if provided
  let subjectStats;
  if (filter.subject) {
    subjectStats = analytics.studySubjects.find(s => s.subject === filter.subject);
  }
  
  // Group data by selected interval
  const groupedData: any[] = [];
  
  if (filter.groupBy === 'day') {
    return filteredDailyStats;
  } else if (filter.groupBy === 'week') {
    let weeklyData = analytics.weeklyStats;
    
    if (filter.startDate) {
      weeklyData = weeklyData.filter(week => 
        week.weekStartDate.getTime() >= new Date(filter.startDate!).getTime()
      );
    }
    
    if (filter.endDate) {
      weeklyData = weeklyData.filter(week => 
        week.weekEndDate.getTime() <= new Date(filter.endDate!).getTime()
      );
    }
    
    return weeklyData;
  } else if (filter.groupBy === 'month') {
    let monthlyData = analytics.monthlyStats;
    
    if (filter.startDate) {
      const startMonth = new Date(filter.startDate!).getMonth();
      const startYear = new Date(filter.startDate!).getFullYear();
      
      monthlyData = monthlyData.filter(month => 
        (month.year > startYear) || 
        (month.year === startYear && month.month >= startMonth)
      );
    }
    
    if (filter.endDate) {
      const endMonth = new Date(filter.endDate!).getMonth();
      const endYear = new Date(filter.endDate!).getFullYear();
      
      monthlyData = monthlyData.filter(month => 
        (month.year < endYear) || 
        (month.year === endYear && month.month <= endMonth)
      );
    }
    
    return monthlyData;
  }
  
  return groupedData;
}

// Generate insights based on analytics
function generateInsights(userId: string, analytics: StudyAnalytics): void {
  const now = new Date();
  
  // Insight for new streak milestones
  if (analytics.currentStreak === 7 || analytics.currentStreak === 30 || analytics.currentStreak === 100) {
    const insight: StudyInsight = {
      id: uuidv4(),
      userId,
      type: 'achievement',
      title: `${analytics.currentStreak} Day Streak Achievement!`,
      description: `Congratulations! You've studied for ${analytics.currentStreak} consecutive days. Keep up the great work!`,
      createdAt: now,
      metadata: {
        streakDays: analytics.currentStreak
      }
    };
    
    studyInsights.push(insight);
  }
  
  // Insight for productivity patterns
  const productivityValues = Object.values(analytics.productivityByTimeOfDay);
  const totalProductivity = productivityValues.reduce((sum, val) => sum + val, 0);
  
  if (totalProductivity > 0) {
    // Find most productive time
    const timeOfDay = ['morning', 'afternoon', 'evening', 'night'];
    const productivityPercentages = timeOfDay.map(time => ({
      time,
      percentage: analytics.productivityByTimeOfDay[time as keyof typeof analytics.productivityByTimeOfDay] / totalProductivity * 100
    }));
    
    const mostProductiveTime = productivityPercentages.sort((a, b) => b.percentage - a.percentage)[0];
    
    if (mostProductiveTime.percentage > 60) {
      const insight: StudyInsight = {
        id: uuidv4(),
        userId,
        type: 'pattern',
        title: `You're Most Productive in the ${mostProductiveTime.time}`,
        description: `Over ${Math.round(mostProductiveTime.percentage)}% of your study time is in the ${mostProductiveTime.time}. Consider scheduling important study sessions during this time.`,
        createdAt: now,
        metadata: {
          productiveTime: mostProductiveTime.time,
          percentage: mostProductiveTime.percentage
        }
      };
      
      // Check if a similar insight already exists
      const existingSimilarInsight = studyInsights.find(insight => 
        insight.userId === userId && 
        insight.type === 'pattern' && 
        insight.title.includes('Most Productive') &&
        !insight.dismissedAt &&
        new Date(insight.createdAt).getTime() > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() // Within last week
      );
      
      if (!existingSimilarInsight) {
        studyInsights.push(insight);
      }
    }
  }
  
  // Milestone insights
  const totalHours = Math.floor(analytics.totalStudyTime / 60);
  if (totalHours === 10 || totalHours === 50 || totalHours === 100 || totalHours === 500) {
    const insight: StudyInsight = {
      id: uuidv4(),
      userId,
      type: 'milestone',
      title: `${totalHours} Hours of Learning`,
      description: `Amazing! You've reached ${totalHours} total hours of study time. That's a significant investment in your medical education.`,
      createdAt: now,
      metadata: {
        hours: totalHours
      }
    };
    
    studyInsights.push(insight);
  }
} 