import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { isAddress } from 'viem';
import { z } from 'zod4';

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

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const uploadAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(MAX_FILENAME_LENGTH),
  fileType: z.string().trim().min(1),
  fileSize: z.number().int().min(MIN_FILE_SIZE).max(MAX_FILE_SIZE),
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
});

function isRecord(value: unknown): value is Record<string, unknown> {
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
    const authAddress = typeof authResult.user?.address === 'string' ? authResult.user.address.trim() : '';
    if (!authAddress || !isAddress(authAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: z.infer<typeof uploadAttachmentSchema>;
    try {
      const rawBody = await request.json();
      if (!isRecord(rawBody)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }

      const parsed = uploadAttachmentSchema.safeParse(rawBody);
      if (!parsed.success) {
        const hasMissingFieldIssue = parsed.error.issues.some(
          (issue) => issue.code === 'invalid_type' && ['filename', 'fileType', 'fileSize', 'url'].includes(String(issue.path[0] || ''))
        );
        if (hasMissingFieldIssue) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const hasFileSizeIssue = parsed.error.issues.some((issue) => issue.path[0] === 'fileSize');
        if (hasFileSizeIssue) {
          return NextResponse.json(
            { error: `File size must be between ${MIN_FILE_SIZE} and ${MAX_FILE_SIZE} bytes` },
            { status: 400 }
          );
        }

        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Attachments Upload] Invalid JSON body', error);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { filename: rawFilename, fileType: rawFileType, fileSize, url: rawUrl } = body;

    const filename = typeof rawFilename === 'string' ? rawFilename.trim() : '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const fileType = typeof rawFileType === 'string' ? rawFileType.trim().toLowerCase() : '';

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      logger.debug('[Attachments Upload] Invalid URL format', error);
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
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

    // Block double extensions (e.g., file.php.png)
    const fileBasename = lowerFilename.split('/').pop() || lowerFilename;
    const dotCount = (fileBasename.match(/\./g) || []).length;
    if (dotCount > 1) {
      return NextResponse.json(
        { error: 'Multiple file extensions are not allowed' },
        { status: 400 }
      );
    }

    // Validate MIME type matches file extension
    const fileExt = '.' + fileBasename.split('.').pop();
    const allowedExtsForMime = MIME_EXTENSION_MAP[fileType];
    if (!allowedExtsForMime || !allowedExtsForMime.includes(fileExt)) {
      return NextResponse.json(
        { error: 'File type does not match file extension' },
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
