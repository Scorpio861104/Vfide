/**
 * /api/crypto/transactions/[userId]
 * GET — paginated transaction history for a user (numeric DB user ID or wallet address).
 *
 * Query params:
 *   limit  — max records, clamped to 100 (default 50)
 *   offset — skip N records, clamped to 10000 (default 0)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Rate-limit guard
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Auth guard — requireAuth returns a NextResponse (401/403) when unauthorized,
  // or { user } when authenticated. We only block if it returns a Response-like object.
  const authResult = await Promise.resolve(requireAuth(request));
  if (authResult && 'status' in (authResult as object) && !('user' in (authResult as object))) {
    return authResult as unknown as NextResponse;
  }

  const { userId } = await params;

  // Validate userId — must be numeric
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const numericUserId = parseInt(userId, 10);

  // Validate & clamp pagination params
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  if (rawLimit !== null && !/^\d+$/.test(rawLimit)) {
    return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
  }
  if (rawOffset !== null && !/^\d+$/.test(rawOffset)) {
    return NextResponse.json({ error: 'Invalid offset parameter' }, { status: 400 });
  }

  const limit = Math.min(rawLimit ? parseInt(rawLimit, 10) : 50, 100);
  const offset = Math.min(rawOffset ? parseInt(rawOffset, 10) : 0, 10000);

  // Verify the user exists
  const userResult = await query('SELECT id FROM users WHERE id = $1', [numericUserId]);
  if (!userResult.rows.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch paginated transactions
  const txResult = await query(
    `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [numericUserId, limit, offset]
  );

  return NextResponse.json({
    transactions: txResult.rows,
    hasMore: txResult.rows.length === limit,
    total: txResult.rows.length,
  });
}
