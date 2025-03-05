import { Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  userId: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface INote extends Document {
  title: string;
  content: string;
  userId: string;
  categoryId: string;
  tags: string[];
  attachments: IAttachment[];
  position: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
} 