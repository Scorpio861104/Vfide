/**
 * Stability Policy Engine (Whale Protection — the non-custodial synthesis).
 *
 * This is where the protocol's intent — "extraction becomes expensive, builders are protected" — is
 * realized WITHOUT touching anyone's tokens. It takes the metrics (Market Impact, Extraction Index,
 * Builder Record) plus ProofScore and scam signals, and outputs adjustments to VFIDE's OWN
 * discretionary services:
 *
 *   • Lending terms (collateral / limit multipliers) — VFIDE's capital, its discretion.
 *   • Marketplace visibility — VFIDE's promotion surface.
 *   • Emergency relief eligibility — VFIDE's discretionary fee/UX relief.
 *
 * It deliberately does NOT emit a token-transfer cooldown or a transfer fee. Those would require a
 * contract to block/tax a specific person's transfer based on a judgment about them — the exact
 * capability VFIDEToken.sol forbids ("no entity or contract can control another user's tokens"). The
 * flat, equal-for-all AntiWhale limits already in the token are the non-custodial market-impact brake;
 * this engine adds *behavioral fairness at the services layer*, which a manipulator cannot route
 * around (you can only get VFIDE lending/visibility from VFIDE).
 *
 * Every output is explainable (transparency requirement). Pure/deterministic.
 */

import type { ImpactTier } from './marketImpact';
import { extractionCategory, type ExtractionCategory } from './extractionIndex';
import type { BuilderResult } from './builderRecord';

export interface StabilityContext {
  impactTier: ImpactTier;
  extractionIndex: number; // 0..10,000
  builder: BuilderResult;
  proofScore: number; // 0..10,000
  /** Scam signals (verified — disputes/fraud), kept distinct from mere behavior. */
  verifiedDisputes: number;
  fraudFlags: number;
  /** Months since last emergency relief, or null if never used. */
  monthsSinceLastRelief: number | null;
}

export interface LendingAdjustment {
  /** Multiply normal collateral requirement (1 = normal, >1 = stricter, <1 = better). */
  collateralMultiplier: number;
  /** Multiply normal borrow limit (1 = normal, <1 = reduced). */
  limitMultiplier: number;
  /** If true, discretionary lending is paused for this participant (never blocks their tokens). */
  lendingRestricted: boolean;
}

export interface MarketplaceAdjustment {
  /** Multiply normal promotional visibility (1 = normal). */
  visibilityMultiplier: number;
}

export interface StabilityDecision {
  lending: LendingAdjustment;
  marketplace: MarketplaceAdjustment;
  emergency: { eligible: boolean; reason: string };
  /** Whether this looks like a scammer exit (max discretionary friction). */
  scammerExitSuspected: boolean;
  /** Plain-language, line-by-line transparency for the participant. */
  explanation: string[];
  /** Explicit, by design. */
  tokenTransferEffect: 'none — ownership is sovereign; the flat AntiWhale limit applies equally to all';
}

/** Builder Record dampens friction; high builders are protected. Returns 0..1 (1 = full protection). */
function builderProtection(builder: BuilderResult): number {
  switch (builder.category) {
    case 'Institutional Merchant': return 1;
    case 'Community Steward': return 0.9;
    case 'Merchant': return 0.8;
    case 'Established Builder': return 0.7;
    case 'Builder': return 0.5;
    default: return 0;
  }
}

export function evaluateStabilityPolicy(ctx: StabilityContext): StabilityDecision {
  const explanation: string[] = [];
  const protection = builderProtection(ctx.builder);
  const exCategory: ExtractionCategory = extractionCategory(ctx.extractionIndex);

  // Scammer-exit: VERIFIED bad acts (disputes/fraud) + low trust + high extraction. Note this keys on
  // verified disputes/fraud, NOT on wealth or on a single large sell.
  const scammerExitSuspected =
    (ctx.fraudFlags > 0 || ctx.verifiedDisputes >= 2) && ctx.proofScore < 4000 && ctx.extractionIndex >= 5000;

  // ── Lending terms (discretionary) ──────────────────────────────────────────
  // Base off extraction risk, then relax for builders. Scammers get restricted from VFIDE capital.
  let collateralMultiplier = 1;
  let limitMultiplier = 1;
  let lendingRestricted = false;

  if (scammerExitSuspected) {
    lendingRestricted = true;
    explanation.push('Verified disputes/fraud with high extraction signals → VFIDE lending is paused for now (your own tokens are unaffected).');
  } else if (ctx.extractionIndex >= 5000) {
    collateralMultiplier = 1.5 - protection * 0.5;
    limitMultiplier = 0.5 + protection * 0.4;
    explanation.push(`Extraction Index is ${exCategory} → stricter borrowing terms${protection > 0 ? ', softened by your Builder Record' : ''}.`);
  } else if (ctx.extractionIndex >= 3000) {
    collateralMultiplier = 1.2 - protection * 0.3;
    limitMultiplier = 0.8 + protection * 0.2;
    explanation.push(`Extraction Index is ${exCategory} → slightly stricter borrowing terms${protection > 0 ? ', softened by your Builder Record' : ''}.`);
  } else {
    // Low extraction + builder → BETTER than normal terms.
    collateralMultiplier = 1 - protection * 0.2;
    limitMultiplier = 1 + protection * 0.25;
    if (protection > 0) explanation.push('Low extraction + strong Builder Record → better borrowing terms.');
  }
  collateralMultiplier = Math.round(Math.max(0.5, collateralMultiplier) * 100) / 100;
  limitMultiplier = Math.round(Math.max(0.1, limitMultiplier) * 100) / 100;

  // ── Marketplace visibility (discretionary) ─────────────────────────────────
  let visibilityMultiplier = 1;
  if (scammerExitSuspected) {
    visibilityMultiplier = 0.2;
    explanation.push('Reduced marketplace visibility while scam signals are present.');
  } else if (ctx.extractionIndex >= 5000) {
    visibilityMultiplier = 0.5 + protection * 0.3;
  } else {
    visibilityMultiplier = 1 + protection * 0.5; // builders surface higher
    if (protection > 0) explanation.push('Builders get higher marketplace visibility.');
  }
  visibilityMultiplier = Math.round(visibilityMultiplier * 100) / 100;

  // ── Emergency relief eligibility (discretionary) ───────────────────────────
  // High trust + strong builder + low extraction + not used in the last 12 months.
  const reliefAvailable = ctx.monthsSinceLastRelief === null || ctx.monthsSinceLastRelief >= 12;
  const emergencyEligible =
    reliefAvailable && ctx.proofScore >= 6000 && protection >= 0.5 && ctx.extractionIndex < 3000 && !scammerExitSuspected;
  const emergencyReason = emergencyEligible
    ? 'Eligible for a one-time emergency relief (reduced fees/UX friction on VFIDE services). DAO review available.'
    : !reliefAvailable
      ? 'Emergency relief already used in the last 12 months.'
      : 'Emergency relief needs strong trust + Builder Record + low extraction. DAO review available if you believe this is wrong.';

  explanation.push('Your ability to own and move your tokens is never affected — only VFIDE’s own services adjust. The flat anti-whale limit applies equally to everyone.');

  return {
    lending: { collateralMultiplier, limitMultiplier, lendingRestricted },
    marketplace: { visibilityMultiplier },
    emergency: { eligible: emergencyEligible, reason: emergencyReason },
    scammerExitSuspected,
    explanation,
    tokenTransferEffect: 'none — ownership is sovereign; the flat AntiWhale limit applies equally to all',
  };
}
