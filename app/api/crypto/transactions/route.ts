import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';

const ALLOWED_TYPES = new Set(['send', 'receive', 'tip', 'reward', 'payment_request', 'group_payment']);
const ALLOWED_STATUS = new Set(['pending', 'confirmed', 'failed']);

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, amount, status, txHash, timestamp } = body || {};

    if (!type || !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    if (status && !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid transaction status' }, { status: 400 });
    }

    const parsedAmount = amount !== undefined && amount !== null ? Number(amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0)) {
      return NextResponse.json({ error: 'Invalid amount: must be a positive number' }, { status: 400 });
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [authResult.user.address.toLowerCase()]);
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO transactions (user_id, tx_hash, type, amount, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash) DO UPDATE SET
         status = EXCLUDED.status,
         timestamp = EXCLUDED.timestamp
       WHERE transactions.user_id = EXCLUDED.user_id
       RETURNING *`,
      [
        userId,
        txHash || null,
        type,
        parsedAmount,
        status || 'pending',
        timestamp ? new Date(timestamp) : new Date(),
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized transaction update' }, { status: 403 });
    }

    return NextResponse.json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    console.error('[Transactions POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }
}
