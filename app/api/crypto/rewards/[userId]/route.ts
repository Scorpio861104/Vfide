import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  try {
    const { userId } = await params;

    const result = await query(
      `SELECT * FROM user_rewards
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const unclaimed = result.rows.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return NextResponse.json({
      rewards: result.rows,
      total,
      unclaimed,
      claimed: total - unclaimed
    });
  } catch (error) {
    console.error('[Rewards GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}
