import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const MAX_TRANSACTIONS_LIMIT = 100;
const MAX_TRANSACTIONS_OFFSET = 10000;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;
  const authAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await context!.params;
    const userIdParam = resolvedParams?.userId;

    if (!userIdParam || typeof userIdParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    // Validate format before any DB lookup: accept positive integer OR own wallet address.
    let requestedUserId = parsePositiveInteger(userIdParam);

    if (requestedUserId === null) {
      const normalizedRequestedAddress = userIdParam.trim().toLowerCase();
      if (!ADDRESS_LIKE_REGEX.test(normalizedRequestedAddress)) {
        return NextResponse.json(
          { error: 'Invalid userId parameter' },
          { status: 400 }
        );
      }

      if (normalizedRequestedAddress !== authAddress) {
        return NextResponse.json(
          { error: 'You can only view your own transactions' },
          { status: 403 }
        );
      }
    }

    // Resolve authenticated user once.
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    const authenticatedUserId = userResult.rows[0]?.id;
    if (userResult.rows.length === 0 || !authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requestedUserId === null) {
      requestedUserId = Number(authenticatedUserId);
    }

    if (authenticatedUserId.toString() !== requestedUserId.toString()) {
      return NextResponse.json(
        { error: 'You can only view your own transactions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(Math.max(parsedLimit ?? 50, 0), MAX_TRANSACTIONS_LIMIT);
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_TRANSACTIONS_OFFSET);

    const result = await query(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [requestedUserId, limit, offset]
    );

    return NextResponse.json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    logger.error('[Transactions API] Error:', error);
    const errorMessage = 'Failed to fetch transactions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
