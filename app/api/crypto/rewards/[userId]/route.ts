import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validatePositiveInteger, createErrorResponse } from '@/lib/inputValidation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting: 40 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 40, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { userId } = await params;
    
    // Validate userId is a positive integer
    const validatedUserId = validatePositiveInteger(userId, 'userId');

    const result = await query(
      `SELECT * FROM user_rewards
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [validatedUserId]
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
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}
