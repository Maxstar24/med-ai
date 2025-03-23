import { Types } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { StudyGroupModel } from '@/models/StudyGroupModel';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
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
  SendStudyGroupMessageInput,
  AddGroupMemberInput,
  CreateGroupEventInput,
  SendGroupMessageInput
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

export class StudyGroupService {
  /**
   * Create a new study group
   */
  static async createGroup(data: CreateStudyGroupInput): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const { name, description, subject, topics, isPrivate } = data;
      
      // Create the study group with the current user as admin
      const group = new StudyGroupModel({
        name,
        description,
        subject,
        topics: topics || [],
        isPrivate: isPrivate || false,
        members: [{
          userId: new Types.ObjectId(userId),
          role: 'admin',
          joinedAt: new Date(),
          displayName: session.user.name || 'Group Admin'
        }],
        messages: [],
        events: [],
        resources: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // If the group is private, generate a join code
      if (isPrivate) {
        await group.generateJoinCode();
      }
      
      await group.save();
      return group;
    } catch (error) {
      console.error('Error creating study group:', error);
      throw error;
    }
  }
  
  /**
   * Get all study groups (with optional filter for public groups)
   */
  static async getAllGroups(publicOnly: boolean = false): Promise<StudyGroup[]> {
    try {
      await connectToDatabase();
      
      const query = publicOnly ? { isPrivate: false } : {};
      const groups = await StudyGroupModel.find(query).sort({ createdAt: -1 });
      
      return groups;
    } catch (error) {
      console.error('Error fetching study groups:', error);
      throw error;
    }
  }
  
  /**
   * Get groups by subject
   */
  static async getGroupsBySubject(subject: string): Promise<StudyGroup[]> {
    try {
      await connectToDatabase();
      
      const groups = await StudyGroupModel.find({ 
        subject,
        isPrivate: false 
      }).sort({ createdAt: -1 });
      
      return groups;
    } catch (error) {
      console.error('Error fetching groups by subject:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific study group by ID
   */
  static async getGroupById(groupId: string): Promise<StudyGroup> {
    try {
      await connectToDatabase();
      
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      return group;
    } catch (error) {
      console.error('Error fetching study group:', error);
      throw error;
    }
  }
  
  /**
   * Get study groups that the current user is a member of
   */
  static async getCurrentUserGroups(): Promise<StudyGroup[]> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      const groups = await StudyGroupModel.find({ 
        'members.userId': userId 
      }).sort({ createdAt: -1 });
      
      return groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }
  
  /**
   * Update a study group
   */
  static async updateGroup(groupId: string, data: UpdateStudyGroupInput): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is an admin
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isAdmin) {
        throw new Error('Only group admins can update the group');
      }
      
      // Update the group fields
      if (data.name) group.name = data.name;
      if (data.description) group.description = data.description;
      if (data.subject) group.subject = data.subject;
      if (data.topics) group.topics = data.topics;
      if (data.isPrivate !== undefined) {
        group.isPrivate = data.isPrivate;
        if (data.isPrivate && !group.joinCode) {
          await group.generateJoinCode();
        }
      }
      
      group.updatedAt = new Date();
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error updating study group:', error);
      throw error;
    }
  }
  
  /**
   * Delete a study group
   */
  static async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is an admin
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isAdmin) {
        throw new Error('Only group admins can delete the group');
      }
      
      // Delete the group
      await StudyGroupModel.findByIdAndDelete(groupId);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting study group:', error);
      throw error;
    }
  }
  
  /**
   * Join a group with a join code (for private groups)
   */
  static async joinGroupWithCode(joinCode: string): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group with the join code
      const group = await StudyGroupModel.findOne({ joinCode });
      
      if (!group) {
        throw new Error('Invalid join code or group not found');
      }
      
      // Check if user is already a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (isMember) {
        return group; // User is already a member
      }
      
      // Add user as a member
      const newMember = {
        userId: new Types.ObjectId(userId),
        role: 'member',
        joinedAt: new Date(),
        displayName: session.user.name || 'Group Member'
      };
      
      group.members.push(newMember);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error joining group with code:', error);
      throw error;
    }
  }
  
  /**
   * Join a public group
   */
  static async joinPublicGroup(groupId: string): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if the group is public
      if (group.isPrivate) {
        throw new Error('Cannot directly join a private group. Use a join code instead.');
      }
      
      // Check if user is already a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (isMember) {
        return group; // User is already a member
      }
      
      // Add user as a member
      const newMember = {
        userId: new Types.ObjectId(userId),
        role: 'member',
        joinedAt: new Date(),
        displayName: session.user.name || 'Group Member'
      };
      
      group.members.push(newMember);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error joining public group:', error);
      throw error;
    }
  }
  
  /**
   * Leave a group
   */
  static async leaveGroup(groupId: string): Promise<{ success: boolean }> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const memberIndex = group.members.findIndex(member => 
        member.userId.toString() === userId
      );
      
      if (memberIndex === -1) {
        throw new Error('You are not a member of this group');
      }
      
      // Check if user is the only admin
      const isAdmin = group.members[memberIndex].role === 'admin';
      const adminCount = group.members.filter(member => member.role === 'admin').length;
      
      if (isAdmin && adminCount === 1 && group.members.length > 1) {
        throw new Error('You are the only admin. Promote another member to admin before leaving.');
      }
      
      // Remove the member
      group.members.splice(memberIndex, 1);
      
      // If no members left, delete the group
      if (group.members.length === 0) {
        await StudyGroupModel.findByIdAndDelete(groupId);
      } else {
        await group.save();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }
  
  /**
   * Add a member to the group (admin only)
   */
  static async addMember(groupId: string, memberData: AddGroupMemberInput): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is an admin
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isAdmin) {
        throw new Error('Only group admins can add members');
      }
      
      // Check if member already exists
      const memberExists = group.members.some(member => 
        member.userId.toString() === memberData.userId
      );
      
      if (memberExists) {
        throw new Error('User is already a member of this group');
      }
      
      // Add the new member
      const newMember = {
        userId: new Types.ObjectId(memberData.userId),
        role: memberData.role || 'member',
        joinedAt: new Date(),
        displayName: memberData.displayName || 'Group Member'
      };
      
      group.members.push(newMember);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  }
  
  /**
   * Update a member's role (admin only)
   */
  static async updateMemberRole(groupId: string, memberId: string, role: 'admin' | 'member'): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is an admin
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isAdmin) {
        throw new Error('Only group admins can update member roles');
      }
      
      // Find the member to update
      const memberIndex = group.members.findIndex(member => 
        member.userId.toString() === memberId
      );
      
      if (memberIndex === -1) {
        throw new Error('Member not found in this group');
      }
      
      // Update the member's role
      group.members[memberIndex].role = role;
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }
  
  /**
   * Remove a member from the group (admin only)
   */
  static async removeMember(groupId: string, memberId: string): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is an admin
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isAdmin) {
        throw new Error('Only group admins can remove members');
      }
      
      // Find the member to remove
      const memberIndex = group.members.findIndex(member => 
        member.userId.toString() === memberId
      );
      
      if (memberIndex === -1) {
        throw new Error('Member not found in this group');
      }
      
      // Cannot remove the last admin
      if (group.members[memberIndex].role === 'admin') {
        const adminCount = group.members.filter(member => member.role === 'admin').length;
        if (adminCount === 1) {
          throw new Error('Cannot remove the last admin. Promote another member to admin first.');
        }
      }
      
      // Remove the member
      group.members.splice(memberIndex, 1);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }
  
  /**
   * Create a group event
   */
  static async createEvent(groupId: string, eventData: CreateGroupEventInput): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (!isMember) {
        throw new Error('Only group members can create events');
      }
      
      // Create the event
      const newEvent = {
        _id: new Types.ObjectId(),
        createdBy: new Types.ObjectId(userId),
        title: eventData.title,
        description: eventData.description,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        location: eventData.location,
        isVirtual: eventData.isVirtual || false,
        meetingLink: eventData.meetingLink,
        attendees: [{
          userId: new Types.ObjectId(userId),
          status: 'going'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add the event to the group
      group.events.push(newEvent);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error creating group event:', error);
      throw error;
    }
  }
  
  /**
   * Update event attendance status
   */
  static async updateEventAttendance(groupId: string, eventId: string, status: 'going' | 'not-going' | 'undecided'): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (!isMember) {
        throw new Error('Only group members can update attendance');
      }
      
      // Find the event
      const eventIndex = group.events.findIndex(event => 
        event._id.toString() === eventId
      );
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }
      
      // Find if user is already in attendees
      const attendeeIndex = group.events[eventIndex].attendees.findIndex(attendee => 
        attendee.userId.toString() === userId
      );
      
      if (attendeeIndex !== -1) {
        // Update existing attendance
        group.events[eventIndex].attendees[attendeeIndex].status = status;
      } else {
        // Add new attendance
        group.events[eventIndex].attendees.push({
          userId: new Types.ObjectId(userId),
          status
        });
      }
      
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error updating event attendance:', error);
      throw error;
    }
  }
  
  /**
   * Delete an event
   */
  static async deleteEvent(groupId: string, eventId: string): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Find the event
      const eventIndex = group.events.findIndex(event => 
        event._id.toString() === eventId
      );
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }
      
      // Check if user is the creator or an admin
      const isCreator = group.events[eventIndex].createdBy.toString() === userId;
      const isAdmin = group.members.some(member => 
        member.userId.toString() === userId && member.role === 'admin'
      );
      
      if (!isCreator && !isAdmin) {
        throw new Error('Only the event creator or group admins can delete events');
      }
      
      // Remove the event
      group.events.splice(eventIndex, 1);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
  
  /**
   * Send a message to the group
   */
  static async sendMessage(groupId: string, messageData: SendGroupMessageInput): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (!isMember) {
        throw new Error('Only group members can send messages');
      }
      
      // Create the message
      const newMessage = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        content: messageData.content,
        attachments: messageData.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add the message to the group
      group.messages.push(newMessage);
      
      // Limit the number of messages (optional, to prevent document size issues)
      if (group.messages.length > 200) {
        group.messages = group.messages.slice(-200);
      }
      
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error sending message to group:', error);
      throw error;
    }
  }
  
  /**
   * Get the latest messages for a group
   */
  static async getMessages(groupId: string, limit: number = 50): Promise<StudyGroupMessage[]> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (!isMember) {
        throw new Error('Only group members can view messages');
      }
      
      // Get the most recent messages
      const messages = group.messages
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      return messages;
    } catch (error) {
      console.error('Error getting group messages:', error);
      throw error;
    }
  }
  
  /**
   * Add a resource to the group
   */
  static async addResource(groupId: string, resource: any): Promise<StudyGroup> {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }
      
      await connectToDatabase();
      
      const userId = session.user.id;
      
      // Find the group
      const group = await StudyGroupModel.findById(groupId);
      
      if (!group) {
        throw new Error('Study group not found');
      }
      
      // Check if user is a member
      const isMember = group.members.some(member => 
        member.userId.toString() === userId
      );
      
      if (!isMember) {
        throw new Error('Only group members can add resources');
      }
      
      // Create the resource
      const newResource = {
        _id: new Types.ObjectId(),
        addedBy: new Types.ObjectId(userId),
        title: resource.title,
        description: resource.description,
        type: resource.type,
        url: resource.url,
        tags: resource.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add the resource to the group
      group.resources.push(newResource);
      await group.save();
      
      return group;
    } catch (error) {
      console.error('Error adding resource to group:', error);
      throw error;
    }
  }
} 