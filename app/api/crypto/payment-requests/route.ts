import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    log.error('[Payment Requests GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fromUserId, toUserId, amount, token, memo } = body;

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amount is positive and within reasonable bounds
    const numAmount = parseFloat(amount);
    const MAX_PAYMENT_AMOUNT = 1000000; // 1 million units max
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }
    
    if (numAmount > MAX_PAYMENT_AMOUNT) {
      return NextResponse.json(
        { error: `Amount exceeds maximum limit of ${MAX_PAYMENT_AMOUNT}` },
        { status: 400 }
      );
    }

    // Validate token if provided
    const ALLOWED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'];
    const tokenValue = token || 'ETH';
    
    if (!ALLOWED_TOKENS.includes(tokenValue.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid token. Allowed tokens: ${ALLOWED_TOKENS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate memo length if provided
    if (memo && typeof memo === 'string' && memo.length > 500) {
      return NextResponse.json(
        { error: 'Memo must be 500 characters or less' },
        { status: 400 }
      );
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
    log.error('[Payment Requests POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
