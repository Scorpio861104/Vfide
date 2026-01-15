import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validatePositiveInteger, createErrorResponse } from '@/lib/inputValidation';

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
    
    // Validate userId is a positive integer
    const validatedUserId = validatePositiveInteger(userId, 'userId');
    
    // Validate reward IDs array is not empty
    if (rewardIds.length === 0) {
      return NextResponse.json({ error: 'At least one reward ID required' }, { status: 400 });
    }
    
    // Validate reward IDs are valid UUIDs or integers
    const invalidIds = rewardIds.filter((id: string) => {
      // Check if UUID or integer
      return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && 
             !/^\d+$/.test(id);
    });
    
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid reward ID format' }, { status: 400 });
    }

    const result = await query(
      `UPDATE user_rewards
       SET status = 'claimed', claimed_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'
       RETURNING *`,
      [validatedUserId, rewardIds]
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
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}
