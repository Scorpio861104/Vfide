/**
 * GET /api/merchant/[address]/transparency — PUBLIC customer-facing merchant trust panel (Wave 76).
 *
 * Answers the grandmother questions a customer asks before buying: who is this merchant, can I trust
 * them, will they deliver, what happens if something goes wrong. Composes the same trust/delivery/dispute/
 * continuity signals the merchant's own HQ uses, via `buildTransparencyPanel`. PUBLIC (no auth) and
 * read-only — anyone browsing the marketplace can see it. Honest about thin data ("new", "unproven").
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { buildTransparencyPanel, type TransparencyInputs } from '@/lib/seer/merchantTransparency';
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';

export const dynamic = 'force-dynamic';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest, ctx: { params: Promise<{ address: string }> }): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const { address } = await ctx.params;
  const addr = (address ?? '').trim().toLowerCase();
  if (!ADDRESS_PATTERN.test(addr)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 });

  try {
    const [profile, delivery, trust, continuity] = await Promise.all([
      readProfile(addr),
      readDelivery(addr),
      readTrust(addr),
      readContinuity(addr),
    ]);

    const inputs: TransparencyInputs = {
      displayName: profile.displayName,
      verified: profile.verified,
      ageDays: profile.ageDays,
      merchantTrust: trust.score ?? 50,
      deliveryReliability: delivery.score,
      deliveryReliabilityLabel: delivery.reliability,
      disputesTotal: trust.disputesTotal,
      disputesUpheld: trust.disputesUpheld,
      continuityReady: continuity.continuityReady,
      recoveryReady: continuity.recoveryReady,
    };

    return NextResponse.json(buildTransparencyPanel(inputs));
  } catch (err) {
    logger.error('GET /api/merchant/[address]/transparency failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load merchant transparency' }, { status: 500 });
  }
}

async function readProfile(addr: string): Promise<{ displayName: string; verified: boolean; ageDays: number }> {
  try {
    const row = (await query<{ display_name: string | null; verified_at: string | null; created_at: string | null }>(
      `SELECT display_name, verified_at, created_at FROM merchant_profiles WHERE merchant_address = $1`, [addr],
    )).rows[0];
    const ageDays = row?.created_at ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000)) : 0;
    return { displayName: row?.display_name || 'Merchant', verified: !!row?.verified_at, ageDays };
  } catch { return { displayName: 'Merchant', verified: false, ageDays: 0 }; }
}

async function readDelivery(addr: string): Promise<{ score: number | null; reliability: string }> {
  try {
    const rows = (await query<{ status: string; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM shipments WHERE merchant_address = $1 GROUP BY status`, [addr],
    )).rows;
    const stats: DeliveryStats = { shipped: 0, deliveredConfirmed: 0, deliveredUnconfirmed: 0, notReceived: 0, returned: 0 };
    for (const r of rows) {
      const n = Number(r.n);
      if (r.status === 'shipped') stats.shipped = n;
      else if (r.status === 'delivered_confirmed') stats.deliveredConfirmed = n;
      else if (r.status === 'delivered_unconfirmed') stats.deliveredUnconfirmed = n;
      else if (r.status === 'not_received') stats.notReceived = n;
      else if (r.status === 'returned') stats.returned = n;
    }
    const r = computeDeliveryReliability(stats);
    return { score: r.score, reliability: r.reliability };
  } catch { return { score: null, reliability: 'unproven' }; }
}

async function readTrust(addr: string): Promise<{ score: number | null; disputesTotal: number; disputesUpheld: number }> {
  try {
    const row = (await query<{ total: string; upheld: string; refunded: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld,
              COUNT(*) FILTER (WHERE status = 'refunded')::text AS refunded
         FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    const upheld = Number(row?.upheld ?? 0);
    const total = Number(row?.total ?? 0);
    const [verified, payments] = await Promise.all([readVerifiedTrust(addr), readConfirmedPaymentsTrust(addr)]);
    // Canonical trust engine (Wave 79) — same value the merchant sees in HQ and discovery ranks on.
    const t = computeMerchantTrust({
      verified, disputesUpheld: upheld, refundsGranted: Number(row?.refunded ?? 0),
      disputesTotal: total, confirmedPayments: payments,
    });
    return { score: t.score, disputesTotal: total, disputesUpheld: upheld };
  } catch { return { score: null, disputesTotal: 0, disputesUpheld: 0 }; }
}

async function readVerifiedTrust(addr: string): Promise<boolean> {
  try {
    const r = (await query<{ verified_at: string | null }>(`SELECT verified_at FROM merchant_profiles WHERE merchant_address = $1`, [addr])).rows[0];
    return !!r?.verified_at;
  } catch { return false; }
}

async function readConfirmedPaymentsTrust(addr: string): Promise<number> {
  try {
    const r = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1`, [addr])).rows[0];
    return Number(r?.c ?? 0);
  } catch { return 0; }
}

async function readContinuity(addr: string): Promise<{ continuityReady: boolean; recoveryReady: boolean }> {
  try {
    const succ = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_succession WHERE merchant_address = $1`, [addr])).rows[0];
    const ops = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_operators WHERE merchant_address = $1`, [addr])).rows[0];
    const hasSuccessor = Number(succ?.c ?? 0) > 0;
    return { continuityReady: hasSuccessor && Number(ops?.c ?? 0) > 0, recoveryReady: hasSuccessor };
  } catch { return { continuityReady: false, recoveryReady: false }; }
}
