/**
 * GET /api/merchant/discovery-standing (Wave 76 Priority 2) — a merchant's OWN discovery explainability.
 *
 * Before this, the discovery engine returned `whyRanked` only inside search results, so a merchant could
 * not see why THEY rank or how to improve without searching for themselves. This computes the merchant's
 * own discovery signals (merit only — relevance is held at 1.0 since this isn't a query) and returns the
 * itemized contribution breakdown + concrete improvement tips. Authenticated, read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { scoreMerchantDiscovery, type MerchantDiscoverySignals } from '@/lib/seer/discovery';
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { deriveBuilderSignals } from '@/lib/seer/marketStability/signals';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';

export const dynamic = 'force-dynamic';

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [profile, delivery, fraud, builderSignals] = await Promise.all([
      readProfile(addr), readDelivery(addr), readFraudRisk(addr), deriveBuilderSignals(addr),
    ]);
    const trust = await readMerchantTrust(addr, profile.verified); // canonical engine needs verification
    const builder = computeBuilderRecord(builderSignals);

    const signals: MerchantDiscoverySignals = {
      relevance: 1, // merit-only view (not a search); relevance is the searcher's query, held at 1 here
      merchantTrust: trust,
      deliveryReliability: delivery.score,
      commerceHealth: null, // computed in full search enrichment; omitted here keeps this read cheap
      builderScore: builder.score,
      fraudRisk: fraud,
      ageDays: profile.ageDays,
      verified: profile.verified,
    };
    const scored = scoreMerchantDiscovery(signals);

    // Improvement tips derived from the weakest contributing signals.
    const tips: string[] = [];
    if (!profile.verified) tips.push('Get verified (complete your profile + 3 confirmed payments) to add a visibility boost.');
    if (delivery.reliability === 'unproven') tips.push('Confirm deliveries with tracking — proven delivery reliability raises your rank.');
    else if (delivery.reliability === 'concerning') tips.push('Resolve delivery issues; not-received reports lower your visibility.');
    if (trust < 70) tips.push('Resolve open disputes — operational trust is the largest ranking factor.');
    if (builder.score < 2000) tips.push('Grow your Builder Record (governance, recovery, continuity) for a discovery bonus.');
    if (tips.length === 0) tips.push('Your discovery standing is strong — keep delivering reliably.');

    return NextResponse.json({
      score: scored.score,
      relevanceBucket: scored.relevanceBucket,
      whyRanked: scored.explanation, // the same itemized breakdown search uses — now visible to the merchant
      tips,
      note: 'Discovery is ranked by relevance first, then trust, delivery, commerce health, Builder Record, and fairness signals. It never uses wealth, token holdings, popularity, or paid placement.',
    });
  } catch (err) {
    logger.error('GET /api/merchant/discovery-standing failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load discovery standing' }, { status: 500 });
  }
}

async function readProfile(addr: string): Promise<{ verified: boolean; ageDays: number }> {
  try {
    const row = (await query<{ verified_at: string | null; created_at: string | null }>(
      `SELECT verified_at, created_at FROM merchant_profiles WHERE merchant_address = $1`, [addr],
    )).rows[0];
    const ageDays = row?.created_at ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000)) : 0;
    return { verified: !!row?.verified_at, ageDays };
  } catch { return { verified: false, ageDays: 0 }; }
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

async function readMerchantTrust(addr: string, verified: boolean): Promise<number> {
  try {
    const row = (await query<{ upheld: string; refunded: string; total: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld,
              COUNT(*) FILTER (WHERE status = 'refunded')::text AS refunded,
              COUNT(*)::text AS total
         FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    const payments = Number((await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1`, [addr],
    )).rows[0]?.c ?? 0);
    // Canonical trust engine (Wave 79) — same value as HQ/storefront; verification now factored everywhere.
    return computeMerchantTrust({
      verified, disputesUpheld: Number(row?.upheld ?? 0), refundsGranted: Number(row?.refunded ?? 0),
      disputesTotal: Number(row?.total ?? 0), confirmedPayments: payments,
    }).score;
  } catch { return verified ? 70 : 55; }
}

async function readFraudRisk(addr: string): Promise<number> {
  try {
    const row = (await query<{ upheld: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    return Math.min(100, Number(row?.upheld ?? 0) * 25);
  } catch { return 0; }
}

export const GET = withAuth(getHandler);
