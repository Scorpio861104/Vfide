import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`sync-get:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM sync_state WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ syncState: result.rows[0] || null });
  } catch (error) {
    apiLogger.error('Failed to fetch sync state', { error });
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`sync-post:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const { userId, entity, lastSyncTimestamp } = body;

    if (!userId || !entity) {
      return NextResponse.json({ error: 'userId and entity required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO sync_state (user_id, entity, last_sync_timestamp)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entity) DO UPDATE
       SET last_sync_timestamp = $3
       RETURNING *`,
      [userId, entity, lastSyncTimestamp || new Date()]
    );

    return NextResponse.json({ success: true, syncState: result.rows[0] });
  } catch (error) {
    apiLogger.error('Failed to update sync state', { error });
    return NextResponse.json({ error: 'Failed to update sync state' }, { status: 500 });
  }
}
