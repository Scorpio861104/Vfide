import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const privacyDeleteSchema = z.object({
  email: z.string().trim().email().max(320).optional(),
  reason: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const walletAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof privacyDeleteSchema> = {};
  try {
    const rawBody = await request.json();
    const parsed = privacyDeleteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    // Allow empty body; reason/email are optional.
    logger.debug('[Privacy Deletion Request] Empty or invalid JSON body treated as optional', error);
  }

  const email = body.email ?? null;
  const reason = body.reason ?? null;

  try {
    await query(
      `INSERT INTO privacy_deletion_requests (wallet_address, email, reason, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (wallet_address, status)
       DO UPDATE SET email = EXCLUDED.email, reason = EXCLUDED.reason, created_at = NOW()`,
      [walletAddress, email, reason]
    );

    return NextResponse.json({
      ok: true,
      message: 'Deletion request submitted. We will process it according to the privacy policy and legal retention requirements.',
    });
  } catch (error) {
    logger.error('[Privacy Deletion Request] Failed to submit request', error);
    return NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 });
  }
}
