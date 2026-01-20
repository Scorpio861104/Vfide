import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateBody, pushSubscriptionSchema, pushUnsubscribeSchema } from '@/lib/auth/validation';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const validation = await validateBody(request, pushSubscriptionSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { userAddress, subscription } = validation.data;

    // Verify user is subscribing for themselves
    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only subscribe for your own account' },
        { status: 403 }
      );
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
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const validation = await validateBody(request, pushUnsubscribeSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { userAddress, endpoint } = validation.data;

    // Verify user is unsubscribing for themselves
    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only unsubscribe from your own account' },
        { status: 403 }
      );
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
}
