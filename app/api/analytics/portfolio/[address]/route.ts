import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireOwnership } from '@/lib/auth/middleware';
import { logger } from '@/lib/logger';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * GET /api/analytics/portfolio/0x...?limit=50&offset=0
 * Get portfolio analytics for a specific address (path-based wrapper)
 * Forwards to the query-based endpoint
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ address: string }>;
  }
) {
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

    const authResult = await requireOwnership(request, normalizedAddress);
    if (authResult instanceof NextResponse) return authResult;

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
