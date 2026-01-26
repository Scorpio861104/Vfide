import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx'];

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userId, filename, fileType, fileSize, url } = body;

    if (!userId || !filename || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file size
    if (fileSize && typeof fileSize === 'number') {
      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
    }

    // Validate file type
    if (fileType && typeof fileType === 'string') {
      if (!ALLOWED_FILE_TYPES.includes(fileType.toLowerCase())) {
        return NextResponse.json(
          { error: 'File type not allowed. Supported types: images, PDF, and documents' },
          { status: 400 }
        );
      }
    }

    // Validate file extension
    const lowerFilename = filename.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (sanitizedFilename.includes('..') || sanitizedFilename.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO attachments (user_id, filename, file_type, file_size, url, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, sanitizedFilename, fileType, fileSize, url]
    );

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    console.error('[Attachments Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
