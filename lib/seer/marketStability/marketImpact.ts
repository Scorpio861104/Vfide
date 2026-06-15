/**
 * Market Impact Engine (Whale Protection — System 1).
 *
 * Computes how much market INSTABILITY a transaction would create — never how rich the wallet is.
 * Pure, read-only, deterministic. Inputs are all RELATIVE (share of liquidity, share of the seller's
 * own holdings), so a 10M-token holder selling 1% scores low and a 100-token holder dumping 100%
 * scores high. That is the "behavior, not wealth" rule made concrete.
 *
 * This produces a signal. It does NOT block, tax, or restrict anything — enforcement (if any) lives
 * in VFIDE's own discretionary services, never in token transfers (see stabilityPolicy.ts and the
 * architecture note). Computing a number controls no one.
 */

export type ImpactTier = 0 | 1 | 2 | 3 | 4;

export interface MarketImpactInputs {
  /** Tokens being sold/moved in this event. */
  sellAmount: bigint;
  /** Tokens currently providing liquidity (pool depth) the sell would hit. */
  circulatingLiquidity: bigint;
  /** The seller's own total holdings — used ONLY to compute % of their own stack being sold. */
  personalHoldings: bigint;
  /** Optional recent realized volatility, 0..1 (1 = extreme). Amplifies impact. */
  recentVolatility?: number;
  /** Optional market-depth factor 0..1 (1 = very thin book → higher impact). */
  thinnessFactor?: number;
}

export interface MarketImpactResult {
  /** 0..100. */
  score: number;
  tier: ImpactTier;
  tierLabel: string;
  /** Transparent breakdown — every enforcement explanation must be able to cite these. */
  factors: {
    shareOfLiquidityPct: number;
    shareOfHoldingsPct: number;
    volatilityContribution: number;
    thinnessContribution: number;
  };
}

const TIER_LABELS: Record<ImpactTier, string> = {
  0: 'No impact',
  1: 'Minor impact',
  2: 'Moderate impact',
  3: 'High impact',
  4: 'Severe impact',
};

function ratioPct(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  // basis-point precision without floats on the bigint division
  const bps = Number((part * 10000n) / whole);
  return Math.min(100, bps / 100);
}

function tierForScore(score: number): ImpactTier {
  if (score < 5) return 0;
  if (score < 25) return 1;
  if (score < 50) return 2;
  if (score < 75) return 3;
  return 4;
}

/**
 * Impact = mostly "how much of the available liquidity does this consume", weighted up by how thin
 * the book is and how volatile things already are. Share-of-own-holdings is a secondary signal
 * (selling your whole stack at once is more destabilizing per token than trimming a sliver).
 */
export function computeMarketImpact(inputs: MarketImpactInputs): MarketImpactResult {
  const shareOfLiquidityPct = ratioPct(inputs.sellAmount, inputs.circulatingLiquidity);
  const shareOfHoldingsPct = ratioPct(inputs.sellAmount, inputs.personalHoldings);
  const volatility = Math.max(0, Math.min(1, inputs.recentVolatility ?? 0));
  const thinness = Math.max(0, Math.min(1, inputs.thinnessFactor ?? 0));

  // Base: a sell consuming 20%+ of liquidity is already severe; scale so 20% liquidity ≈ 70 base.
  const liquidityComponent = Math.min(85, shareOfLiquidityPct * 3.5);
  // Dumping a large fraction of your own stack adds up to ~15.
  const holdingsComponent = (shareOfHoldingsPct / 100) * 15;

  const volatilityContribution = volatility * 12; // up to +12 in turbulent markets
  const thinnessContribution = thinness * 10; // up to +10 in a thin book

  const score = Math.max(0, Math.min(100, liquidityComponent + holdingsComponent + volatilityContribution + thinnessContribution));
  const tier = tierForScore(score);

  return {
    score: Math.round(score * 10) / 10,
    tier,
    tierLabel: TIER_LABELS[tier],
    factors: {
      shareOfLiquidityPct: Math.round(shareOfLiquidityPct * 100) / 100,
      shareOfHoldingsPct: Math.round(shareOfHoldingsPct * 100) / 100,
      volatilityContribution: Math.round(volatilityContribution * 10) / 10,
      thinnessContribution: Math.round(thinnessContribution * 10) / 10,
    },
  };
}
