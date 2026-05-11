/**
 * Public Payment Link Resolver
 *
 * GET /api/pay/link/[id] — Resolve a payment link by its public link_id.
 *
 * This route is UNAUTHENTICATED on purpose: a buyer following a shared link
 * needs to see what they're paying for before signing in or connecting a
 * wallet. The merchant_payment_links table has a public-read RLS policy
 * scoped to status='active', so paused/archived/expired links are not
 * visible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const LINK_ID_REGEX = /^[a-f0-9]{16}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const { id } = await context.params;
  if (!id || !LINK_ID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid link id' }, { status: 400 });
  }

  try {
    // Read-public policy allows this without auth. The query itself is
    // already filtered to active links by the policy; the additional
    // status check is defense-in-depth.
    const result = await query(
      `SELECT link_id, merchant_address, title, description, token,
              amount, min_amount, max_amount, currency_display,
              collect_email, collect_shipping, single_use, max_uses, uses,
              expires_at, status
         FROM merchant_payment_links
        WHERE link_id = $1 AND status = 'active'`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment link not found or no longer active' }, { status: 404 });
    }

    const link = result.rows[0];

    // Expiry check
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Payment link has expired' }, { status: 410 });
    }

    // Usage limit check
    const usesCap = link.single_use ? 1 : (link.max_uses ?? null);
    if (usesCap !== null && Number(link.uses) >= Number(usesCap)) {
      return NextResponse.json({ error: 'Payment link has reached its usage limit' }, { status: 410 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    logger.error('[Pay Link Resolver] Error:', error);
    return NextResponse.json({ error: 'Failed to resolve payment link' }, { status: 500 });
  }
}
