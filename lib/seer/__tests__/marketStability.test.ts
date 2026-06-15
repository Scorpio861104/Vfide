import { describe, expect, it } from '@jest/globals';
import { computeMarketImpact } from '@/lib/seer/marketStability/marketImpact';
import { computeExtractionIndex, applyDecay, extractionCategory, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { evaluateStabilityPolicy } from '@/lib/seer/marketStability/stabilityPolicy';
import { suggestLoanTerms } from '@/lib/seer/marketStability/lendingPolicy';
import { computeBondBenefits } from '@/lib/seer/marketStability/stabilityBonding';
import { computeMerchantAdvisor } from '@/lib/seer/merchantAdvisor';
import { classifyTransfer } from '@/lib/seer/marketStability/swapClassification';

const NOW = 1_700_000_000_000;

// Builder archetypes reused across the matrix.
const institutionalMerchant = computeBuilderRecord({
  isMerchant: true, merchantVerified: true, storeOperations: 120, governanceParticipations: 2,
  recoveryConfigured: true, continuityConfigured: true, yearsActive: 3, successfulDeliveries: 80,
  productListings: 20, lendingParticipation: 2,
});
const newcomer = computeBuilderRecord({
  isMerchant: false, merchantVerified: false, storeOperations: 0, governanceParticipations: 0,
  recoveryConfigured: false, continuityConfigured: false, yearsActive: 0, successfulDeliveries: 0,
  productListings: 0, lendingParticipation: 0,
});
const retiree = computeBuilderRecord({
  isMerchant: false, merchantVerified: false, storeOperations: 0, governanceParticipations: 1,
  recoveryConfigured: true, continuityConfigured: true, yearsActive: 10, successfulDeliveries: 0,
  productListings: 0, lendingParticipation: 0,
});

describe('Market Impact engine — behavior not wealth', () => {
  it('scores by share of liquidity, not absolute size', () => {
    // Two sells of identical absolute size but very different liquidity share.
    const thinPool = computeMarketImpact({ sellAmount: 100_000n, circulatingLiquidity: 200_000n, personalHoldings: 1_000_000n });
    const deepPool = computeMarketImpact({ sellAmount: 100_000n, circulatingLiquidity: 100_000_000n, personalHoldings: 1_000_000n });
    expect(thinPool.score).toBeGreaterThan(deepPool.score);
  });
  it('tiers are 0..4 and bounded', () => {
    const r = computeMarketImpact({ sellAmount: 0n, circulatingLiquidity: 1n, personalHoldings: 1n });
    expect(r.tier).toBeGreaterThanOrEqual(0);
    expect(r.tier).toBeLessThanOrEqual(4);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('Extraction Index — accumulation, categories, 90-day decay', () => {
  it('repeated cycles drive the index up and into higher categories', () => {
    let st: ExtractionState = { index: 0, lastUpdatedAt: NOW };
    for (let i = 0; i < 5; i++) {
      st = computeExtractionIndex(st, { highImpactSells: 2, sellRebuyCycles: 2, rapidRebuys: 2, volatilityEvents: 1, liquidityDisruptions: 1 }, NOW).state;
    }
    expect(st.index).toBeGreaterThanOrEqual(7000);
    expect(extractionCategory(st.index)).toBe('Extraction Focused');
  });
  it('decays ~50% per 90 days (no permanent punishment)', () => {
    const decayed = applyDecay({ index: 8000, lastUpdatedAt: NOW - 90 * 24 * 3600 * 1000 }, NOW);
    expect(decayed.index).toBeGreaterThan(3500);
    expect(decayed.index).toBeLessThan(4500);
  });
  it('cluster correlation alone cannot push past Observed (advisory only)', () => {
    const r = computeExtractionIndex({ index: 0, lastUpdatedAt: NOW }, { highImpactSells: 0, sellRebuyCycles: 0, rapidRebuys: 0, volatilityEvents: 0, liquidityDisruptions: 0, clusterCorrelation: 1 }, NOW);
    expect(r.index).toBeLessThan(3000); // below 'Elevated'
  });
});

describe('Builder Record — contribution, not wealth', () => {
  it('classifies a verified high-activity merchant as Institutional Merchant', () => {
    expect(institutionalMerchant.category).toBe('Institutional Merchant');
  });
  it('a fresh wallet is a Newcomer', () => {
    expect(newcomer.category).toBe('Newcomer');
  });
});

// Stage 7 (Wave 78) — edge-case hardening: the score must not break or be gamed by bad inputs,
// and the top of the scale must still discriminate (caps sum to exactly MAX, no early saturation).
describe('Builder Record — edge cases (Wave 78 Stage 7 audit)', () => {
  const base = {
    isMerchant: false, merchantVerified: false, storeOperations: 0, successfulDeliveries: 0,
    productListings: 0, governanceParticipations: 0, recoveryConfigured: false,
    continuityConfigured: false, yearsActive: 0, lendingParticipation: 0,
  };
  it('negative counts contribute nothing (never a negative score)', () => {
    const r = computeBuilderRecord({ ...base, storeOperations: -5, governanceParticipations: -10 });
    expect(r.score).toBe(0);
  });
  it('NaN / Infinity inputs are safe (no NaN score, capped not exploded)', () => {
    expect(computeBuilderRecord({ ...base, governanceParticipations: NaN }).score).toBe(0);
    const inf = computeBuilderRecord({ ...base, storeOperations: Infinity });
    expect(Number.isFinite(inf.score)).toBe(true);
    expect(inf.score).toBeLessThanOrEqual(10000);
  });
  it('fractional counts are floored (2.7 years earns 2 years of points, not 2.7)', () => {
    expect(computeBuilderRecord({ ...base, yearsActive: 2.7 }).score).toBe(1000); // floor(2.7)=2 * 500
  });
  it('never exceeds MAX and the top of the scale discriminates (caps sum to exactly 10000)', () => {
    const maxed = computeBuilderRecord({
      isMerchant: true, merchantVerified: true, storeOperations: 1000, successfulDeliveries: 1000,
      productListings: 1000, governanceParticipations: 100, recoveryConfigured: true,
      continuityConfigured: true, yearsActive: 100, lendingParticipation: 100,
    });
    expect(maxed.score).toBe(10000);
    // Dropping whole contribution categories must MEANINGFULLY lower the score (no early saturation).
    const partial = computeBuilderRecord({
      isMerchant: true, merchantVerified: true, storeOperations: 1000, successfulDeliveries: 1000,
      productListings: 0, governanceParticipations: 0, recoveryConfigured: true,
      continuityConfigured: true, yearsActive: 100, lendingParticipation: 0,
    });
    expect(partial.score).toBeLessThan(maxed.score);
    expect(maxed.score - partial.score).toBeGreaterThanOrEqual(1500);
  });
});

// PHASE 4 — Whale Protection validation matrix, as executable assertions.
describe('Whale Protection validation matrix (Phase 4) — token effect is ALWAYS none', () => {
  it('Long-term merchant expansion → better lending, eligible, token untouched', () => {
    const d = evaluateStabilityPolicy({ impactTier: 3, extractionIndex: 200, builder: institutionalMerchant, proofScore: 7500, verifiedDisputes: 0, fraudFlags: 0, monthsSinceLastRelief: null });
    expect(d.lending.lendingRestricted).toBe(false);
    expect(d.lending.limitMultiplier).toBeGreaterThan(1);
    expect(d.tokenTransferEffect).toMatch(/^none/);
  });
  it('Medical emergency (strong builder, high trust, low extraction) → emergency eligible', () => {
    const d = evaluateStabilityPolicy({ impactTier: 2, extractionIndex: 100, builder: institutionalMerchant, proofScore: 7800, verifiedDisputes: 0, fraudFlags: 0, monthsSinceLastRelief: null });
    expect(d.emergency.eligible).toBe(true);
    expect(d.tokenTransferEffect).toMatch(/^none/);
  });
  it('Scammer exit (low trust, fraud + disputes, high extraction) → lending restricted, visibility crushed, token untouched', () => {
    const d = evaluateStabilityPolicy({ impactTier: 4, extractionIndex: 8000, builder: newcomer, proofScore: 1500, verifiedDisputes: 3, fraudFlags: 2, monthsSinceLastRelief: null });
    expect(d.scammerExitSuspected).toBe(true);
    expect(d.lending.lendingRestricted).toBe(true);
    expect(d.marketplace.visibilityMultiplier).toBeLessThanOrEqual(0.3);
    expect(d.tokenTransferEffect).toMatch(/^none/);
  });
  it('Pump-and-dump trader (max extraction) → reduced lending, NOT emergency eligible, token untouched', () => {
    const d = evaluateStabilityPolicy({ impactTier: 3, extractionIndex: 10000, builder: newcomer, proofScore: 5000, verifiedDisputes: 0, fraudFlags: 0, monthsSinceLastRelief: null });
    expect(d.lending.limitMultiplier).toBeLessThan(1);
    expect(d.emergency.eligible).toBe(false);
    expect(d.tokenTransferEffect).toMatch(/^none/);
  });
  it('Legitimate retirement withdrawal (10y, no extraction) → emergency eligible, token untouched', () => {
    const d = evaluateStabilityPolicy({ impactTier: 3, extractionIndex: 0, builder: retiree, proofScore: 8000, verifiedDisputes: 0, fraudFlags: 0, monthsSinceLastRelief: null });
    expect(d.emergency.eligible).toBe(true);
    expect(d.tokenTransferEffect).toMatch(/^none/);
  });
});

describe('Seer Lending Engine — advisory, aligned to on-chain tiers', () => {
  it('below ProofScore 5000 → honestly ineligible', () => {
    const t = suggestLoanTerms({ proofScore: 4500, builder: newcomer, extractionIndex: 0 });
    expect(t.eligible).toBe(false);
    expect(t.riskTier).toBe('Ineligible');
  });
  it('prime builder → full tier ceiling, no guarantor, low interest', () => {
    const t = suggestLoanTerms({ proofScore: 7800, builder: institutionalMerchant, extractionIndex: 100, loansRepaidOnTime: 3, loansDefaulted: 0 });
    expect(t.onChainMaxVfide).toBe(5000); // tier for score 7000–7999
    expect(t.suggestedLimitVfide).toBeLessThanOrEqual(t.onChainMaxVfide);
    expect(t.collateralGuidance).toMatch(/ProofScore-backed/);
  });
  it('high extraction → suggested limit trimmed below ceiling, guarantor required, higher interest', () => {
    const t = suggestLoanTerms({ proofScore: 6200, builder: newcomer, extractionIndex: 8000 });
    expect(t.suggestedLimitVfide).toBeLessThan(t.onChainMaxVfide);
    expect(t.collateralGuidance).toContain('guarantor');
    expect(t.suggestedInterestBps.max).toBeLessThanOrEqual(1200); // never exceeds the 12% cap
  });
  // Wave 80 — Merchant Health is now a REAL lending consumer (was display-only): a healthy business
  // earns a small, bounded interest break; absent/low health never penalizes.
  it('a healthy merchant earns a small bounded interest break; absent health does not penalize', () => {
    const baseInput = { proofScore: 7000, builder: institutionalMerchant, extractionIndex: 100, loansRepaidOnTime: 2 };
    const noHealth = suggestLoanTerms(baseInput);
    const healthy = suggestLoanTerms({ ...baseInput, merchantHealth: 95 });
    const lowHealth = suggestLoanTerms({ ...baseInput, merchantHealth: 40 });
    // Healthy → lower interest than no-health; the break is bounded (≤100 bps off the midpoint).
    expect(healthy.suggestedInterestBps.max).toBeLessThan(noHealth.suggestedInterestBps.max);
    expect(noHealth.suggestedInterestBps.max - healthy.suggestedInterestBps.max).toBeLessThanOrEqual(100);
    // Low health (<65) is treated like no health — never a penalty.
    expect(lowHealth.suggestedInterestBps.max).toBe(noHealth.suggestedInterestBps.max);
    // Still respects the cap and floor.
    expect(healthy.suggestedInterestBps.min).toBeGreaterThanOrEqual(200);
  });
});

describe('Stability Bonding — rewards commitment not wealth, verification required', () => {
  const future = NOW + 1000 * 60 * 60 * 24 * 400;
  it('a whale bond and a modest bond of the same term earn the SAME benefits (size saturates)', () => {
    const modest = computeBondBenefits({ termMonths: 24, amountVfide: 5000, verifiedOnChain: true, maturityAt: future }, NOW);
    const whale = computeBondBenefits({ termMonths: 24, amountVfide: 500000, verifiedOnChain: true, maturityAt: future }, NOW);
    expect(whale.feeMultiplier).toBe(modest.feeMultiplier);
    expect(whale.builderBonus).toBe(modest.builderBonus);
  });
  it('unverified or matured bonds grant nothing', () => {
    const unverified = computeBondBenefits({ termMonths: 24, amountVfide: 5000, verifiedOnChain: false, maturityAt: future }, NOW);
    const matured = computeBondBenefits({ termMonths: 24, amountVfide: 5000, verifiedOnChain: true, maturityAt: NOW - 1 }, NOW);
    expect(unverified.builderBonus).toBe(0);
    expect(matured.builderBonus).toBe(0);
  });
});

describe('Merchant Advisor — grounded signals, honest about thin data', () => {
  it('a growing store gets a high health score and positive signals', () => {
    const r = computeMerchantAdvisor({ revenueLast30: 5000, revenuePrev30: 4000, ordersLast30: 50, ordersPrev30: 42, distinctCustomers90: 80, repeatCustomers90: 40, refundsGranted90: 2, orders90: 120, trackedProducts: 10, lowStockProducts: 0, hasSubscriptionPlans: false, lifetimeOrders: 300 });
    expect(r.insufficientData).toBe(false);
    expect(r.healthScore).toBeGreaterThan(70);
    expect(r.signals.some((s) => s.id === 'revenue-up')).toBe(true);
  });
  it('a declining store raises the right concerns', () => {
    const r = computeMerchantAdvisor({ revenueLast30: 2000, revenuePrev30: 4000, ordersLast30: 20, ordersPrev30: 42, distinctCustomers90: 60, repeatCustomers90: 6, refundsGranted90: 18, orders90: 100, trackedProducts: 8, lowStockProducts: 3, hasSubscriptionPlans: false, lifetimeOrders: 250 });
    expect(r.signals.some((s) => s.id === 'revenue-down')).toBe(true);
    expect(r.signals.some((s) => s.id === 'refunds-high')).toBe(true);
    expect(r.signals.some((s) => s.id === 'low-stock')).toBe(true);
  });
  it('a brand-new store honestly reports insufficient data instead of faking a trend', () => {
    const r = computeMerchantAdvisor({ revenueLast30: 120, revenuePrev30: 0, ordersLast30: 2, ordersPrev30: 0, distinctCustomers90: 2, repeatCustomers90: 0, refundsGranted90: 0, orders90: 2, trackedProducts: 1, lowStockProducts: 0, hasSubscriptionPlans: false, lifetimeOrders: 2 });
    expect(r.insufficientData).toBe(true);
  });
});

describe('Swap classification (Wave 60 wiring) — feeds the Extraction Index sell/buy detection', () => {
  const POOL = '0xpool000000000000000000000000000000000000';
  const ME = '0xme00000000000000000000000000000000000000';
  const liq = new Set([POOL]);
  it('subject → pool is a sell; pool → subject is a buy', () => {
    expect(classifyTransfer({ from: ME, to: POOL, subject: ME, liquidityAddresses: liq })).toBe('sell');
    expect(classifyTransfer({ from: POOL, to: ME, subject: ME, liquidityAddresses: liq })).toBe('buy');
  });
  it('a transfer touching no pool is never a sell (ordinary p2p never counts as extraction)', () => {
    expect(classifyTransfer({ from: ME, to: '0xfriend00000000000000000000000000000000000', subject: ME, liquidityAddresses: liq })).toBe('transfer');
  });
  it('with no pools configured, nothing classifies as sell/buy (safe default → flags no one)', () => {
    const noLiq = new Set<string>();
    expect(classifyTransfer({ from: ME, to: POOL, subject: ME, liquidityAddresses: noLiq })).toBe('transfer');
  });
});

describe('Seer coverage — Market Impact orphan status is honestly tracked (Wave 72)', () => {
  it('Market Impact is a tracked subsystem, flagged PARTIAL, not silently omitted', async () => {
    const { SEER_SUBSYSTEMS } = await import('@/lib/seer/coverage');
    const mi = SEER_SUBSYSTEMS.find((s) => s.id === 'market-impact');
    expect(mi).toBeDefined();
    expect(mi!.status).toBe('PARTIAL'); // not LIVE — it has no live consumer yet
    // The note must be honest about WHY (missing pool liquidity feed), not hand-wave it as done.
    expect(mi!.note.toLowerCase()).toMatch(/liquidity|pool|reserve/);
    expect(mi!.note.toLowerCase()).toMatch(/not wired|placeholder|pending|does not exist|no live consumer/);
  });

  it('coverage summary counts Market Impact among PARTIAL (gap is visible)', async () => {
    const { coverageSummary } = await import('@/lib/seer/coverage');
    const c = coverageSummary();
    expect(c.partial).toBeGreaterThanOrEqual(3); // extraction-index, marketplace-trust, market-impact
  });
});
