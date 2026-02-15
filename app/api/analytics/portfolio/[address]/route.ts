import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string' || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address parameter' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'You can only view your own portfolio' }, { status: 403 });
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [address.toLowerCase()]);
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ portfolio: [] }, { status: 200 });
    }

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await query<{ day: string; total: string }>(
      `SELECT DATE_TRUNC('day', timestamp) AS day, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
       GROUP BY day
       ORDER BY day ASC`,
      [userId, start.toISOString(), end.toISOString()]
    );

    const portfolio = result.rows.map((row) => {
      const day = new Date(row.day);
      const value = Number(row.total || 0);
      return {
        timestamp: day.getTime(),
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
        eth: value,
        btc: 0,
        usdc: 0,
      };
    });

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('[Analytics Portfolio] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
