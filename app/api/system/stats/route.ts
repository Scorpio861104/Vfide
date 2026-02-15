import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenAddressParam = searchParams.get('tokenAddress');
    const defaultTokenAddress = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
    const tokenAddress = tokenAddressParam
      ? (isAddress(tokenAddressParam) ? tokenAddressParam.toLowerCase() : null)
      : (defaultTokenAddress && isAddress(defaultTokenAddress) ? defaultTokenAddress.toLowerCase() : null);

    const tvlResult = tokenAddress
      ? await query<{ total: string }>(
          'SELECT COALESCE(SUM(balance), 0) AS total FROM token_balances WHERE token_address = $1',
          [tokenAddress]
        )
      : await query<{ total: string }>('SELECT COALESCE(SUM(balance), 0) AS total FROM token_balances');

    const vaultsResult = await query<{ count: string }>(
      "SELECT COALESCE(COUNT(DISTINCT user_id), 0) AS count FROM activities WHERE activity_type ILIKE '%vault%'"
    );

    const merchantsResult = await query<{ count: string }>(
      "SELECT COALESCE(COUNT(DISTINCT user_id), 0) AS count FROM activities WHERE activity_type ILIKE '%merchant%'"
    );

    const transactionsResult = await query<{ count: string }>(
      "SELECT COALESCE(COUNT(*), 0) AS count FROM transactions WHERE timestamp >= NOW() - INTERVAL '24 hours'"
    );

    const avgProofScoreResult = await query<{ avg: string }>(
      'SELECT COALESCE(AVG(proof_score), 0) AS avg FROM users'
    );

    const proposalsResult = await query<{ count: string }>(
      'SELECT COALESCE(COUNT(*), 0) AS count FROM proposals'
    );

    const eliteUsersResult = await query<{ count: string }>(
      'SELECT COALESCE(COUNT(*), 0) AS count FROM users WHERE proof_score >= 800'
    );

    const volume24hResult = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE timestamp >= NOW() - INTERVAL '24 hours'"
    );

    return NextResponse.json({
      tvl: Number(tvlResult.rows[0]?.total ?? 0),
      vaults: Number(vaultsResult.rows[0]?.count ?? 0),
      merchants: Number(merchantsResult.rows[0]?.count ?? 0),
      transactions24h: Number(transactionsResult.rows[0]?.count ?? 0),
      avgProofScore: Number(avgProofScoreResult.rows[0]?.avg ?? 0),
      daoProposals: Number(proposalsResult.rows[0]?.count ?? 0),
      eliteUsers: Number(eliteUsersResult.rows[0]?.count ?? 0),
      volume24h: Number(volume24hResult.rows[0]?.total ?? 0),
    });
  } catch (error) {
    console.error('[System Stats GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch system stats' }, { status: 500 });
  }
}
