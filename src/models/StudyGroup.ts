// Define interfaces for the StudyGroup model

export interface StudyGroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  displayName?: string;
}

export interface StudyGroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  attachments?: {
    id: string;
    type: 'image' | 'pdf' | 'link';
    url: string;
    name: string;
  }[];
}

export interface StudyGroupEvent {
  id: string;
  groupId: string;
  createdBy: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
  attendees: {
    userId: string;
    status: 'going' | 'not-going' | 'undecided';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGroupResource {
  id: string;
  groupId: string;
  addedBy: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'link' | 'quiz' | 'notes';
  url: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  subject: string;
  topics: string[];
  isPrivate: boolean;
  joinCode?: string;
  members: StudyGroupMember[];
  messages: StudyGroupMessage[];
  events: StudyGroupEvent[];
  resources: StudyGroupResource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudyGroupInput {
  name: string;
  description?: string;
  subject: string;
  topics: string[];
  isPrivate: boolean;
}

export interface UpdateStudyGroupInput {
  name?: string;
  description?: string;
  subject?: string;
  topics?: string[];
  isPrivate?: boolean;
}

export interface JoinStudyGroupInput {
  groupId: string;
  joinCode?: string;
  displayName?: string;
}

export interface AddStudyGroupEventInput {
  groupId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
}

export interface AddStudyGroupResourceInput {
  groupId: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'link' | 'quiz' | 'notes';
  url: string;
  tags?: string[];
}

export interface SendStudyGroupMessageInput {
  groupId: string;
  content: string;
  attachments?: {
    type: 'image' | 'pdf' | 'link';
    url: string;
    name: string;
  }[];
}
