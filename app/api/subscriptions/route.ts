import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

type SubscriptionRow = {
  id: number;
  merchant_address: string;
  merchant_name: string | null;
  amount: string;
  frequency: string;
  next_payment: string;
  status: string;
  created_at: string;
};

const getNextPayment = (frequency: string) => {
  const now = new Date();
  switch (frequency) {
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
    case 'monthly':
    default:
      now.setMonth(now.getMonth() + 1);
      break;
  }
  return now;
};

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const userAddress = request.nextUrl.searchParams.get('userAddress');
    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json({ subscriptions: [] });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query<SubscriptionRow>(
      `SELECT s.id, s.merchant_address, s.merchant_name, s.amount, s.frequency,
              s.next_payment, s.status, s.created_at
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE u.wallet_address = $1
       ORDER BY s.created_at DESC`,
      [userAddress.toLowerCase()]
    );

    return NextResponse.json({ subscriptions: result.rows });
  } catch (error) {
    console.error('[Subscriptions GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
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
    const { userAddress, merchantAddress, merchantName, amount, frequency } = body as {
      userAddress?: string;
      merchantAddress?: string;
      merchantName?: string;
      amount?: string;
      frequency?: string;
    };

    if (!userAddress || !merchantAddress || !amount || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isAddress(userAddress) || !isAddress(merchantAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userAddress.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nextPayment = getNextPayment(frequency);

    const result = await query<SubscriptionRow>(
      `INSERT INTO subscriptions (user_id, merchant_address, merchant_name, amount, frequency, next_payment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, merchant_address, merchant_name, amount, frequency, next_payment, status, created_at`,
      [userId, merchantAddress.toLowerCase(), merchantName ?? null, amount, frequency, nextPayment.toISOString()]
    );

    return NextResponse.json({ success: true, subscription: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[Subscriptions POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { userAddress, subscriptionId, status } = body as {
      userAddress?: string;
      subscriptionId?: number;
      status?: 'active' | 'paused' | 'cancelled';
    };

    if (!userAddress || !subscriptionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // API-18 Fix: Runtime validation of status against whitelist
    const VALID_STATUSES = ['active', 'paused', 'cancelled'] as const;
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    if (!isAddress(userAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query<SubscriptionRow>(
      `UPDATE subscriptions s
       SET status = $3, updated_at = NOW()
       FROM users u
       WHERE s.id = $2 AND s.user_id = u.id AND u.wallet_address = $1
       RETURNING s.id, s.merchant_address, s.merchant_name, s.amount, s.frequency, s.next_payment, s.status, s.created_at`,
      [userAddress.toLowerCase(), subscriptionId, status]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    console.error('[Subscriptions PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}