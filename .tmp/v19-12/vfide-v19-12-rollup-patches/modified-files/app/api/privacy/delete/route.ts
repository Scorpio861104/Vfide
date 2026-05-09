import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod4';
// v19.8 COMP-3 FIX: privacy/delete is a high-stakes privileged action
// (irreversible, regulator-relevant); always audit-log it. Failure to
// write the audit event must not block the request — the deletion
// request itself is more important than the log entry.
import { writeAuditEvent } from '@/lib/audit/auditLog';

const privacyDeleteSchema = z.object({
  email: z.string().trim().email().max(320).optional(),
  reason: z.string().trim().max(2000).optional(),
});

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const walletAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
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

    // v19.8 COMP-3 FIX: audit-log the privacy deletion request. We
    // do this AFTER the DB insert so a successful audit entry only
    // exists when the request is actually queued. The audit write
    // failure is non-blocking (logged via writeAuditEvent's internal
    // catch).
    void writeAuditEvent({
      actorIdentity: walletAddress,
      actorIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? undefined,
      actorUserAgent: request.headers.get('user-agent') ?? undefined,
      eventType: 'privacy.deletion.requested',
      targetIdentity: walletAddress, // self-service
      details: {
        email_provided: Boolean(email),
        reason_provided: Boolean(reason),
      },
      outcome: 'success',
    });

    return NextResponse.json({
      ok: true,
      message: 'Deletion request submitted. We will process it according to the privacy policy and legal retention requirements.',
    });
  } catch (error) {
    logger.error('[Privacy Deletion Request] Failed to submit request', error);
    return NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 });
  }
});
