import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`payment-requests:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM payment_requests
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    apiLogger.error('Failed to fetch payment requests', { error });
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`payment-requests-post:${clientId}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();
    const { fromUserId, toUserId, amount, token, memo } = body;

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (auth.user?.id !== fromUserId) {
      return NextResponse.json({ error: 'Cannot create payment request for another user' }, { status: 403 });
    }

    const result = await query(
      `INSERT INTO payment_requests (from_user_id, to_user_id, amount, token, memo, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [fromUserId, toUserId, amount, token || 'ETH', memo]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    apiLogger.error('Failed to create payment request', { error });
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
