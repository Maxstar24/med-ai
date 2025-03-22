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
  RecordStudySessionInput
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