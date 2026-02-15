import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';

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
    const userAddress = searchParams.get('userAddress') || authResult.user.address;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ error: 'userAddress required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only view your own payment requests' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT * FROM payment_requests
       WHERE from_address = $1 OR to_address = $1
       ORDER BY created_at DESC`,
      [userAddress.toLowerCase()]
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error('[Payment Requests GET] Error:', error);
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
    const { toAddress, amount, token, memo } = body as {
      toAddress?: string;
      amount?: string;
      token?: string;
      memo?: string;
    };

    if (!toAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }

    // Validate amount: must be a plain decimal number (no scientific notation, no leading +)
    const AMOUNT_REGEX = /^\d+(\.\d{1,18})?$/;
    if (typeof amount !== 'string' || !AMOUNT_REGEX.test(amount)) {
      return NextResponse.json({ error: 'Amount must be a plain decimal number (e.g. "100" or "99.50")' }, { status: 400 });
    }

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

    const fromAddress = authResult.user.address;
    if (!isAddress(fromAddress)) {
      return NextResponse.json({ error: 'Invalid sender address' }, { status: 400 });
    }
    const fromUserResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [fromAddress.toLowerCase()]
    );
    const fromUserId = fromUserResult.rows[0]?.id ?? null;

    const toUserResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [toAddress.toLowerCase()]
    );
    const toUserId = toUserResult.rows[0]?.id ?? null;

    const result = await query(
      `INSERT INTO payment_requests (from_user_id, to_user_id, from_address, to_address, amount, token, memo, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING *`,
      [fromUserId, toUserId, fromAddress.toLowerCase(), toAddress.toLowerCase(), amount, token || 'ETH', memo ?? null]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('[Payment Requests POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
