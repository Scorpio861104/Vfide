import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

const pushSubscriptionPayloadSchema = z.object({
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
  subscription: z.object({
    endpoint: z.string().trim().min(1),
    keys: z.record(z.string(), z.string()),
  }),
});

const pushUnsubscribePayloadSchema = z.object({
  userAddress: z.string().trim().regex(ADDRESS_PATTERN),
  endpoint: z.string().trim().min(1),
});

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: z.infer<typeof pushSubscriptionPayloadSchema>;
    try {
      const rawBody = await request.json();
      const parsed = pushSubscriptionPayloadSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { userAddress, subscription } = body;
    const normalizedUserAddress = normalizeAddress(userAddress);

    if (!isAddressLike(normalizedUserAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 });
    }

    // Verify user is subscribing for themselves
    if (authAddress !== normalizedUserAddress) {
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
      [normalizedUserAddress, subscription.endpoint, JSON.stringify(subscription.keys)]
    );

    return NextResponse.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    logger.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: z.infer<typeof pushUnsubscribePayloadSchema>;
    try {
      const rawBody = await request.json();
      const parsed = pushUnsubscribePayloadSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { userAddress, endpoint } = body;
    const normalizedUserAddress = normalizeAddress(userAddress);

    if (!isAddressLike(normalizedUserAddress)) {
      return NextResponse.json({ error: 'Invalid user address' }, { status: 400 });
    }

    // Verify user is unsubscribing for themselves
    if (authAddress !== normalizedUserAddress) {
      return NextResponse.json(
        { error: 'You can only unsubscribe from your own account' },
        { status: 403 }
      );
    }

    await query(
      `DELETE FROM push_subscriptions ps
       USING users u
       WHERE ps.user_id = u.id AND u.wallet_address = $1 AND ps.endpoint = $2`,
      [normalizedUserAddress, endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
