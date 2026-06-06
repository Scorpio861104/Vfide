/**
 * /api/crypto/transactions/[userId]
 * GET — paginated transaction history for the AUTHENTICATED caller.
 *
 * The [userId] path segment is retained for backward-compatible URLs but is
 * NOT used to select rows. Results are always scoped to the authenticated
 * wallet — as owner, sender, or receiver — mirroring the transactions_party_access
 * RLS policy. This prevents reading another user's history by passing their id,
 * and ensures authorization does not rely on RLS alone (defense-in-depth).
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

export async function GET(request: NextRequest) {
  // Rate-limit guard
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Auth guard — requireAuth returns a NextResponse (401) when unauthorized,
  // or { user } when authenticated.
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Scope strictly to the authenticated wallet. requireAuth guarantees a
  // verified token; defensively re-validate the address shape.
  const callerAddress =
    typeof authResult.user.address === 'string'
      ? authResult.user.address.trim().toLowerCase()
      : '';
  if (!/^0x[a-f0-9]{40}$/.test(callerAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Fetch paginated transactions where the caller is a party (owner, sender,
  // or receiver). RLS (transactions_party_access) enforces the same restriction
  // at the row level; this WHERE mirrors it so the route does not rely on RLS
  // alone. query() also sets app.current_user_address to the caller for RLS.
  const txResult = await query(
    `SELECT * FROM transactions
       WHERE LOWER(COALESCE(user_address, '')) = $1
          OR LOWER(COALESCE(from_address, '')) = $1
          OR LOWER(COALESCE(to_address, '')) = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [callerAddress, limit, offset]
  );

  return NextResponse.json({
    transactions: txResult.rows,
    hasMore: txResult.rows.length === limit,
    total: txResult.rows.length,
  });
}
