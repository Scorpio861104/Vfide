import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import type { JWTPayload } from '@/lib/auth/jwt';

import { logger } from '@/lib/logger';

export const GET = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  // Rate limiting: 100 requests per minute for balance lookups
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const resolvedParams = await context!.params;
    const addressParam = resolvedParams?.address;

    if (!addressParam || typeof addressParam !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    const normalizedAddress = addressParam.trim().toLowerCase();

    // Validate address format
    if (!isAddress(normalizedAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Require authentication
    const authAddress = typeof user?.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';
    if (!authAddress || !isAddress(authAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is requesting their own balance
    if (authAddress !== normalizedAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(
      `SELECT tb.* FROM token_balances tb
       JOIN users u ON tb.user_id = u.id
       WHERE u.wallet_address = $1`,
      [normalizedAddress]
    );

    return NextResponse.json({ balances: result.rows });
  } catch (error) {
    logger.error('[Balance API] Error:', error);
    const errorMessage = 'Failed to fetch balances';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
