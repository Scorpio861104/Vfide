import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { validateRequest, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`attachments-upload:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();

    // Validation
    const validation = validateRequest(body, {
      userId: { required: true, type: 'string' },
      filename: { required: true, type: 'string' },
      url: { required: true, type: 'string' }
    });
    if (!validation.valid) return validation.errorResponse;

    const { userId, filename, fileType, fileSize, url } = body;

    const result = await query(
      `INSERT INTO attachments (user_id, filename, file_type, file_size, url, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, filename, fileType, fileSize, url]
    );

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    apiLogger.error('[Attachments Upload] Error', { error });
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
