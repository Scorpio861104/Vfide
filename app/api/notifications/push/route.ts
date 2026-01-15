import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute (prevent spam subscriptions)
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
    const { userAddress, subscription } = body;

    if (!userAddress || !subscription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys, created_at)
       SELECT u.id, $2, $3, NOW()
       FROM users u
       WHERE u.wallet_address = $1
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET keys = $3
       RETURNING *`,
      [userAddress.toLowerCase(), subscription.endpoint, JSON.stringify(subscription.keys)]
    );

    return NextResponse.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting: 20 requests per minute
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
    const { userAddress, endpoint } = body;

    if (!userAddress || !endpoint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query(
      `DELETE FROM push_subscriptions ps
       USING users u
       WHERE ps.user_id = u.id AND u.wallet_address = $1 AND ps.endpoint = $2`,
      [userAddress.toLowerCase(), endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
