/**
 * Merchant Discovery / Search API (Wave 63).
 *
 * GET /api/discovery?q=<query>&filter=<verified|new|high_trust|high_reliability|continuity_ready|builder>
 *
 * Composes the discovery ranking engine over real merchant data. Public read, never mutates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { scoreMerchantDiscovery, rankByRelevanceThenMerit, type MerchantDiscoverySignals, type DiscoveryScore } from '@/lib/seer/discovery';
import { deriveBuilderSignals } from '@/lib/seer/marketStability/signals';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';

export const dynamic = 'force-dynamic';

type Filter = 'verified' | 'new' | 'high_trust' | 'high_reliability' | 'continuity_ready' | 'builder' | null;

interface MerchantRow {
  merchant_address: string;
  display_name: string;
  verified: boolean | null;
  created_at: string;
  relevance: string;
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
    const like = `%${q.toLowerCase()}%`; // swap to FTS/trigram in production; engine is indifferent.
    const browsing = q.length === 0;

    const merchants = (
      await query<MerchantRow>(
        `SELECT p.merchant_address,
                p.display_name,
                p.verified,
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
          GROUP BY p.merchant_address, p.display_name, p.verified, p.created_at
         HAVING ($2 = '' OR MAX(CASE
                  WHEN lower(pr.name) LIKE $1 OR lower(pr.short_description) LIKE $1
                    OR lower(pr.description) LIKE $1 OR lower(p.display_name) LIKE $1 THEN 1 ELSE 0 END) = 1)
          LIMIT 200`,
        [like, browsing ? '' : like],
      )
    ).rows;

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
          commerceHealth: null,
          builderScore: 0,
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
    // re-rank within their relevance tier. Builder only ever adds, so the pre-enrichment order is
    // already honest; this just refines the top.
    const enriched = await Promise.all(
      ranked.map(async (r, idx) => {
        if (idx >= 20) return r;
        try {
          const builderSignals = await deriveBuilderSignals(r.merchantAddress);
          const builder = computeBuilderRecord(builderSignals);
          if (builder.score > 0) {
            const rescored = scoreMerchantDiscovery({ ...r.signals, builderScore: builder.score });
            return { ...r, discovery: rescored, builderCategory: builder.category };
          }
        } catch {
          // Enrichment is best-effort; discovery should never fail because a signal read fails.
        }
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
        whyRanked: r.discovery.explanation,
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
  } catch {
    return { score: null, reliability: 'unproven' };
  }
}

async function readFraudRisk(addr: string): Promise<number> {
  try {
    const row = (await query<{ upheld: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    const upheld = Number(row?.upheld ?? 0);
    return Math.min(100, upheld * 30);
  } catch {
    return 0;
  }
}

async function readMerchantTrust(addr: string, verified: boolean): Promise<number> {
  try {
    const row = (await query<{ upheld: string; refunded: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'upheld')::text AS upheld,
              COUNT(*) FILTER (WHERE status = 'refunded')::text AS refunded
         FROM disputes WHERE respondent_address = $1`, [addr],
    )).rows[0];
    let t = 50 + (verified ? 15 : 0) - Number(row?.upheld ?? 0) * 20 - Number(row?.refunded ?? 0) * 5;
    return Math.max(0, Math.min(100, t));
  } catch {
    return verified ? 65 : 50;
  }
}

interface Scored {
  merchantAddress: string;
  displayName: string;
  productCount: number;
  deliveryReliability: string;
  signals: MerchantDiscoverySignals;
  discovery: DiscoveryScore;
}

function applyFilter(items: Scored[], filter: Filter): Scored[] {
  if (!filter) return items;
  switch (filter) {
    case 'high_reliability':
      return items.filter((i) => i.deliveryReliability === 'reliable');
    case 'verified':
      return items.filter((i) => i.discovery.explanation.some((e) => e.signal === 'Verified merchant'));
    case 'new':
      return items.filter((i) => i.discovery.explanation.some((e) => e.signal === 'New-merchant window'));
    default:
      return items;
  }
}

export const GET = getHandler;
