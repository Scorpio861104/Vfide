import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/lib/logger.service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`rewards:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

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
    apiLogger.error('[Rewards GET] Error', { error });
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}
