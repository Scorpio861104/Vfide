/**
 * Merchant Health composite engine (Wave 66, Phase 1) — Merchant Health as a first-class institution.
 *
 * Composes the sub-signals that already exist (commerce health, merchant trust, delivery reliability,
 * fulfillment, retention) into a single 0–100 Merchant Health score with explicit component weights,
 * a stability band, and itemized growth/risk signals. Pure and deterministic so it can be unit-tested.
 *
 * Honest about thin data: a brand-new store returns provisional rather than a confident score, and
 * absent sub-signals are not counted (never penalized as zero).
 */

export interface MerchantHealthInputs {
  /** Commerce health 0..100 from Merchant Advisor, or null if insufficient data. */
  commerceHealth: number | null;
  /** Operational merchant trust 0..100, or null. */
  merchantTrust: number | null;
  /** Delivery reliability 0..100, or null (unproven). */
  deliveryReliability: number | null;
  /** Returning-customer rate 0..1, or null. */
  retentionRate: number | null;
  /** 30-day revenue vs prior 30-day as a ratio (1 = flat, >1 = growth), or null. */
  revenueTrendRatio: number | null;
  /** Total lifetime orders — used only for score confidence gating. */
  lifetimeOrders: number;
}

export type HealthBand = 'provisional' | 'at_risk' | 'developing' | 'healthy' | 'thriving';

export interface MerchantHealthSignal {
  kind: 'growth' | 'risk';
  id: string;
  message: string;
}

export interface MerchantHealthResult {
  /** 0..100, or null when history is too thin for a confident score. */
  score: number | null;
  band: HealthBand;
  /** Itemized weighted contributions for transparency and actionability. */
  components: Array<{ name: string; weight: number; value: number | null; contribution: number }>;
  growthSignals: MerchantHealthSignal[];
  riskSignals: MerchantHealthSignal[];
  topRecommendation: string;
}

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
  const trendScore =
    i.revenueTrendRatio == null
      ? null
      : Math.max(0, Math.min(100, Math.round((i.revenueTrendRatio - 0.5) * 100)));
  const retentionScore =
    i.retentionRate == null ? null : Math.round(Math.max(0, Math.min(1, i.retentionRate)) * 100);

  const parts: Array<{ name: string; weight: number; value: number | null }> = [
    { name: 'Commerce health', weight: WEIGHTS.commerceHealth, value: clamp(i.commerceHealth) },
    { name: 'Merchant trust', weight: WEIGHTS.merchantTrust, value: clamp(i.merchantTrust) },
    { name: 'Delivery reliability', weight: WEIGHTS.deliveryReliability, value: clamp(i.deliveryReliability) },
    { name: 'Customer retention', weight: WEIGHTS.retention, value: retentionScore },
    { name: 'Revenue trend', weight: WEIGHTS.revenueTrend, value: trendScore },
  ];

  const present = parts.filter((p) => p.value != null);
  const totalWeight = present.reduce((sum, p) => sum + p.weight, 0);

  const growthSignals: MerchantHealthSignal[] = [];
  const riskSignals: MerchantHealthSignal[] = [];

  if (i.revenueTrendRatio != null && i.revenueTrendRatio >= 1.15) {
    growthSignals.push({ kind: 'growth', id: 'revenue-up', message: 'Revenue is up vs the previous period — a good time to expand inventory or reach.' });
  }
  if (i.revenueTrendRatio != null && i.revenueTrendRatio <= 0.85) {
    riskSignals.push({ kind: 'risk', id: 'revenue-down', message: 'Revenue is down vs the previous period — review pricing, stock, and retention.' });
  }
  if (i.retentionRate != null && i.retentionRate >= 0.4) {
    growthSignals.push({ kind: 'growth', id: 'retention-strong', message: 'Strong returning-customer rate — consider a subscription or loyalty offer.' });
  }
  if (i.retentionRate != null && i.retentionRate < 0.15) {
    riskSignals.push({ kind: 'risk', id: 'retention-weak', message: 'Few customers are returning — focus on follow-up and post-sale experience.' });
  }
  if (i.deliveryReliability != null && i.deliveryReliability < 50) {
    riskSignals.push({ kind: 'risk', id: 'delivery-weak', message: 'Delivery reliability is low — confirm fulfillment and tracking to protect trust.' });
  }
  if (i.merchantTrust != null && i.merchantTrust < 50) {
    riskSignals.push({ kind: 'risk', id: 'trust-low', message: 'Merchant trust is low — resolving open disputes and confirming deliveries will help.' });
  }

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
    riskSignals[0]?.message ??
    growthSignals[0]?.message ??
    (band === 'thriving'
      ? 'Your business is thriving — consider continuity planning to protect it.'
      : 'Steady — keep delivering reliably and engaging returning customers.');

  return { score, band, components, growthSignals, riskSignals, topRecommendation };
}

function clamp(n: number | null): number | null {
  return n == null ? null : Math.max(0, Math.min(100, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
