import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validatePositiveInteger, createErrorResponse } from '@/lib/inputValidation';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    // Validate userId is a positive integer
    const validatedUserId = validatePositiveInteger(userId, 'userId');

    const result = await query(
      `SELECT * FROM payment_requests
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC`,
      [validatedUserId]
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error('[Payment Requests GET] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute (prevent spam)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const { fromUserId, toUserId, amount, token, memo } = body;

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate user IDs are positive integers
    const validatedFromUserId = validatePositiveInteger(String(fromUserId), 'fromUserId');
    const validatedToUserId = validatePositiveInteger(String(toUserId), 'toUserId');
    
    // Validate amount is a positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    
    // Validate memo length if provided
    if (memo && memo.length > 500) {
      return NextResponse.json({ error: 'Memo must not exceed 500 characters' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO payment_requests (from_user_id, to_user_id, amount, token, memo, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [validatedFromUserId, validatedToUserId, amount, token || 'ETH', memo]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Requests POST] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: error instanceof Error && error.message.includes('must be') ? 400 : 500 }
    );
  }
}
