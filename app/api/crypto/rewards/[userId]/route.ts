import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    const ownerResult = await query<{ wallet_address: string }>(
      'SELECT wallet_address FROM users WHERE id = $1',
      [userId]
    );

    const ownerAddress = ownerResult.rows[0]?.wallet_address;
    if (!ownerAddress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (authResult.user.address.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT * FROM user_rewards
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const totalUnclaimed = result.rows.filter(r => r.status === 'pending' || !r.claimed).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return NextResponse.json({
      rewards: result.rows,
      total,
      totalUnclaimed: totalUnclaimed.toString(),
      unclaimed: totalUnclaimed,
      claimed: total - totalUnclaimed
    });
  } catch (error) {
    console.error('[Rewards GET] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch rewards';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
