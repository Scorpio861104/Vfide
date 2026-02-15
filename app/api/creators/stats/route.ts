import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';

type SubscriptionRow = {
  amount: string;
  created_at: string;
  wallet_address: string;
  display_name: string | null;
  username: string | null;
};

type SupporterRow = {
  wallet_address: string;
  display_name: string | null;
  username: string | null;
  amount: string;
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const creatorAddress = request.nextUrl.searchParams.get('creatorAddress');
    if (!creatorAddress || !isAddress(creatorAddress)) {
      return NextResponse.json({ error: 'Valid creatorAddress required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== creatorAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const totalSubscribersResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM subscriptions s
       WHERE s.merchant_address = $1 AND s.status != 'cancelled'`,
      [creatorAddress.toLowerCase()]
    );

    const totalSubscribers = parseInt(totalSubscribersResult.rows[0]?.count || '0', 10) || 0;

    const totalEarningsResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(s.amount), 0) as total
       FROM subscriptions s
       WHERE s.merchant_address = $1 AND s.status != 'cancelled'`,
      [creatorAddress.toLowerCase()]
    );

    const totalEarnings = String(totalEarningsResult.rows[0]?.total ?? '0');

    const tipsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM activities a
       WHERE a.activity_type = 'tip'
         AND (a.data->>'creatorAddress') = $1`,
      [creatorAddress.toLowerCase()]
    );

    const unlocksResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM activities a
       WHERE a.activity_type = 'unlock'
         AND (a.data->>'creatorAddress') = $1`,
      [creatorAddress.toLowerCase()]
    );

    const totalTips = parseInt(tipsResult.rows[0]?.count || '0', 10) || 0;
    const totalUnlocks = parseInt(unlocksResult.rows[0]?.count || '0', 10) || 0;

    const topSupportersResult = await query<SupporterRow>(
      `SELECT u.wallet_address, u.display_name, u.username, COALESCE(SUM(s.amount), 0) as amount
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.merchant_address = $1
       GROUP BY u.wallet_address, u.display_name, u.username
       ORDER BY amount DESC
       LIMIT 5`,
      [creatorAddress.toLowerCase()]
    );

    const recentSubscriptions = await query<SubscriptionRow>(
      `SELECT s.amount, s.created_at, u.wallet_address, u.display_name, u.username
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.merchant_address = $1
       ORDER BY s.created_at DESC
       LIMIT 10`,
      [creatorAddress.toLowerCase()]
    );

    const recentTransactions = recentSubscriptions.rows.map((row, index) => ({
      id: `${row.wallet_address}-${row.created_at}-${index}`,
      type: 'subscription' as const,
      amount: String(row.amount),
      from: row.display_name || row.username || row.wallet_address,
      timestamp: row.created_at,
    }));

    return NextResponse.json({
      totalEarnings,
      totalTips,
      totalUnlocks,
      totalSubscribers,
      topSupporters: topSupportersResult.rows.map((row) => ({
        address: row.wallet_address,
        displayName: row.display_name || row.username || row.wallet_address,
        amount: String(row.amount),
      })),
      recentTransactions,
    });
  } catch (error) {
    console.error('[Creator Stats GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load creator stats' }, { status: 500 });
  }
}
