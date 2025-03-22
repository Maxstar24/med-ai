export interface StudyPlanTopic {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  resources: StudyResource[];
}

export interface StudyResource {
  id: string;
  title: string;
  type: 'book' | 'video' | 'article' | 'quiz' | 'other';
  url?: string;
  completed: boolean;
}

export interface StudySession {
  id: string;
  planId: string;
  topicId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  notes?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject: string;
  startDate: Date;
  endDate: Date;
  topics: StudyPlanTopic[];
  isActive: boolean;
  progress: number; // 0-100
  sessions: StudySession[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyPlanWithUser extends StudyPlan {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CreateStudyPlanInput {
  title: string;
  description?: string;
  subject: string;
  startDate: Date;
  endDate: Date;
  topics: Omit<StudyPlanTopic, 'id' | 'completed' | 'resources'>[];
}

export interface UpdateStudyPlanInput {
  title?: string;
  description?: string;
  subject?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface AddStudyTopicInput {
  planId: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateStudyTopicInput {
  id: string;
  planId: string;
  title?: string;
  description?: string;
  estimatedHours?: number;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface AddStudyResourceInput {
  topicId: string;
  planId: string;
  title: string;
  type: 'book' | 'video' | 'article' | 'quiz' | 'other';
  url?: string;
}

export interface RecordStudySessionInput {
  planId: string;
  topicId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  notes?: string;
}
