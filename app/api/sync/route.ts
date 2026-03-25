import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const USER_ID_REGEX = /^\d+$/;
const ENTITY_REGEX = /^[a-zA-Z0-9:_-]{1,64}$/;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddressLike(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (!USER_ID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    const ownerResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authenticatedAddress]
    );

    const authenticatedUserId = ownerResult.rows[0]?.id;
    if (!authenticatedUserId || authenticatedUserId.toString() !== userId.toString()) {
      return NextResponse.json(
        { error: 'You can only access your own sync state' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT * FROM sync_state WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ syncState: result.rows[0] || null });
  } catch (error) {
    logger.error('[Sync GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddressLike(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  try {
    const { userId, entity, lastSyncTimestamp } = body;

    const normalizedUserId =
      typeof userId === 'string' || typeof userId === 'number'
        ? userId.toString()
        : null;

    if (!normalizedUserId || typeof entity !== 'string' || entity.trim().length === 0) {
      return NextResponse.json({ error: 'userId and entity required' }, { status: 400 });
    }

    const normalizedEntity = entity.trim();

    if (!USER_ID_REGEX.test(normalizedUserId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }

    if (!ENTITY_REGEX.test(normalizedEntity)) {
      return NextResponse.json({ error: 'Invalid entity format' }, { status: 400 });
    }

    let syncTimestamp: Date = new Date();
    if (lastSyncTimestamp !== undefined) {
      if (typeof lastSyncTimestamp !== 'string' && typeof lastSyncTimestamp !== 'number') {
        return NextResponse.json({ error: 'Invalid lastSyncTimestamp' }, { status: 400 });
      }

      const parsedTimestamp = new Date(lastSyncTimestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) {
        return NextResponse.json({ error: 'Invalid lastSyncTimestamp' }, { status: 400 });
      }

      syncTimestamp = parsedTimestamp;
    }

    const ownerResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authenticatedAddress]
    );

    const authenticatedUserId = ownerResult.rows[0]?.id;
    if (!authenticatedUserId || authenticatedUserId.toString() !== normalizedUserId) {
      return NextResponse.json(
        { error: 'You can only update your own sync state' },
        { status: 403 }
      );
    }

    const result = await query(
      `INSERT INTO sync_state (user_id, entity, last_sync_timestamp)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entity) DO UPDATE
       SET last_sync_timestamp = $3
       RETURNING *`,
      [normalizedUserId, normalizedEntity, syncTimestamp]
    );

    return NextResponse.json({ success: true, syncState: result.rows[0] });
  } catch (error) {
    logger.error('[Sync POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update sync state' }, { status: 500 });
  }
}
