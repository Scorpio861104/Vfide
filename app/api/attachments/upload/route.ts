import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 1;
const MAX_FILENAME_LENGTH = 255;
const MAX_URL_LENGTH = 2048;
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    if (!authResult.user?.address || typeof authResult.user.address !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename: rawFilename, fileType: rawFileType, fileSize, url: rawUrl } = body;

    const filename = typeof rawFilename === 'string' ? rawFilename.trim() : '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const fileType = typeof rawFileType === 'string' ? rawFileType.trim().toLowerCase() : '';

    if (filename.length === 0 || url.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (filename.length > MAX_FILENAME_LENGTH) {
      return NextResponse.json({ error: `Filename too long. Maximum ${MAX_FILENAME_LENGTH} characters.` }, { status: 400 });
    }

    if (url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: `URL too long. Maximum ${MAX_URL_LENGTH} characters.` }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    if (fileType.length === 0) {
      return NextResponse.json({ error: 'Missing required field: fileType' }, { status: 400 });
    }

    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || !Number.isInteger(fileSize)) {
      return NextResponse.json({ error: 'Missing required field: fileSize' }, { status: 400 });
    }

    // Validate file size
    if (fileSize < MIN_FILE_SIZE || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be between ${MIN_FILE_SIZE} byte and ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
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

    // Validate file extension first (before sanitization)
    const lowerFilename = filename.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      );
    }

    // Check for path traversal before sanitization
    if (filename.includes('..') || filename.startsWith('/') || filename.includes('\\') || filename.includes('\0')) {
      return NextResponse.json(
        { error: 'Invalid filename - path traversal detected' },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)',
      [authResult.user.address]
    );

    const uploaderId = userResult.rows[0]?.id;
    if (!uploaderId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO attachments (uploaded_by, filename, file_type, file_size, url, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [uploaderId, sanitizedFilename, fileType, fileSize, url]
    );

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    logger.error('[Attachments Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
