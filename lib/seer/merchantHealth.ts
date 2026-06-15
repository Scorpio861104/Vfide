/**
 * Merchant Health composite engine (Wave 66, Phase 1) — Merchant Health as a first-class institution.
 *
 * Composes the sub-signals that already exist (commerce health, merchant trust, delivery reliability,
 * fulfillment, retention) into a single 0–100 Merchant Health score with explicit component weights,
 * a stability band, and itemized growth/risk signals. Pure & deterministic so it can be unit-tested and
 * shared by both the client hook and a server aggregation.
 *
 * Honest about thin data: a brand-new store returns `provisional` rather than a confident score, and
 * absent sub-signals are simply not counted (never penalized as zero).
 */

export interface MerchantHealthInputs {
  /** Commerce health 0..100 from the Merchant Advisor, or null if insufficient data. */
  commerceHealth: number | null;
  /** Operational merchant trust 0..100, or null. */
  merchantTrust: number | null;
  /** Delivery reliability 0..100, or null (unproven). */
  deliveryReliability: number | null;
  /** Returning-customer rate 0..1, or null. */
  retentionRate: number | null;
  /** 30-day revenue vs prior 30-day, as a ratio (1 = flat, >1 = growth), or null. */
  revenueTrendRatio: number | null;
  /** Total lifetime orders — used only to decide if there's enough history for a confident score. */
  lifetimeOrders: number;
}

export type HealthBand = 'provisional' | 'at_risk' | 'developing' | 'healthy' | 'thriving';

export interface MerchantHealthSignal {
  kind: 'growth' | 'risk';
  id: string;
  /** The observation (what's happening). */
  message: string;
  /** A DISTINCT recommended next step (not a restatement of the observation). */
  action: string;
}

export interface MerchantHealthResult {
  /** 0..100, or null when there's too little history for a confident score. */
  score: number | null;
  band: HealthBand;
  /** Itemized weighted component contributions (for transparency / the Action Center). */
  components: Array<{ name: string; weight: number; value: number | null; contribution: number }>;
  growthSignals: MerchantHealthSignal[];
  riskSignals: MerchantHealthSignal[];
  topRecommendation: string;
}

// Component weights (sum = 100). Trust + commerce + delivery are the backbone; retention + revenue-trend
// shade it. Weights are re-normalized over whichever components have data, so missing inputs don't
// silently drag the score to zero.
const WEIGHTS = {
  commerceHealth: 30,
  merchantTrust: 30,
  deliveryReliability: 20,
  retention: 10,
  revenueTrend: 10,
} as const;

function bandFor(score: number): HealthBand {
  if (score >= 85) return 'thriving';
  if (score >= 65) return 'healthy';
  if (score >= 45) return 'developing';
  return 'at_risk';
}

export function computeMerchantHealth(i: MerchantHealthInputs): MerchantHealthResult {
  // Normalize the trend ratio into a 0..100 sub-score: 1.0 → 60, 1.5+ → 100, 0.5- → 0. NaN/∞ → null.
  const trendScore =
    i.revenueTrendRatio == null || !Number.isFinite(i.revenueTrendRatio) ? null
    : Math.max(0, Math.min(100, Math.round((i.revenueTrendRatio - 0.5) * 100)));
  const retentionScore =
    i.retentionRate == null || !Number.isFinite(i.retentionRate) ? null
    : Math.round(Math.max(0, Math.min(1, i.retentionRate)) * 100);

  const parts: Array<{ name: string; weight: number; value: number | null }> = [
    { name: 'Commerce health', weight: WEIGHTS.commerceHealth, value: clamp(i.commerceHealth) },
    { name: 'Merchant trust', weight: WEIGHTS.merchantTrust, value: clamp(i.merchantTrust) },
    { name: 'Delivery reliability', weight: WEIGHTS.deliveryReliability, value: clamp(i.deliveryReliability) },
    { name: 'Customer retention', weight: WEIGHTS.retention, value: retentionScore },
    { name: 'Revenue trend', weight: WEIGHTS.revenueTrend, value: trendScore },
  ];

  const present = parts.filter((p) => p.value != null);
  const totalWeight = present.reduce((s, p) => s + p.weight, 0);

  const growthSignals: MerchantHealthSignal[] = [];
  const riskSignals: MerchantHealthSignal[] = [];

  // Signals (these fire regardless of score confidence, where the data supports them). Each carries a
  // plain OBSERVATION (message) and a DISTINCT next-step (action) — never the same sentence twice.
  if (i.revenueTrendRatio != null && i.revenueTrendRatio >= 1.15) growthSignals.push({ kind: 'growth', id: 'revenue-up', message: 'Revenue is up versus the previous period.', action: 'Expand your best-selling inventory or widen your reach while momentum is high.' });
  if (i.revenueTrendRatio != null && i.revenueTrendRatio <= 0.85) riskSignals.push({ kind: 'risk', id: 'revenue-down', message: 'Revenue is down versus the previous period.', action: 'Review pricing and stock levels, and re-engage past customers with a follow-up offer.' });
  if (i.retentionRate != null && i.retentionRate >= 0.4) growthSignals.push({ kind: 'growth', id: 'retention-strong', message: 'A strong share of customers are returning.', action: 'Launch a subscription or loyalty offer to lock in those repeat buyers.' });
  if (i.retentionRate != null && i.retentionRate < 0.15) riskSignals.push({ kind: 'risk', id: 'retention-weak', message: 'Few customers are coming back for a second purchase.', action: 'Add a post-sale follow-up message and a returning-customer discount.' });
  if (i.deliveryReliability != null && i.deliveryReliability < 50) riskSignals.push({ kind: 'risk', id: 'delivery-weak', message: 'Delivery reliability is low.', action: 'Confirm shipments with tracking and follow up on any deliveries not yet received.' });
  if (i.merchantTrust != null && i.merchantTrust < 50) riskSignals.push({ kind: 'risk', id: 'trust-low', message: 'Merchant trust is low.', action: 'Resolve any open disputes and confirm recent deliveries to rebuild trust.' });

  // Confidence gate: too little history → provisional, no confident score.
  if (i.lifetimeOrders < 5 || totalWeight === 0) {
    return {
      score: null,
      band: 'provisional',
      components: parts.map((p) => ({ ...p, contribution: 0 })),
      growthSignals,
      riskSignals,
      topRecommendation: 'Keep selling — a few more completed orders will unlock a confident health score.',
    };
  }

  let score = 0;
  const components = parts.map((p) => {
    const contribution = p.value == null ? 0 : (p.value * p.weight) / totalWeight;
    score += contribution;
    return { ...p, contribution: round1(contribution) };
  });
  score = Math.round(Math.max(0, Math.min(100, score)));
  const band = bandFor(score);

  const topRecommendation =
    riskSignals[0]?.action ??
    growthSignals[0]?.action ??
    (band === 'thriving' ? 'Your business is thriving — consider continuity planning to protect it.' : 'Steady — keep delivering reliably and engaging returning customers.');

  return { score, band, components, growthSignals, riskSignals, topRecommendation };
}

function clamp(n: number | null): number | null { return n == null || !Number.isFinite(n) ? null : Math.max(0, Math.min(100, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
