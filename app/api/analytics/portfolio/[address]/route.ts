import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { withOwnership } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * GET /api/analytics/portfolio/0x...?limit=50&offset=0
 * Get portfolio analytics for a specific address (path-based wrapper)
 * Forwards to the query-based endpoint
 */
type RouteContext = {
  params: Promise<{ address: string }>;
};

async function extractOwnerAddress(
  _request: NextRequest,
  { params }: RouteContext
): Promise<string> {
  const { address } = await params;
  return typeof address === 'string' ? address.trim().toLowerCase() : '';
}

const getHandler = async (
  request: NextRequest,
  _user: JWTPayload,
  { params }: RouteContext
) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { address } = await params;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.trim().toLowerCase();
    if (!ETH_ADDRESS_REGEX.test(normalizedAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Query portfolio data for the address
    const result = await query(
      `SELECT 
        user_id,
        total_balance,
        vfide_balance,
        vault_balance,
        reward_balance,
        created_at,
        updated_at
       FROM user_portfolios
       WHERE LOWER(wallet_address) = $1
       LIMIT 1`,
      [normalizedAddress]
    );

    if (!result || result.rows.length === 0) {
      return NextResponse.json({ portfolio: null });
    }

    const portfolio = result.rows[0];
    return NextResponse.json({ portfolio });
  } catch (error) {
    logger.error('Error fetching portfolio analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withOwnership<RouteContext>(extractOwnerAddress, getHandler);
