import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`attachments-get:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  try {
    const { id } = await params;

    const result = await query(`SELECT * FROM attachments WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ attachment: result.rows[0] });
  } catch (error) {
    apiLogger.error('[Attachments GET] Error', { error });
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`attachments-delete:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const { id } = await params;

    const result = await query(`DELETE FROM attachments WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, attachment: result.rows[0] });
  } catch (error) {
    apiLogger.error('[Attachments DELETE] Error', { error });
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
