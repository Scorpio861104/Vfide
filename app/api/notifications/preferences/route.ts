import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;
const ALLOWED_PREFERENCE_KEYS = new Set(['messages', 'proposals', 'endorsements', 'system_updates']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const rawUserAddress = searchParams.get('userAddress');

    if (!rawUserAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const userAddress = normalizeAddress(rawUserAddress);
    if (!isAddressLike(userAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 });
    }

    // Require the caller to be the owner of these preferences
    const authResult = await requireOwnership(request, userAddress);
    if (authResult instanceof NextResponse) return authResult;

    const result = await query(
      `SELECT np.* FROM notification_preferences np
       JOIN users u ON np.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress]
    );

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO notification_preferences (user_id, messages, proposals, endorsements, system_updates)
         SELECT id, true, true, true, true FROM users WHERE wallet_address = $1 RETURNING *`,
        [userAddress]
      );
      return NextResponse.json({ preferences: insertResult.rows[0] });
    }

    return NextResponse.json({ preferences: result.rows[0] });
  } catch (error) {
    logger.error('[Notification Preferences GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  try {
    const { userAddress: rawUserAddress, ...preferences } = body;

    if (!rawUserAddress || typeof rawUserAddress !== 'string') {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const userAddress = normalizeAddress(rawUserAddress);
    if (!isAddressLike(userAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 });
    }

    for (const key of ALLOWED_PREFERENCE_KEYS) {
      if (preferences[key] !== undefined && typeof preferences[key] !== 'boolean') {
        return NextResponse.json({ error: `Preference ${key} must be a boolean` }, { status: 400 });
      }
    }

    // Require the caller to be the owner of these preferences
    const authResult = await requireOwnership(request, userAddress);
    if (authResult instanceof NextResponse) return authResult;

    const messagesPref = typeof preferences.messages === 'boolean' ? preferences.messages : null;
    const proposalsPref = typeof preferences.proposals === 'boolean' ? preferences.proposals : null;
    const endorsementsPref = typeof preferences.endorsements === 'boolean' ? preferences.endorsements : null;
    const systemUpdatesPref =
      typeof preferences.system_updates === 'boolean' ? preferences.system_updates : null;

    const result = await query(
      `UPDATE notification_preferences np
       SET messages = COALESCE($2, messages),
           proposals = COALESCE($3, proposals),
           endorsements = COALESCE($4, endorsements),
           system_updates = COALESCE($5, system_updates)
       FROM users u
       WHERE np.user_id = u.id AND u.wallet_address = $1
       RETURNING np.*`,
      [
        userAddress,
        messagesPref,
        proposalsPref,
        endorsementsPref,
        systemUpdatesPref,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    logger.error('[Notification Preferences PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
