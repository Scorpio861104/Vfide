import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

interface OrderRow {
  id: number;
  order_id: string;
  amount: string;
  status: string;
  created_at: string;
  metadata: unknown;
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ orders: [], limit, offset });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query<OrderRow>(
      `SELECT eo.id, eo.order_id, eo.amount, eo.status, eo.created_at, eo.metadata
       FROM enterprise_orders eo
       JOIN users u ON eo.user_id = u.id
       WHERE u.wallet_address = $1
       ORDER BY eo.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userAddress.toLowerCase(), limit, offset]
    );

    return NextResponse.json({
      orders: result.rows,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Enterprise Orders GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch enterprise orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { orderId, amount, metadata } = body as {
      orderId?: string;
      amount?: string;
      metadata?: string;
    };

    if (!orderId || !amount) {
      return NextResponse.json({ error: 'orderId and amount are required' }, { status: 400 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await query<OrderRow>(
      `INSERT INTO enterprise_orders (user_id, order_id, amount, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, order_id, amount, status, created_at, metadata`,
      [userId, orderId, amount, metadata ? JSON.stringify({ note: metadata }) : null]
    );

    return NextResponse.json({
      success: true,
      order: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('[Enterprise Orders POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
