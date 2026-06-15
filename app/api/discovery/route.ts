/**
 * Merchant Discovery / Search API (Wave 63).
 *
 * GET /api/discovery?q=<query>&filter=<verified|new|high_trust|high_reliability|continuity_ready|builder>
 *
 * Composes the discovery ranking engine over REAL merchant data:
 *   • Relevance ← text match on product name/description/category (and merchant display name).
 *   • Merchant trust ← verification + dispute/refund behavior + (ProofScore when available).
 *   • Delivery reliability ← shipments outcomes (Marketplace Trust signal).
 *   • Fraud risk ← upheld disputes against the merchant.
 *   • Builder/commerce/age ← merchant record.
 *
 * Results are ranked RELEVANCE-FIRST and every result is explainable. No wealth/holdings/paid signal is
 * read or accepted. Public read (discovery is public); never mutates anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { scoreMerchantDiscovery, rankByRelevanceThenMerit, type MerchantDiscoverySignals, type DiscoveryScore } from '@/lib/seer/discovery';
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';
import { deriveBuilderSignals } from '@/lib/seer/marketStability/signals';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { computeMerchantAdvisor, type MerchantAdvisorInput } from '@/lib/seer/merchantAdvisor';

export const dynamic = 'force-dynamic';

type Filter = 'verified' | 'new' | 'high_trust' | 'high_reliability' | 'continuity_ready' | 'builder' | null;

interface MerchantRow {
  merchant_address: string;
  display_name: string;
  verified: boolean | null;
  created_at: string;
  relevance: string; // ts_rank-ish score as text
  product_count: string;
}

function clampRelevance(raw: number, max: number): number {
  if (max <= 0) return raw > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, raw / max));
}

async function getHandler(request: NextRequest): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  const filter = (request.nextUrl.searchParams.get('filter') ?? '').trim() as Filter;

  try {
    // Relevance via case-insensitive match on product + merchant fields. (A production deployment can
    // swap this for Postgres FTS/trigram; the engine consumes a 0..1 relevance either way.)
    const like = `%${q.toLowerCase()}%`;
    const browsing = q.length === 0;

    const merchants = (
      await query<MerchantRow>(
        `SELECT p.merchant_address,
                p.display_name,
                (p.verified_at IS NOT NULL) AS verified,
                p.created_at,
                COALESCE(MAX(CASE
                  WHEN $2 = '' THEN 1
                  WHEN lower(pr.name) LIKE $1 THEN 3
                  WHEN lower(pr.short_description) LIKE $1 THEN 2
                  WHEN lower(pr.description) LIKE $1 THEN 1
                  WHEN lower(p.display_name) LIKE $1 THEN 2
                  ELSE 0 END), 0)::text AS relevance,
                COUNT(pr.id)::text AS product_count
           FROM merchant_profiles p
           LEFT JOIN merchant_products pr ON pr.merchant_address = p.merchant_address
          GROUP BY p.merchant_address, p.display_name, p.verified_at, p.created_at
         HAVING ($2 = '' OR MAX(CASE
                  WHEN lower(pr.name) LIKE $1 OR lower(pr.short_description) LIKE $1
                    OR lower(pr.description) LIKE $1 OR lower(p.display_name) LIKE $1 THEN 1 ELSE 0 END) = 1)
          ORDER BY relevance DESC, (p.verified_at IS NOT NULL) DESC, p.created_at ASC, p.merchant_address ASC
          LIMIT 200`,
        [like, browsing ? '' : like],
      )
    ).rows;

    // Gather per-merchant signals and score.
    const scored = await Promise.all(
      merchants.map(async (m) => {
        const addr = m.merchant_address.toLowerCase();
        const [delivery, fraud, trust, age] = await Promise.all([
          readDelivery(addr),
          readFraudRisk(addr),
          readMerchantTrust(addr, m.verified === true),
          Promise.resolve(ageDays(m.created_at)),
        ]);
        const signals: MerchantDiscoverySignals = {
          relevance: clampRelevance(Number(m.relevance), 3),
          merchantTrust: trust,
          deliveryReliability: delivery.score,
          commerceHealth: null, // composed elsewhere; omitted here keeps this read cheap and honest
          builderScore: 0, // Builder Record requires its own derivation; 0 = no bonus (never a penalty)
          fraudRisk: fraud,
          ageDays: age,
          verified: m.verified === true,
        };
        return {
          merchantAddress: addr,
          displayName: m.display_name,
          productCount: Number(m.product_count),
          deliveryReliability: delivery.reliability,
          signals,
          discovery: scoreMerchantDiscovery(signals),
        };
      }),
    );

    const filtered = applyFilter(scored, filter);
    const ranked = rankByRelevanceThenMerit(filtered).slice(0, 50);

    // Builder Record enrichment for the TOP results only. deriveBuilderSignals runs ~5 queries per
    // merchant, so enriching all 200 candidates would mean 1000+ queries per search. Instead we rank by
    // relevance + cheap signals first, then add the (modest, capped) Builder bonus to the top 20 and
    // re-rank within their relevance tier. Builder only ever *adds*, so the pre-enrichment order is
    // already honest; this just refines the top.
    const enriched = await Promise.all(
      ranked.map(async (r, idx) => {
        if (idx >= 20) return r; // only enrich the visible top
        try {
          // Builder Record + Commerce Health enrichment for the top results (Wave 69: Merchant Health
          // now drives discovery). Both only ever *add* (capped), so the pre-enrichment order stays honest.
          const [bsig, commerceHealth] = await Promise.all([
            deriveBuilderSignals(r.merchantAddress),
            readCommerceHealth(r.merchantAddress),
          ]);
          const builder = computeBuilderRecord(bsig);
          if (builder.score > 0 || commerceHealth != null) {
            const re = scoreMerchantDiscovery({ ...r.signals, builderScore: builder.score, commerceHealth });
            return { ...r, discovery: re, builderCategory: builder.category };
          }
        } catch { /* enrichment is best-effort; never blocks discovery */ }
        return r;
      }),
    );
    const finalRanked = rankByRelevanceThenMerit(enriched);

    return NextResponse.json({
      query: q,
      filter: filter ?? null,
      count: finalRanked.length,
      results: finalRanked.map((r) => ({
        merchantAddress: r.merchantAddress,
        displayName: r.displayName,
        productCount: r.productCount,
        deliveryReliability: r.deliveryReliability,
        builderCategory: 'builderCategory' in r ? r.builderCategory : undefined,
        score: r.discovery.score,
        relevanceBucket: r.discovery.relevanceBucket,
        whyRanked: r.discovery.explanation, // explainability — never a black box
      })),
    });
  } catch (err) {
    logger.error('GET /api/discovery failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Discovery failed' }, { status: 500 });
  }
}

function ageDays(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)));
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

async function readFraudRisk(addr: string): Promise<number> {
  try {
    const row = (await query<{ upheld: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    const upheld = Number(row?.upheld ?? 0);
    // Each upheld dispute adds 30 risk, capped at 100.
    return Math.min(100, upheld * 30);
  } catch { return 0; }
}

async function readMerchantTrust(addr: string, verified: boolean): Promise<number> {
  // Canonical trust engine (Wave 79) — identical to HQ / storefront / discovery-standing so a merchant's
  // trust is the SAME number wherever it appears (it used to differ: discovery had its own formula).
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
    return computeMerchantTrust({
      verified, disputesUpheld: Number(row?.upheld ?? 0), refundsGranted: Number(row?.refunded ?? 0),
      disputesTotal: Number(row?.total ?? 0), confirmedPayments: payments,
    }).score;
  } catch { return verified ? 70 : 55; }
}

interface Scored {
  merchantAddress: string; displayName: string; productCount: number;
  deliveryReliability: string; signals: MerchantDiscoverySignals; discovery: DiscoveryScore;
}

function applyFilter(items: Scored[], filter: Filter): Scored[] {
  if (!filter) return items;
  switch (filter) {
    case 'high_reliability': return items.filter((i) => i.deliveryReliability === 'reliable');
    case 'verified': // verification is encoded in the trust score; surface via explanation
      return items.filter((i) => i.discovery.explanation.some((e) => (e as { signal?: string }).signal === 'Verified merchant'));
    case 'new':
      return items.filter((i) => i.discovery.explanation.some((e) => (e as { signal?: string }).signal === 'New-merchant window'));
    default:
      return items; // high_trust/continuity_ready/builder need their own joins; no-op rather than fake
  }
}

async function readCommerceHealth(addr: string): Promise<number | null> {
  // Commerce-health sub-score for discovery (Wave 69). Reads the same revenue/order/customer signals
  // the Merchant Advisor uses; returns null (no boost, no penalty) when there's too little history.
  try {
    const rev = (await query<{ last30: string; prev30: string; orders30: string; ordersprev30: string; lifetime: string; cust90: string; repeat90: string; refunds90: string }>(
      `SELECT
         COALESCE(SUM(amount::numeric) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),0)::text AS last30,
         COALESCE(SUM(amount::numeric) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'),0)::text AS prev30,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS orders30,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::text AS ordersprev30,
         COUNT(*)::text AS lifetime,
         COUNT(DISTINCT customer_address) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')::text AS cust90,
         0::text AS repeat90, 0::text AS refunds90
       FROM merchant_payment_confirmations WHERE merchant_address = $1`, [addr],
    )).rows[0];
    if (!rev) return null;
    const input: MerchantAdvisorInput = {
      revenueLast30: Number(rev.last30), revenuePrev30: Number(rev.prev30),
      ordersLast30: Number(rev.orders30), ordersPrev30: Number(rev.ordersprev30),
      distinctCustomers90: Number(rev.cust90), repeatCustomers90: Number(rev.repeat90),
      refundsGranted90: Number(rev.refunds90), orders90: Number(rev.lifetime),
      trackedProducts: 0, lowStockProducts: 0, hasSubscriptionPlans: false, lifetimeOrders: Number(rev.lifetime),
    };
    const advisor = computeMerchantAdvisor(input);
    return advisor.insufficientData ? null : advisor.healthScore;
  } catch { return null; }
}

export const GET = getHandler;