import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting: 10 requests per minute (prevent reward farming)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const { rewardIds } = body;

    if (!rewardIds || !Array.isArray(rewardIds)) {
      return NextResponse.json({ error: 'rewardIds array required' }, { status: 400 });
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
    console.error('[Rewards Claim] Error:', error);
    return NextResponse.json({ error: 'Failed to claim rewards' }, { status: 500 });
  }
}
