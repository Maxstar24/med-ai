import { Types } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { StudyPlanModel } from '@/models/StudyPlanModel';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { 
  StudyPlan, 
  StudyPlanTopic, 
  StudyResource, 
  StudySession,
  CreateStudyPlanInput,
  UpdateStudyPlanInput,
  AddStudyTopicInput,
  UpdateStudyTopicInput,
  AddStudyResourceInput,
  RecordStudySessionInput,
  StudyTopic
} from '@/models/StudyPlan';
import { v4 as uuidv4 } from 'uuid';

// Mock database for demonstration - would be replaced by actual database calls
const studyPlans: StudyPlan[] = [];

export async function getStudyPlans(userId: string): Promise<StudyPlan[]> {
  return studyPlans.filter(plan => plan.userId === userId);
}

export async function getStudyPlanById(id: string): Promise<StudyPlan | null> {
  return studyPlans.find(plan => plan.id === id) || null;
}

export async function createStudyPlan(userId: string, input: CreateStudyPlanInput): Promise<StudyPlan> {
  const now = new Date();
  
  const newTopics: StudyPlanTopic[] = input.topics.map(topic => ({
    id: uuidv4(),
    title: topic.title,
    description: topic.description,
    estimatedHours: topic.estimatedHours,
    priority: topic.priority,
    completed: false,
    resources: []
  }));
  
  const studyPlan: StudyPlan = {
    id: uuidv4(),
    userId,
    title: input.title,
    description: input.description,
    subject: input.subject,
    startDate: input.startDate,
    endDate: input.endDate,
    topics: newTopics,
    isActive: true,
    progress: 0,
    sessions: [],
    createdAt: now,
    updatedAt: now
  };
  
  studyPlans.push(studyPlan);
  return studyPlan;
}

export async function updateStudyPlan(id: string, input: UpdateStudyPlanInput): Promise<StudyPlan | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === id);
  if (planIndex === -1) return null;
  
  const updatedPlan = {
    ...studyPlans[planIndex],
    ...input,
    updatedAt: new Date()
  };
  
  studyPlans[planIndex] = updatedPlan;
  return updatedPlan;
}

export async function deleteStudyPlan(id: string): Promise<boolean> {
  const planIndex = studyPlans.findIndex(plan => plan.id === id);
  if (planIndex === -1) return false;
  
  studyPlans.splice(planIndex, 1);
  return true;
}

export async function addStudyTopic(input: AddStudyTopicInput): Promise<StudyPlanTopic | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === input.planId);
  if (planIndex === -1) return null;
  
  const newTopic: StudyPlanTopic = {
    id: uuidv4(),
    title: input.title,
    description: input.description,
    estimatedHours: input.estimatedHours,
    priority: input.priority,
    completed: false,
    resources: []
  };
  
  studyPlans[planIndex].topics.push(newTopic);
  studyPlans[planIndex].updatedAt = new Date();
  
  return newTopic;
}

export async function updateStudyTopic(input: UpdateStudyTopicInput): Promise<StudyPlanTopic | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === input.planId);
  if (planIndex === -1) return null;
  
  const topicIndex = studyPlans[planIndex].topics.findIndex(topic => topic.id === input.id);
  if (topicIndex === -1) return null;
  
  studyPlans[planIndex].topics[topicIndex] = {
    ...studyPlans[planIndex].topics[topicIndex],
    ...input,
  };
  
  studyPlans[planIndex].updatedAt = new Date();
  
  // Update overall progress
  updateStudyPlanProgress(input.planId);
  
  return studyPlans[planIndex].topics[topicIndex];
}

export async function deleteStudyTopic(planId: string, topicId: string): Promise<boolean> {
  const planIndex = studyPlans.findIndex(plan => plan.id === planId);
  if (planIndex === -1) return false;
  
  const topicIndex = studyPlans[planIndex].topics.findIndex(topic => topic.id === topicId);
  if (topicIndex === -1) return false;
  
  studyPlans[planIndex].topics.splice(topicIndex, 1);
  studyPlans[planIndex].updatedAt = new Date();
  
  // Update overall progress
  updateStudyPlanProgress(planId);
  
  return true;
}

export async function addStudyResource(input: AddStudyResourceInput): Promise<StudyResource | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === input.planId);
  if (planIndex === -1) return null;
  
  const topicIndex = studyPlans[planIndex].topics.findIndex(topic => topic.id === input.topicId);
  if (topicIndex === -1) return null;
  
  const newResource: StudyResource = {
    id: uuidv4(),
    title: input.title,
    type: input.type,
    url: input.url,
    completed: false
  };
  
  studyPlans[planIndex].topics[topicIndex].resources.push(newResource);
  studyPlans[planIndex].updatedAt = new Date();
  
  return newResource;
}

export async function toggleResourceCompletion(planId: string, topicId: string, resourceId: string): Promise<StudyResource | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === planId);
  if (planIndex === -1) return null;
  
  const topicIndex = studyPlans[planIndex].topics.findIndex(topic => topic.id === topicId);
  if (topicIndex === -1) return null;
  
  const resourceIndex = studyPlans[planIndex].topics[topicIndex].resources.findIndex(resource => resource.id === resourceId);
  if (resourceIndex === -1) return null;
  
  // Toggle completion status
  studyPlans[planIndex].topics[topicIndex].resources[resourceIndex].completed = 
    !studyPlans[planIndex].topics[topicIndex].resources[resourceIndex].completed;
  
  studyPlans[planIndex].updatedAt = new Date();
  
  // Check if all resources are completed and update topic completion status
  const allResourcesCompleted = studyPlans[planIndex].topics[topicIndex].resources.every(
    resource => resource.completed
  );
  
  if (allResourcesCompleted && studyPlans[planIndex].topics[topicIndex].resources.length > 0) {
    studyPlans[planIndex].topics[topicIndex].completed = true;
    updateStudyPlanProgress(planId);
  }
  
  return studyPlans[planIndex].topics[topicIndex].resources[resourceIndex];
}

export async function recordStudySession(input: RecordStudySessionInput): Promise<StudySession | null> {
  const planIndex = studyPlans.findIndex(plan => plan.id === input.planId);
  if (planIndex === -1) return null;
  
  const topicIndex = studyPlans[planIndex].topics.findIndex(topic => topic.id === input.topicId);
  if (topicIndex === -1) return null;
  
  const newSession: StudySession = {
    id: uuidv4(),
    planId: input.planId,
    topicId: input.topicId,
    startTime: input.startTime,
    endTime: input.endTime,
    duration: input.duration,
    notes: input.notes
  };
  
  studyPlans[planIndex].sessions.push(newSession);
  studyPlans[planIndex].updatedAt = new Date();
  
  return newSession;
}

// Helper to recalculate study plan progress
function updateStudyPlanProgress(planId: string): void {
  const planIndex = studyPlans.findIndex(plan => plan.id === planId);
  if (planIndex === -1) return;
  
  const totalTopics = studyPlans[planIndex].topics.length;
  if (totalTopics === 0) {
    studyPlans[planIndex].progress = 0;
    return;
  }
  
  const completedTopics = studyPlans[planIndex].topics.filter(topic => topic.completed).length;
  studyPlans[planIndex].progress = Math.round((completedTopics / totalTopics) * 100);
}

export class StudyPlanService {
  /**
   * Create a new study plan for the current user
   */
  static async createStudyPlan(data: CreateStudyPlanInput): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const { title, description, subject, startDate, endDate, topics = [] } = data;
      
      // Create the study plan
      const plan = new StudyPlanModel({
        userId: new Types.ObjectId(userId),
        title,
        description,
        subject,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        topics: topics.map(topic => ({
          title: topic.title,
          description: topic.description,
          estimatedHours: topic.estimatedHours,
          completed: false,
          priority: topic.priority || 'medium',
          resources: []
        })),
        isActive: true,
        progress: 0,
        sessions: []
      });
      
      await plan.save();
      return plan;
    } catch (error) {
      console.error('Error creating study plan:', error);
      throw error;
    }
  }
  
  /**
   * Get all study plans for the current user
   */
  static async getUserStudyPlans(): Promise<StudyPlan[]> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const plans = await StudyPlanModel.find({ userId }).sort({ createdAt: -1 });
      
      return plans;
    } catch (error) {
      console.error('Error fetching user study plans:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific study plan by ID
   */
  static async getStudyPlan(planId: string): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId: userId
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      return plan;
    } catch (error) {
      console.error('Error fetching study plan:', error);
      throw error;
    }
  }
  
  /**
   * Update a study plan
   */
  static async updateStudyPlan(planId: string, data: UpdateStudyPlanInput): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Update fields
      if (data.title) plan.title = data.title;
      if (data.description) plan.description = data.description;
      if (data.subject) plan.subject = data.subject;
      if (data.startDate) plan.startDate = new Date(data.startDate);
      if (data.endDate) plan.endDate = new Date(data.endDate);
      if (data.isActive !== undefined) plan.isActive = data.isActive;
      
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error updating study plan:', error);
      throw error;
    }
  }
  
  /**
   * Delete a study plan
   */
  static async deleteStudyPlan(planId: string): Promise<{ success: boolean }> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const result = await StudyPlanModel.deleteOne({ 
        _id: planId,
        userId 
      });
      
      if (result.deletedCount === 0) {
        throw new Error('Study plan not found or not authorized');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting study plan:', error);
      throw error;
    }
  }
  
  /**
   * Add a topic to a study plan
   */
  static async addTopic(planId: string, topicData: AddStudyTopicInput): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Create the new topic
      const newTopic = {
        _id: new Types.ObjectId(),
        title: topicData.title,
        description: topicData.description,
        estimatedHours: topicData.estimatedHours,
        completed: false,
        priority: topicData.priority || 'medium',
        resources: []
      };
      
      // Add the topic to the plan
      plan.topics.push(newTopic);
      
      // Save the updated plan
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error adding topic to study plan:', error);
      throw error;
    }
  }
  
  /**
   * Update a topic in a study plan
   */
  static async updateTopic(planId: string, topicId: string, topicData: UpdateStudyTopicInput): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Find the topic
      const topicIndex = plan.topics.findIndex((t: StudyTopic) => t._id.toString() === topicId);
      if (topicIndex === -1) {
        throw new Error('Topic not found in study plan');
      }
      
      // Update the topic fields
      if (topicData.title) plan.topics[topicIndex].title = topicData.title;
      if (topicData.description) plan.topics[topicIndex].description = topicData.description;
      if (topicData.estimatedHours) plan.topics[topicIndex].estimatedHours = topicData.estimatedHours;
      if (topicData.completed !== undefined) plan.topics[topicIndex].completed = topicData.completed;
      if (topicData.priority) plan.topics[topicIndex].priority = topicData.priority;
      
      // Save the updated plan
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error updating topic in study plan:', error);
      throw error;
    }
  }
  
  /**
   * Delete a topic from a study plan
   */
  static async deleteTopic(planId: string, topicId: string): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Remove the topic
      plan.topics = plan.topics.filter((t: StudyTopic) => t._id.toString() !== topicId);
      
      // Save the updated plan
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error deleting topic from study plan:', error);
      throw error;
    }
  }
  
  /**
   * Add a resource to a topic
   */
  static async addResource(planId: string, topicId: string, resourceData: AddStudyResourceInput): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Find the topic
      const topicIndex = plan.topics.findIndex((t: StudyTopic) => t._id.toString() === topicId);
      if (topicIndex === -1) {
        throw new Error('Topic not found in study plan');
      }
      
      // Create the new resource
      const newResource = {
        _id: new Types.ObjectId(),
        title: resourceData.title,
        type: resourceData.type,
        url: resourceData.url,
        completed: false
      };
      
      // Add the resource to the topic
      plan.topics[topicIndex].resources.push(newResource);
      
      // Save the updated plan
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error adding resource to topic:', error);
      throw error;
    }
  }
  
  /**
   * Mark a resource as completed
   */
  static async completeResource(planId: string, topicId: string, resourceId: string, completed: boolean): Promise<StudyPlan> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Ensure the plan belongs to the user
      const plan = await StudyPlanModel.findOne({ 
        _id: planId,
        userId 
      });
      
      if (!plan) {
        throw new Error('Study plan not found or not authorized');
      }
      
      // Find the topic
      const topicIndex = plan.topics.findIndex((t: StudyTopic) => t._id.toString() === topicId);
      if (topicIndex === -1) {
        throw new Error('Topic not found in study plan');
      }
      
      // Find the resource
      const resourceIndex = plan.topics[topicIndex].resources.findIndex((r: StudyResource) => r._id.toString() === resourceId);
      if (resourceIndex === -1) {
        throw new Error('Resource not found in topic');
      }
      
      // Update the resource
      plan.topics[topicIndex].resources[resourceIndex].completed = completed;
      
      // Calculate progress and save
      await plan.save();
      
      return plan;
    } catch (error) {
      console.error('Error updating resource completion status:', error);
      throw error;
    }
  }
  
  /**
   * Get active study plans for the current user
   */
  static async getActiveStudyPlans(): Promise<StudyPlan[]> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const plans = await StudyPlanModel.find({ 
        userId,
        isActive: true,
        endDate: { $gte: new Date() }
      }).sort({ startDate: 1 });
      
      return plans;
    } catch (error) {
      console.error('Error fetching active study plans:', error);
      throw error;
    }
  }
} 