import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Ensure uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyFirebaseToken(authHeader);
    
    if (!decodedToken) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the limit (5MB)' }, { status: 400 });
    }
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    try {
      // Ensure uploads directory exists
      const uploadsDir = await ensureUploadsDir();
      
      // Convert the file to a Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Save the file to the uploads directory
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      
      // Return the URL to the uploaded file
      const fileUrl = `/uploads/${fileName}`;
      
      return NextResponse.json({ 
        success: true, 
        url: fileUrl,
        fileName: fileName,
        fileSize: file.size,
        fileType: file.type
      });
    } catch (error: any) {
      console.error('Error saving file:', error);
      return NextResponse.json({ 
        error: 'Failed to save file', 
        details: error.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ 
      error: 'Failed to process upload', 
      details: error.message 
    }, { status: 500 });
  }
} 