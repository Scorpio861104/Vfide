import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import type { JWTPayload } from '@/lib/auth/jwt';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

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

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authAddress = typeof user?.address === 'string'
    ? normalizeAddress(user.address)
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
    } catch (error) {
      logger.debug('[Push Subscribe] Invalid JSON body', error);
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
});

export const DELETE = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authAddress = typeof user?.address === 'string'
    ? normalizeAddress(user.address)
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
    } catch (error) {
      logger.debug('[Push Unsubscribe] Invalid JSON body', error);
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
      // F-BE-030 FIX: The codebase has TWO push subscription endpoints that
      // write to the push_subscriptions table on different columns:
      //   - /api/push/subscribe writes user_address only (user_id null)
      //   - /api/notifications/push (POST above) writes user_id via users JOIN
      // The original DELETE matched only via the user_id JOIN, which left
      // every subscription created by /api/push/subscribe orphaned —
      // unsubscribing did nothing for those rows, breaking GDPR delete and
      // accumulating dead endpoints in the table. Match by EITHER column so
      // both producers' rows can be removed by either endpoint owner. Using
      // a subquery (rather than `USING users u`) so rows lacking a users
      // table entry are still deleted via the user_address branch.
      `DELETE FROM push_subscriptions
       WHERE endpoint = $2
         AND (
           user_address = $1
           OR user_id IN (SELECT id FROM users WHERE wallet_address = $1)
         )`,
      [normalizedUserAddress, endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
});
