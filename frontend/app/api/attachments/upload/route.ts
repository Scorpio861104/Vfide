/**
 * Attachment Upload API
 * 
 * Handle file uploads for message attachments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAttachmentType } from '@/lib/attachments';

// Mock storage (replace with cloud storage like S3)
const attachmentsStore = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !messageId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 50MB)' },
        { status: 400 }
      );
    }

    // Generate attachment ID
    const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    // For now, create a mock URL
    const mockUrl = `/api/attachments/${attachmentId}`;

    // Create attachment record
    const attachment = {
      id: attachmentId,
      messageId,
      type: getAttachmentType(file.type),
      name: file.name,
      size: file.size,
      mimeType: file.type,
      url: mockUrl,
      uploadedAt: Date.now(),
      uploadedBy: userId,
    };

    // Store file data (in production, store in cloud)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    attachmentsStore.set(attachmentId, {
      ...attachment,
      buffer,
    });

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
