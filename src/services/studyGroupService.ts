import { 
  StudyGroup,
  StudyGroupMember,
  StudyGroupMessage,
  StudyGroupEvent,
  StudyGroupResource,
  CreateStudyGroupInput,
  UpdateStudyGroupInput,
  JoinStudyGroupInput,
  AddStudyGroupEventInput,
  AddStudyGroupResourceInput,
  SendStudyGroupMessageInput
} from '@/models/StudyGroup';
import { v4 as uuidv4 } from 'uuid';

// Mock database for demonstration - would be replaced by actual database calls
const studyGroups: StudyGroup[] = [];

export async function getStudyGroups(): Promise<StudyGroup[]> {
  return studyGroups;
}

export async function getStudyGroupById(id: string): Promise<StudyGroup | null> {
  return studyGroups.find(group => group.id === id) || null;
}

export async function getUserStudyGroups(userId: string): Promise<StudyGroup[]> {
  return studyGroups.filter(group => 
    group.members.some(member => member.userId === userId)
  );
}

export async function searchStudyGroups(query: string): Promise<StudyGroup[]> {
  const searchTerms = query.toLowerCase().split(' ');
  
  return studyGroups.filter(group => {
    // Don't include private groups in search results
    if (group.isPrivate) return false;
    
    const groupText = `${group.name} ${group.description || ''} ${group.subject} ${group.topics.join(' ')}`.toLowerCase();
    return searchTerms.some(term => groupText.includes(term));
  });
}

export async function createStudyGroup(userId: string, input: CreateStudyGroupInput): Promise<StudyGroup> {
  const now = new Date();
  
  // Generate a unique join code for private groups
  const joinCode = input.isPrivate ? generateJoinCode() : undefined;
  
  const studyGroup: StudyGroup = {
    id: uuidv4(),
    name: input.name,
    description: input.description,
    subject: input.subject,
    topics: input.topics,
    isPrivate: input.isPrivate,
    joinCode,
    members: [
      {
        userId,
        role: 'admin',
        joinedAt: now
      }
    ],
    messages: [],
    events: [],
    resources: [],
    createdAt: now,
    updatedAt: now
  };
  
  studyGroups.push(studyGroup);
  return studyGroup;
}

export async function updateStudyGroup(id: string, input: UpdateStudyGroupInput): Promise<StudyGroup | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === id);
  if (groupIndex === -1) return null;
  
  const updatedGroup = {
    ...studyGroups[groupIndex],
    ...input,
    updatedAt: new Date()
  };
  
  studyGroups[groupIndex] = updatedGroup;
  return updatedGroup;
}

export async function deleteStudyGroup(id: string): Promise<boolean> {
  const groupIndex = studyGroups.findIndex(group => group.id === id);
  if (groupIndex === -1) return false;
  
  studyGroups.splice(groupIndex, 1);
  return true;
}

export async function joinStudyGroup(userId: string, input: JoinStudyGroupInput): Promise<StudyGroupMember | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === input.groupId);
  if (groupIndex === -1) return null;
  
  // Check if user is already a member
  if (studyGroups[groupIndex].members.some(member => member.userId === userId)) {
    return null;
  }
  
  // Check if join code is required and matches
  if (studyGroups[groupIndex].isPrivate && studyGroups[groupIndex].joinCode !== input.joinCode) {
    return null;
  }
  
  const newMember: StudyGroupMember = {
    userId,
    role: 'member',
    joinedAt: new Date(),
    displayName: input.displayName
  };
  
  studyGroups[groupIndex].members.push(newMember);
  studyGroups[groupIndex].updatedAt = new Date();
  
  return newMember;
}

export async function leaveStudyGroup(groupId: string, userId: string): Promise<boolean> {
  const groupIndex = studyGroups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return false;
  
  const memberIndex = studyGroups[groupIndex].members.findIndex(member => member.userId === userId);
  if (memberIndex === -1) return false;
  
  // Check if user is the last admin
  const isAdmin = studyGroups[groupIndex].members[memberIndex].role === 'admin';
  const adminCount = studyGroups[groupIndex].members.filter(member => member.role === 'admin').length;
  
  if (isAdmin && adminCount === 1) {
    // Assign admin role to another member if possible
    const otherMemberIndex = studyGroups[groupIndex].members.findIndex(member => member.userId !== userId);
    if (otherMemberIndex !== -1) {
      studyGroups[groupIndex].members[otherMemberIndex].role = 'admin';
    } else {
      // No other members, delete the group
      return deleteStudyGroup(groupId);
    }
  }
  
  studyGroups[groupIndex].members.splice(memberIndex, 1);
  studyGroups[groupIndex].updatedAt = new Date();
  
  return true;
}

export async function updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member'): Promise<StudyGroupMember | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return null;
  
  const memberIndex = studyGroups[groupIndex].members.findIndex(member => member.userId === userId);
  if (memberIndex === -1) return null;
  
  studyGroups[groupIndex].members[memberIndex].role = role;
  studyGroups[groupIndex].updatedAt = new Date();
  
  return studyGroups[groupIndex].members[memberIndex];
}

export async function addStudyGroupEvent(userId: string, input: AddStudyGroupEventInput): Promise<StudyGroupEvent | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === input.groupId);
  if (groupIndex === -1) return null;
  
  // Verify user is a member
  if (!studyGroups[groupIndex].members.some(member => member.userId === userId)) {
    return null;
  }
  
  const now = new Date();
  
  const newEvent: StudyGroupEvent = {
    id: uuidv4(),
    groupId: input.groupId,
    createdBy: userId,
    title: input.title,
    description: input.description,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    isVirtual: input.isVirtual,
    meetingLink: input.meetingLink,
    attendees: studyGroups[groupIndex].members.map(member => ({
      userId: member.userId,
      status: 'undecided'
    })),
    createdAt: now,
    updatedAt: now
  };
  
  studyGroups[groupIndex].events.push(newEvent);
  studyGroups[groupIndex].updatedAt = now;
  
  return newEvent;
}

export async function updateEventAttendance(groupId: string, eventId: string, userId: string, status: 'going' | 'not-going' | 'undecided'): Promise<boolean> {
  const groupIndex = studyGroups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return false;
  
  const eventIndex = studyGroups[groupIndex].events.findIndex(event => event.id === eventId);
  if (eventIndex === -1) return false;
  
  const attendeeIndex = studyGroups[groupIndex].events[eventIndex].attendees.findIndex(attendee => attendee.userId === userId);
  if (attendeeIndex === -1) return false;
  
  studyGroups[groupIndex].events[eventIndex].attendees[attendeeIndex].status = status;
  studyGroups[groupIndex].events[eventIndex].updatedAt = new Date();
  studyGroups[groupIndex].updatedAt = new Date();
  
  return true;
}

export async function addStudyGroupResource(userId: string, input: AddStudyGroupResourceInput): Promise<StudyGroupResource | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === input.groupId);
  if (groupIndex === -1) return null;
  
  // Verify user is a member
  if (!studyGroups[groupIndex].members.some(member => member.userId === userId)) {
    return null;
  }
  
  const now = new Date();
  
  const newResource: StudyGroupResource = {
    id: uuidv4(),
    groupId: input.groupId,
    addedBy: userId,
    title: input.title,
    description: input.description,
    type: input.type,
    url: input.url,
    tags: input.tags,
    createdAt: now,
    updatedAt: now
  };
  
  studyGroups[groupIndex].resources.push(newResource);
  studyGroups[groupIndex].updatedAt = now;
  
  return newResource;
}

export async function sendMessage(userId: string, input: SendStudyGroupMessageInput): Promise<StudyGroupMessage | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === input.groupId);
  if (groupIndex === -1) return null;
  
  // Verify user is a member
  if (!studyGroups[groupIndex].members.some(member => member.userId === userId)) {
    return null;
  }
  
  const now = new Date();
  
  const newMessage: StudyGroupMessage = {
    id: uuidv4(),
    groupId: input.groupId,
    userId,
    content: input.content,
    createdAt: now,
    attachments: input.attachments?.map(attachment => ({
      id: uuidv4(),
      ...attachment
    }))
  };
  
  studyGroups[groupIndex].messages.push(newMessage);
  studyGroups[groupIndex].updatedAt = now;
  
  return newMessage;
}

export async function refreshGroupJoinCode(groupId: string): Promise<string | null> {
  const groupIndex = studyGroups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return null;
  
  const newJoinCode = generateJoinCode();
  studyGroups[groupIndex].joinCode = newJoinCode;
  studyGroups[groupIndex].updatedAt = new Date();
  
  return newJoinCode;
}

// Helper to generate a random 6-character join code
function generateJoinCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  
  return code;
} 