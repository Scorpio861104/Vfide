import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { isAddress } from 'viem';

type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const addressesParam = searchParams.get('addresses');

    const addresses = addressesParam
      ? addressesParam
          .split(',')
          .map((a) => a.trim().toLowerCase())
          .filter((a) => isAddress(a))
      : [authResult.user.address.toLowerCase()];

    const allowed = new Set([authResult.user.address.toLowerCase()]);
    const filtered = addresses.filter((address) => allowed.has(address));

    if (filtered.length === 0) {
      return NextResponse.json({ presence: [] });
    }

    const result = await query(
      `SELECT u.wallet_address, up.status, up.last_seen_at, up.last_activity_at
       FROM user_presence up
       JOIN users u ON up.user_id = u.id
       WHERE u.wallet_address = ANY($1::text[])`,
      [filtered]
    );

    return NextResponse.json({
      presence: result.rows.map((row) => ({
        address: row.wallet_address,
        status: row.status,
        lastSeen: new Date(row.last_seen_at).getTime(),
        lastActivity: new Date(row.last_activity_at).getTime(),
      })),
    });
  } catch (error) {
    console.error('[Presence GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { address, status, lastActivity } = body as {
      address?: string;
      status?: PresenceStatus;
      lastActivity?: number;
    };

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // API-25 Fix: Runtime validation of status against whitelist
    const VALID_STATUSES: PresenceStatus[] = ['online', 'offline', 'away', 'busy'];
    const normalizedStatus: PresenceStatus = (status && VALID_STATUSES.includes(status)) ? status : 'online';
    const now = new Date();
    const activityDate = lastActivity ? new Date(lastActivity) : now;

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await query(
      `INSERT INTO user_presence (user_id, status, last_seen_at, last_activity_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET status = EXCLUDED.status,
           last_seen_at = EXCLUDED.last_seen_at,
           last_activity_at = EXCLUDED.last_activity_at,
           updated_at = NOW()`,
      [userId, normalizedStatus, now.toISOString(), activityDate.toISOString()]
    );

    await query(
      'UPDATE users SET last_seen_at = $2 WHERE id = $1',
      [userId, now.toISOString()]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Presence POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}