import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { validateRequest, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`rewards-claim:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const { userId } = await params;
    const body = await request.json();

    // Validation
    const validation = validateRequest(body, {
      rewardIds: { required: true, type: 'array' }
    });
    if (!validation.valid) return validation.errorResponse;

    const { rewardIds } = body;

    // Ownership verification - ensure user can only claim their own rewards
    if (auth.user?.id && auth.user.id !== userId) {
      return NextResponse.json(
        { error: 'Cannot claim rewards for another user' },
        { status: 403 }
      );
    }

    if (!Array.isArray(rewardIds)) {
      return NextResponse.json({ error: 'rewardIds must be an array' }, { status: 400 });
    }

    const result = await query(
      `UPDATE user_rewards
       SET status = 'claimed', claimed_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'
       RETURNING *`,
      [userId, rewardIds]
    );

    const totalClaimed = result.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return NextResponse.json({
      success: true,
      claimed: result.rows.length,
      totalAmount: totalClaimed,
      rewards: result.rows
    });
  } catch (error) {
    apiLogger.error('[Rewards Claim] Error', { error });
    return NextResponse.json({ error: 'Failed to claim rewards' }, { status: 500 });
  }
}
