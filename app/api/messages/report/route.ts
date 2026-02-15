import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { messageId, reason } = body as { messageId?: string; reason?: string };

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await query(
      `INSERT INTO message_reports (message_id, reporter_id, reason)
       VALUES ($1, $2, $3)`,
      [messageId, userId, reason ?? null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Message Report] Error:', error);
    return NextResponse.json({ error: 'Failed to report message' }, { status: 500 });
  }
}