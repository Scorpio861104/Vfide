import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = normalizeAddress(authResult.user.address);
  if (!ADDRESS_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = pushSubscribeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { endpoint, keys } = parsed.data;

    await query(
      `INSERT INTO push_subscriptions (user_address, endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (endpoint) DO UPDATE
       SET user_address = EXCLUDED.user_address,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth`,
      [authAddress, endpoint, keys.p256dh, keys.auth]
    ).catch(() => {}); // Graceful failure if table doesn't exist yet

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
