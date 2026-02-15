import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    // Require ownership - only the user can access their own rewards
    const authResult = await requireOwnership(request, userId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userId.toLowerCase()]
    );

    const internalUserId = userResult.rows[0]?.id;
    if (!internalUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const result = await query(
      `SELECT id, amount, reason, status, earned_at, claimed_at FROM user_rewards
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [internalUserId]
    );

    const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const totalUnclaimed = result.rows.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return NextResponse.json({
      rewards: result.rows,
      total,
      totalUnclaimed: totalUnclaimed.toString(),
      unclaimed: totalUnclaimed,
      claimed: total - totalUnclaimed
    });
  } catch (error) {
    console.error('[Rewards GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
