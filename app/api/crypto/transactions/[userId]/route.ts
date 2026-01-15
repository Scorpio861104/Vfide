import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validatePositiveInteger, validateLimit, validateOffset, createErrorResponse } from '@/lib/inputValidation';

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
    const { searchParams } = new URL(request.url);
    
    // Validate userId is a positive integer
    const validatedUserId = validatePositiveInteger(userId, 'userId');
    
    // Validate pagination parameters
    const limit = validateLimit(searchParams.get('limit'));
    const offset = validateOffset(searchParams.get('offset'));

    const result = await query(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [validatedUserId, limit, offset]
    );

    return NextResponse.json({ transactions: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}
