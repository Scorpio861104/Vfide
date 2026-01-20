import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Verify authenticated user matches requested userId
    // This prevents users from accessing other users' payment requests
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (userResult.rows.length === 0 || !userId || userId.toString() !== userIdParam) {
      return NextResponse.json(
        { error: 'You can only view your own payment requests' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT * FROM payment_requests
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error('[Payment Requests GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute for write operations
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { fromUserId, toUserId, amount, token, memo } = body;

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amount is positive
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    // Verify authenticated user matches fromUserId
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (userResult.rows.length === 0 || !userId || userId.toString() !== fromUserId.toString()) {
      return NextResponse.json(
        { error: 'You can only create payment requests from your own account' },
        { status: 403 }
      );
    }

    const result = await query(
      `INSERT INTO payment_requests (from_user_id, to_user_id, amount, token, memo, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [fromUserId, toUserId, amount, token || 'ETH', memo]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Requests POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
