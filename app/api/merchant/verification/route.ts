/**
 * Merchant Verification API (Wave 49-B).
 *
 * Real, criteria-based verification — no gatekeeper, fits VFIDE's permissionless ethos. A merchant
 * is "verified" when transparent, objective criteria proving a real, active business are met:
 *   1. Profile complete: display_name + description + logo_url all present.
 *   2. At least MIN_CONFIRMED_PAYMENTS confirmed on-chain payments received.
 *
 * GET  — returns current status + per-criterion progress (so the UI can show exactly what's left —
 *        grandmother-friendly: "2 more payments and you're verified").
 * POST — re-evaluates. If criteria are now met and the merchant isn't already verified, sets
 *        verified_at and emits MERCHANT_VERIFIED (server-side, so it's trustworthy). Idempotent.
 *
 * This is the real action that makes the MERCHANT_VERIFIED event fire on something true, replacing
 * the old "verified == registered" conflation in the Trust surface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';

export const dynamic = 'force-dynamic';

const MIN_CONFIRMED_PAYMENTS = 3;

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return address ? address : null;
}

interface Criterion {
  id: string;
  label: string;
  met: boolean;
  /** Human progress line, e.g. "1 of 3 payments". */
  detail: string;
}

interface VerificationState {
  verified: boolean;
  verified_at: string | null;
  criteria: Criterion[];
  /** True only on the call where verification was newly granted. */
  newly_verified?: boolean;
}

/** Evaluate the two criteria for a merchant from real DB state. */
async function evaluate(merchant: string): Promise<{ profileComplete: boolean; paymentCount: number; verifiedAt: string | null }> {
  const profileRes = await query<{ display_name: string | null; description: string | null; logo_url: string | null; verified_at: string | null }>(
    `SELECT display_name, description, logo_url, verified_at
       FROM merchant_profiles
      WHERE merchant_address = $1`,
    [merchant],
  );
  const profile = profileRes.rows[0];
  const profileComplete = !!(profile && profile.display_name && profile.description && profile.logo_url);

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM merchant_payment_confirmations WHERE merchant_address = $1`,
    [merchant],
  );
  const paymentCount = Number(countRes.rows[0]?.count ?? 0);

  return { profileComplete, paymentCount, verifiedAt: profile?.verified_at ?? null };
}

function buildCriteria(profileComplete: boolean, paymentCount: number): Criterion[] {
  return [
    {
      id: 'profile_complete',
      label: 'Complete your business profile',
      met: profileComplete,
      detail: profileComplete ? 'Name, description, and logo added' : 'Add a name, description, and logo',
    },
    {
      id: 'real_payments',
      label: 'Receive real payments',
      met: paymentCount >= MIN_CONFIRMED_PAYMENTS,
      detail: `${Math.min(paymentCount, MIN_CONFIRMED_PAYMENTS)} of ${MIN_CONFIRMED_PAYMENTS} payments received`,
    },
  ];
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { profileComplete, paymentCount, verifiedAt } = await evaluate(merchant);
    const criteria = buildCriteria(profileComplete, paymentCount);
    const state: VerificationState = { verified: verifiedAt !== null, verified_at: verifiedAt, criteria };
    return NextResponse.json(state);
  } catch (err) {
    logger.error('GET /api/merchant/verification failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load verification status' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { profileComplete, paymentCount, verifiedAt } = await evaluate(merchant);
    const criteria = buildCriteria(profileComplete, paymentCount);
    const allMet = criteria.every((c) => c.met);

    // Already verified — idempotent no-op.
    if (verifiedAt !== null) {
      return NextResponse.json({ verified: true, verified_at: verifiedAt, criteria } satisfies VerificationState);
    }

    // Criteria not yet met — return progress, no grant.
    if (!allMet) {
      return NextResponse.json({ verified: false, verified_at: null, criteria } satisfies VerificationState);
    }

    // Newly meets all criteria — grant verification once, then emit the real event.
    const updateRes = await query<{ verified_at: string }>(
      `UPDATE merchant_profiles
          SET verified_at = NOW()
        WHERE merchant_address = $1 AND verified_at IS NULL
        RETURNING verified_at`,
      [merchant],
    );
    const grantedAt = updateRes.rows[0]?.verified_at ?? new Date().toISOString();

    // Only emit if THIS call performed the grant (RETURNING is empty if a concurrent call won).
    if (updateRes.rows.length > 0) {
      await emitServerEvent(merchant, 'MERCHANT_VERIFIED', { payment_count: paymentCount }, 'api/merchant/verification');
    }

    return NextResponse.json({
      verified: true,
      verified_at: grantedAt,
      criteria,
      newly_verified: updateRes.rows.length > 0,
    } satisfies VerificationState);
  } catch (err) {
    logger.error('POST /api/merchant/verification failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
