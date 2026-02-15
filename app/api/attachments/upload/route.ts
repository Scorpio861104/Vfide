import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { randomUUID } from 'crypto';

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

/** Map of MIME type to expected file extensions for cross-validation */
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

/** Extract file extension from a filename (lowercased) */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/** Generate a UUID-based storage filename preserving the original extension */
function generateStorageFilename(originalFilename: string): string {
  const ext = getFileExtension(originalFilename);
  return `${randomUUID()}${ext}`;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { userId, userAddress, filename, fileType, fileSize, url } = body;

    if (!filename || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof fileSize !== 'number' || typeof fileType !== 'string') {
      return NextResponse.json({ error: 'fileSize and fileType are required' }, { status: 400 });
    }

    const authAddress = authResult.user?.address?.toLowerCase();
    if (!authAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userAddress && typeof userAddress === 'string' && userAddress.toLowerCase() !== authAddress) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    const resolvedUserId = userResult.rows[0]?.id;
    if (!resolvedUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userId && String(userId) !== String(resolvedUserId)) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(fileType.toLowerCase())) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported types: images, PDF, and documents' },
        { status: 400 }
      );
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid attachment URL' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid attachment URL scheme' }, { status: 400 });
    }

    if (parsedUrl.protocol === 'http:' && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Insecure attachment URL not allowed' }, { status: 400 });
    }


    // Validate file extension first (before sanitization)
    const lowerFilename = filename.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      );
    }

    // Cross-validate: file extension must match the claimed MIME type
    // This serves as a server-side consistency check since we cannot inspect
    // magic bytes when the file is hosted externally. If the claimed type
    // does not match the extension, reject the upload.
    const fileExt = getFileExtension(filename);
    const expectedExtensions = MIME_TO_EXTENSIONS[fileType.toLowerCase()];
    if (!expectedExtensions || !expectedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: 'File extension does not match the declared file type' },
        { status: 400 }
      );
    }

    // Check for path traversal before sanitization
    if (filename.includes('..') || filename.startsWith('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename - path traversal detected' },
        { status: 400 }
      );
    }

    // Generate a UUID-based storage filename instead of using the client-provided name.
    // This prevents path traversal, name collisions, and information leakage from
    // original filenames.
    const storageFilename = generateStorageFilename(filename);

    const result = await query(
      `INSERT INTO attachments (uploaded_by, filename, file_type, file_size, url, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, uploaded_by, filename, file_type, file_size, url, created_at`,
      [resolvedUserId, storageFilename, fileType, fileSize, url]
    );

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    console.error('[Attachments Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
