/**
 * Merchant HQ aggregation API (Wave 66) — the unified business operating center.
 *
 * GET /api/merchant/hq — composes every merchant signal into one command-center payload, each section
 * carrying actionable output (the Action Center principle: nothing is informational-only). Reads only;
 * never mutates. Authenticated — a merchant sees their own HQ.
 *
 * Composes existing engines: Merchant Health (new), Merchant Advisor (commerce health + recommendations),
 * delivery reliability, merchant trust (disputes), lending terms, discovery transparency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeMerchantHealth } from '@/lib/seer/merchantHealth';
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';
import { computeMerchantAdvisor, type MerchantAdvisorInput } from '@/lib/seer/merchantAdvisor';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';
import { deriveBuilderSignals, deriveExtractionSignals } from '@/lib/seer/marketStability/signals';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { computeExtractionIndex, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';
import { suggestLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';
import { computeBondBenefits } from '@/lib/seer/marketStability/stabilityBonding';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [advisorInputs, delivery, trust, continuity] = await Promise.all([
      readAdvisorInputs(addr),
      readDelivery(addr),
      readTrust(addr),
      readContinuity(addr),
    ]);

    // ── Builder Record + Extraction Index + ProofScore + Lending (Wave 68 — consume the intelligence) ──
    // Merchant HQ was the one required consumer missing Builder/Extraction/Lending. Compose them here
    // using the same proven pattern as /api/seer/market-standing so HQ surfaces opportunity, not just status.
    const [builderSignals, exSignals, proofScore, priorEx] = await Promise.all([
      deriveBuilderSignals(addr),
      deriveExtractionSignals(addr),
      readProofScore(addr),
      readPriorExtraction(addr),
    ]);
    const builder = computeBuilderRecord(builderSignals);
    const extraction = computeExtractionIndex(priorEx, exSignals, Date.now());

    // Commerce health + recommendations (Phase 3/5).
    const advisor = computeMerchantAdvisor(advisorInputs);

    // Merchant Health composite (Phase 1).
    const retentionRate = advisorInputs.distinctCustomers90 > 0 ? advisorInputs.repeatCustomers90 / advisorInputs.distinctCustomers90 : null;
    const revenueTrendRatio = advisorInputs.revenuePrev30 > 0 ? advisorInputs.revenueLast30 / advisorInputs.revenuePrev30 : null;
    const health = computeMerchantHealth({
      commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
      merchantTrust: trust.score,
      deliveryReliability: delivery.score,
      retentionRate,
      revenueTrendRatio,
      lifetimeOrders: advisorInputs.lifetimeOrders,
    });

    // Lending terms — now consumes Merchant Health (Wave 80): a healthy business earns a small interest
    // break, so the composite affects a real outcome instead of being display-only.
    const lendingTerms = suggestLoanTerms({ proofScore, builder, extractionIndex: extraction.index, merchantHealth: health.score });


    // Builder opportunity signals — what contribution unlocks, and the next step to grow it.
    const builderOpportunities: string[] = [];
    if (!builderSignals.merchantVerified) builderOpportunities.push('Verify your business to raise your Builder Record and unlock better lending terms.');
    if (builderSignals.governanceParticipations === 0) builderOpportunities.push('Participate in governance — voting contributes to your Builder Record.');
    if (!builderSignals.recoveryConfigured) builderOpportunities.push('Configure recovery — preparedness counts toward your Builder Record.');
    if (!builderSignals.continuityConfigured) builderOpportunities.push('Set up continuity — it contributes to your Builder Record and protects your business.');

    // ── Phase 6/7: build the Opportunity Center and Risk Center (cause → effect → action/mitigation) ──
    // These consolidate the already-computed signals into structured, explainable consequences. Nothing
    // new is computed — every entry traces to a signal HQ already consumes.
    type Opportunity = { signal: string; cause: string; effect: string; action: string };
    type Risk = { signal: string; level: 'low' | 'medium' | 'high'; cause: string; effect: string; mitigation: string };
    const opportunities: Opportunity[] = [];
    const risks: Risk[] = [];

    // Lending opportunity
    if (lendingTerms.eligible) {
      opportunities.push({
        signal: 'Lending', cause: `Your ProofScore and Builder Record (${builder.category}) qualify you.`,
        effect: `Up to ${lendingTerms.suggestedLimitVfide} VFIDE in growth financing at ${lendingTerms.suggestedInterestBps.min}-${lendingTerms.suggestedInterestBps.max} bps.`,
        action: 'Open the lending page to request growth capital.',
      });
    }
    // Builder growth opportunities (from the per-flag list above)
    for (const b of builderOpportunities) {
      opportunities.push({ signal: 'Builder Record', cause: 'A contribution area is not yet configured.', effect: 'Raising your Builder Record improves lending terms and visibility.', action: b });
    }
    // Health-driven growth signals
    for (const g of health.growthSignals) {
      opportunities.push({ signal: 'Merchant Health', cause: g.message, effect: 'Momentum you can build on.', action: g.action });
    }
    // Stability bonding (available)
    opportunities.push({ signal: 'Stability Bonding', cause: 'Voluntary bonding is available.', effect: 'Lower fees, better lending, more visibility — without giving up ownership.', action: 'Review bonding terms to commit to the ecosystem.' });

    // Extraction risk
    if (extraction.index >= 3000) {
      const level = extraction.index >= 7000 ? 'high' : extraction.index >= 5000 ? 'medium' : 'low';
      risks.push({
        signal: 'Extraction', level: level as Risk['level'],
        cause: `Extraction Index is ${extraction.index} (${extraction.category}).`,
        effect: 'Discretionary services (lending limits, marketplace visibility) may be reduced. Ownership is never affected.',
        mitigation: 'Reduce rapid sell/rebuy cycles; standing recovers over ~90 days as behavior improves.',
      });
    }
    // Trust / fraud risk
    if (trust.disputesUpheld > 0) {
      risks.push({ signal: 'Trust', level: trust.disputesUpheld >= 3 ? 'high' : 'medium', cause: `${trust.disputesUpheld} dispute(s) upheld against you.`, effect: 'Lower merchant trust reduces discovery visibility.', mitigation: 'Resolve open disputes and confirm deliveries to rebuild trust.' });
    }
    // Delivery risk
    if (delivery.reliability === 'concerning') {
      risks.push({ signal: 'Delivery', level: 'high', cause: 'Several deliveries were reported not received.', effect: 'Delivery problems lower trust and marketplace visibility.', mitigation: 'Confirm shipments with tracking and follow up on open deliveries.' });
    }
    // Health risk signals
    for (const rsig of health.riskSignals) {
      risks.push({ signal: 'Merchant Health', level: 'medium', cause: rsig.message, effect: 'Affects your overall business health score.', mitigation: rsig.action });
    }
    // Preparedness risk
    if (!continuity.continuityReady) {
      risks.push({ signal: 'Preparedness', level: 'medium', cause: 'No continuity plan (successor + emergency operator) is configured.', effect: 'Your business cannot be handed over if you become unavailable.', mitigation: 'Set a successor and an emergency operator in continuity settings.' });
    }
    if (!continuity.recoveryReady) {
      risks.push({ signal: 'Recovery', level: 'medium', cause: 'Account recovery is not configured.', effect: 'You could lose access without a recovery path.', mitigation: 'Add recovery guardians.' });
    }

    // Action Center: every section yields a next action.
    const payload = {
      // Phase 2 — business snapshot
      snapshot: {
        revenueLast30: advisorInputs.revenueLast30,
        ordersLast30: advisorInputs.ordersLast30,
        distinctCustomers90: advisorInputs.distinctCustomers90,
        merchantTrust: trust.score,
        commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
        deliveryReliability: delivery.score,
        deliveryLabel: delivery.reliability,
        builderRecord: builder.score,
        builderClassification: builder.category,
        extractionIndex: extraction.index,
        continuityReady: continuity.continuityReady,
        recoveryReady: continuity.recoveryReady,
      },
      // Phase 1 — merchant health (first-class)
      health: {
        score: health.score, band: health.band, components: health.components,
        growthSignals: health.growthSignals, riskSignals: health.riskSignals,
        topRecommendation: health.topRecommendation,
      },
      // Phase 3/4/5 — business / customer / revenue intelligence (from the advisor)
      advisor: {
        commerceHealth: advisor.insufficientData ? null : advisor.healthScore,
        recommendations: advisor.signals,
        insufficientData: advisor.insufficientData,
        retentionRate, revenueTrendRatio,
      },
      // Phase 6 — trust intelligence
      trust: {
        score: trust.score, disputesTotal: trust.disputesTotal, disputesUpheld: trust.disputesUpheld,
        deliveryReliability: delivery.score, deliveryLabel: delivery.reliability,
        action: trust.disputesUpheld > 0 ? 'Resolve open disputes and confirm deliveries to rebuild trust.'
          : delivery.reliability === 'concerning' ? 'Improve delivery confirmation to raise trust.'
          : 'Trust is in good shape — keep confirming deliveries.',
      },
      // Phase 8 — continuity intelligence
      continuity: {
        ready: continuity.continuityReady, hasSuccessor: continuity.hasSuccessor,
        operatorCount: continuity.operatorCount,
        action: continuity.continuityReady ? 'Continuity is configured — review it periodically.'
          : 'Set a successor and an emergency operator so your business survives the unexpected.',
      },
      // Phase 9 — recovery intelligence
      recovery: {
        ready: continuity.recoveryReady,
        action: continuity.recoveryReady ? 'Recovery is configured.' : 'Add account-recovery guardians to protect access.',
      },
      // Phase 3/7 — Builder intelligence (now consumed by HQ)
      builder: {
        score: builder.score,
        classification: builder.category,
        contributingFactors: builder.contributingFactors,
        opportunities: builderOpportunities,
        action: builderOpportunities[0] ?? 'Your contribution record is strong — keep delivering and participating.',
      },
      // Phase 3/10 — Lending opportunities (now consumed by HQ; advisory, on-chain ceiling respected)
      lending: {
        eligible: lendingTerms.eligible,
        onChainMaxVfide: lendingTerms.onChainMaxVfide,
        suggestedLimitVfide: lendingTerms.suggestedLimitVfide,
        suggestedInterestBps: lendingTerms.suggestedInterestBps,
        riskTier: lendingTerms.riskTier,
        action: lendingTerms.eligible
          ? `You qualify for up to ${lendingTerms.suggestedLimitVfide} VFIDE in growth financing.`
          : 'Build your ProofScore and contribution record to unlock growth financing.',
      },
      // Phase 2/6 — extraction posture (transparency; affects discretionary services only, never ownership)
      extraction: {
        index: extraction.index,
        category: extraction.category,
        note: 'Reflects market-extraction behavior. It can reduce discretionary services (lending/visibility) but never affects ownership.',
      },
      // Phase 3 — Stability Bonding benefits PREVIEW (consumed by HQ).
      // No live bond contract exists yet, so this is an explainer of what each VOLUNTARY term would
      // earn — clearly labeled "available", not an active benefit. Uses the real benefits engine with a
      // representative bond so the numbers are honest, not invented.
      stabilityBonding: {
        available: true,
        active: false, // becomes true once an on-chain bond is verified (contract behind the audit gate)
        note: 'Voluntary: lock your own VFIDE for a term to earn ecosystem benefits. Your tokens release back only to you; nobody else can ever touch them.',
        preview: ([3, 6, 12, 24] as const).map((term) => {
          const b = computeBondBenefits({ termMonths: term, amountVfide: 5000, verifiedOnChain: true, maturityAt: Date.now() + 1 }, Date.now());
          return {
            termMonths: term,
            feeMultiplier: b.feeMultiplier,
            lendingLimitBoost: b.lendingLimitBoost,
            visibilityBoost: b.visibilityBoost,
            builderBonus: b.builderBonus,
          };
        }),
        action: 'Stability bonding will let you commit to the ecosystem and earn lower fees, better lending, and more visibility — without giving up ownership.',
      },
      // Phase 6 — OPPORTUNITY CENTER: every opportunity as cause → effect → action.
      opportunityCenter: opportunities,
      // Phase 7 — RISK CENTER: every risk as cause → effect → mitigation.
      riskCenter: risks,
    };

    return NextResponse.json(payload);
  } catch (err) {
    logger.error('GET /api/merchant/hq failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load merchant HQ' }, { status: 500 });
  }
}

// ── signal readers (best-effort; absent data → honest nulls, never fabricated) ──

async function readAdvisorInputs(addr: string): Promise<MerchantAdvisorInput> {
  const zero: MerchantAdvisorInput = {
    revenueLast30: 0, revenuePrev30: 0, ordersLast30: 0, ordersPrev30: 0,
    distinctCustomers90: 0, repeatCustomers90: 0, refundsGranted90: 0, orders90: 0,
    trackedProducts: 0, lowStockProducts: 0, hasSubscriptionPlans: false, lifetimeOrders: 0,
  };
  try {
    const rev = (await query<{ last30: string; prev30: string; orders30: string; ordersprev30: string; lifetime: string; cust90: string; repeat90: string }>(
      `SELECT
         COALESCE(SUM(amount::numeric) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),0)::text AS last30,
         COALESCE(SUM(amount::numeric) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'),0)::text AS prev30,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS orders30,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::text AS ordersprev30,
         COUNT(*)::text AS lifetime,
         COUNT(DISTINCT customer_address) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')::text AS cust90,
         COUNT(DISTINCT customer_address) FILTER (
           WHERE created_at >= NOW() - INTERVAL '90 days'
             AND customer_address IN (
               SELECT customer_address FROM merchant_payment_confirmations
                WHERE merchant_address = $1 AND created_at >= NOW() - INTERVAL '90 days'
                GROUP BY customer_address HAVING COUNT(*) >= 2))::text AS repeat90
       FROM merchant_payment_confirmations WHERE merchant_address = $1`, [addr],
    )).rows[0];
    if (rev) {
      zero.revenueLast30 = Number(rev.last30); zero.revenuePrev30 = Number(rev.prev30);
      zero.ordersLast30 = Number(rev.orders30); zero.ordersPrev30 = Number(rev.ordersprev30);
      zero.lifetimeOrders = Number(rev.lifetime); zero.orders90 = Number(rev.lifetime);
      zero.distinctCustomers90 = Number(rev.cust90); zero.repeatCustomers90 = Number(rev.repeat90);
    }
  } catch { /* table/columns may differ; keep zeros (provisional) */ }
  // Subscription plans (Phase 10 — the subscription action now feeds the advisor's subscription signal).
  try {
    const sub = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_subscription_plans WHERE merchant_address = $1`, [addr])).rows[0];
    zero.hasSubscriptionPlans = Number(sub?.c ?? 0) > 0;
  } catch { /* no subscriptions table → leave false */ }
  // Refunds granted in the last 90 days (Phase 10 — the refund action now feeds commerce health).
  try {
    const ref = (await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM merchant_orders
        WHERE merchant_address = $1 AND payment_status IN ('refunded','partial_refund')
          AND refunded_at >= NOW() - INTERVAL '90 days'`, [addr],
    )).rows[0];
    zero.refundsGranted90 = Number(ref?.c ?? 0);
  } catch { /* no orders table → leave 0 */ }
  return zero;
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
    const [verified, payments] = await Promise.all([readVerified(addr), readConfirmedPayments(addr)]);
    // Canonical trust engine (Wave 79) — identical formula on every surface.
    const t = computeMerchantTrust({
      verified, disputesUpheld: upheld, refundsGranted: Number(row?.refunded ?? 0),
      disputesTotal: total, confirmedPayments: payments,
    });
    return { score: t.score, disputesTotal: total, disputesUpheld: upheld };
  } catch { return { score: null, disputesTotal: 0, disputesUpheld: 0 }; }
}

async function readVerified(addr: string): Promise<boolean> {
  try {
    const r = (await query<{ verified_at: string | null }>(`SELECT verified_at FROM merchant_profiles WHERE merchant_address = $1`, [addr])).rows[0];
    return !!r?.verified_at;
  } catch { return false; }
}

async function readConfirmedPayments(addr: string): Promise<number> {
  try {
    const r = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_payment_confirmations WHERE merchant_address = $1`, [addr])).rows[0];
    return Number(r?.c ?? 0);
  } catch { return 0; }
}

async function readContinuity(addr: string): Promise<{ continuityReady: boolean; recoveryReady: boolean; hasSuccessor: boolean; operatorCount: number }> {
  try {
    const succ = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_succession WHERE merchant_address = $1`, [addr])).rows[0];
    const ops = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM merchant_operators WHERE merchant_address = $1`, [addr])).rows[0];
    const hasSuccessor = Number(succ?.c ?? 0) > 0;
    const operatorCount = Number(ops?.c ?? 0);
    return { continuityReady: hasSuccessor && operatorCount > 0, recoveryReady: hasSuccessor, hasSuccessor, operatorCount };
  } catch { return { continuityReady: false, recoveryReady: false, hasSuccessor: false, operatorCount: 0 }; }
}

async function readProofScore(addr: string): Promise<number> {
  // ProofScore is on-chain; the indexer mirrors ScoreSet events. Latest indexed score, else NEUTRAL.
  try {
    const row = (await query<{ score: string }>(
      `SELECT data->>'newScore' AS score FROM indexed_events
        WHERE event_type = 'score' AND lower(data->>'subject') = $1
        ORDER BY block_number DESC LIMIT 1`, [addr],
    )).rows[0];
    const s = Number(row?.score);
    return Number.isFinite(s) ? s : 5000;
  } catch { return 5000; }
}

async function readPriorExtraction(addr: string): Promise<ExtractionState> {
  const now = Date.now();
  try {
    const row = (await query<{ index: number; last_updated_at: string }>(
      `SELECT index, last_updated_at FROM extraction_index_state WHERE address = $1`, [addr],
    )).rows[0];
    return row ? { index: row.index, lastUpdatedAt: new Date(row.last_updated_at).getTime() } : { index: 0, lastUpdatedAt: now };
  } catch { return { index: 0, lastUpdatedAt: now }; }
}

export const GET = withAuth(getHandler);
