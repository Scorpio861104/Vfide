import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * H-32 FIX: Restrict push endpoint URLs to known browser push service hostnames.
 * This prevents SSRF via attacker-controlled endpoint URLs being stored and later fetched.
 */
const ALLOWED_PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'updates-autopush.stage.mozaws.net', // Firefox staging
  'notify.windows.com',                // Windows push
  'api.push.apple.com',
]);

function isAllowedPushEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_PUSH_HOSTS.has(host)) return true;
    // Allow subdomains of known push services
    for (const allowed of ALLOWED_PUSH_HOSTS) {
      if (host.endsWith('.' + allowed)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

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

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '28p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('password authentication failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authAddress = normalizeAddress(user.address);
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

    if (!isAllowedPushEndpoint(endpoint)) {
      return NextResponse.json({ error: 'Invalid push endpoint' }, { status: 400 });
    }
    try {
      await query(
        `INSERT INTO push_subscriptions (user_address, endpoint, p256dh, auth, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (endpoint) DO UPDATE
         SET user_address = EXCLUDED.user_address,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth`,
        [authAddress, endpoint, keys.p256dh, keys.auth]
      );
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        logger.warn('[Push Subscribe] Database unavailable during subscription persistence', error);
        return NextResponse.json({ error: 'Push subscriptions are temporarily unavailable' }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Push Subscribe] Error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
});
