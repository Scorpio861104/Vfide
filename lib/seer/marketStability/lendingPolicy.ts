/**
 * Seer Lending Engine (ecosystem-integration wave — P2P Lending coverage).
 *
 * Turns the Seer's signals into ADVISORY loan terms: borrowing eligibility, a suggested limit, a fair
 * interest range, a collateral posture, and a risk tier. Builder-aware and non-predatory.
 *
 * WHY ADVISORY (and why that's the honest design): in VFIDETermLoan.sol the on-chain limit is a fixed
 * function of ProofScore (tiers 5000→100, 6000→1,000, 7000→5,000, 8000→20,000 VFIDE; DAO-configurable),
 * and interest is **set by the lender per loan**, capped at 12% (MAX_INTEREST_BPS = 1200). The Seer
 * cannot — and under VFIDE's non-custodial, audit-gated rules should not — silently rewrite the
 * contract's enforced limits. What it CAN do is recommend fair terms to both sides, layering Builder
 * Record (trust earned by contribution) and Extraction Index (market behavior) on top of the
 * ProofScore base. Builders get more favorable suggestions; extractive behavior gets more conservative
 * ones. The contract still enforces the hard ProofScore tier; this guides within and around it.
 *
 * Pure/deterministic. Mirrors the real constants so suggestions never exceed what the chain allows.
 */

import type { BuilderResult } from './builderRecord';
import { extractionCategory } from './extractionIndex';

// ── On-chain ground truth (keep in sync with VFIDETermLoan.sol) ──
export const LOAN_TIER_SCORES = [5000, 6000, 7000, 8000] as const;
/** Max loan per tier, in whole VFIDE (contract stores 18-decimals). */
export const LOAN_TIER_LIMITS = [100, 1000, 5000, 20000] as const;
export const MAX_INTEREST_BPS = 1200; // 12% cap, lender-set

export type LoanRiskTier = 'Prime' | 'Standard' | 'Cautious' | 'Restricted' | 'Ineligible';

export interface LendingTermsInput {
  proofScore: number; // 0..10,000
  builder: BuilderResult;
  extractionIndex: number; // 0..10,000
  /** Real repayment history if known. */
  loansRepaidOnTime?: number;
  loansDefaulted?: number;
  /**
   * Composite Merchant Health 0..100 (or null/undefined if unproven). A healthier business is a better
   * lending risk, so it shaves a small, BOUNDED amount off the suggested interest — never dominant, never
   * a penalty when absent (Wave 80: makes Merchant Health a real lending consumer, not just a display).
   */
  merchantHealth?: number | null;
}

export interface SuggestedLoanTerms {
  eligible: boolean;
  /** Hard ceiling the chain will enforce for this ProofScore (whole VFIDE). 0 = below tier 1. */
  onChainMaxVfide: number;
  /** Seer's *suggested* borrow amount (≤ on-chain max), reflecting builder/extraction posture. */
  suggestedLimitVfide: number;
  /** Suggested fair interest range in bps (within the 12% cap). For lenders + borrowers. */
  suggestedInterestBps: { min: number; max: number };
  /** Collateral posture — note: VFIDE term loans are ProofScore-collateralized, not token-backed. */
  collateralGuidance: 'none — ProofScore-backed' | 'guarantor recommended' | 'guarantor required';
  riskTier: LoanRiskTier;
  /** Plain-language transparency. */
  explanation: string[];
}

function onChainMaxForScore(score: number): number {
  for (let i = LOAN_TIER_SCORES.length - 1; i >= 0; i--) {
    const t = LOAN_TIER_SCORES[i];
    const lim = LOAN_TIER_LIMITS[i];
    if (t !== undefined && lim !== undefined && score >= t) return lim;
  }
  return 0;
}

/** Builder protection 0..1 (higher = more favorable terms). */
function builderFavor(b: BuilderResult): number {
  switch (b.category) {
    case 'Institutional Merchant': return 1;
    case 'Community Steward': return 0.85;
    case 'Merchant': return 0.7;
    case 'Established Builder': return 0.55;
    case 'Builder': return 0.35;
    default: return 0;
  }
}

export function suggestLoanTerms(input: LendingTermsInput): SuggestedLoanTerms {
  const explanation: string[] = [];
  const onChainMax = onChainMaxForScore(input.proofScore);
  const eligible = onChainMax > 0;
  const favor = builderFavor(input.builder);
  const exCat = extractionCategory(input.extractionIndex);
  const defaulted = input.loansDefaulted ?? 0;
  const repaid = input.loansRepaidOnTime ?? 0;

  if (!eligible) {
    return {
      eligible: false,
      onChainMaxVfide: 0,
      suggestedLimitVfide: 0,
      suggestedInterestBps: { min: 0, max: 0 },
      collateralGuidance: 'guarantor required',
      riskTier: 'Ineligible',
      explanation: ['ProofScore is below the lending threshold (5,000). Build trust through activity to qualify; your ownership is unaffected.'],
    };
  }

  // Suggested limit: start at on-chain max, trim for high extraction, but never below a floor for builders.
  let limitFraction = 1;
  if (input.extractionIndex >= 7000) limitFraction = 0.4 + favor * 0.4;
  else if (input.extractionIndex >= 5000) limitFraction = 0.6 + favor * 0.3;
  else if (input.extractionIndex >= 3000) limitFraction = 0.8 + favor * 0.2;
  else limitFraction = 1; // low extraction → full tier
  if (input.extractionIndex >= 3000) explanation.push(`Market behavior is ${exCat} → suggested amount trimmed${favor > 0 ? ', softened by your Builder Record' : ''}.`);

  const suggestedLimitVfide = Math.max(0, Math.round(onChainMax * Math.min(1, limitFraction)));

  // Suggested interest range (within 12% cap). Lower for trust + builders, higher for extraction/defaults.
  // Base midpoint scales down with ProofScore; builders shave it; extraction/defaults add to it.
  const scoreFactor = Math.max(0, Math.min(1, (input.proofScore - 5000) / 3000)); // 0 at 5000, 1 at 8000+
  let baseBps = 1000 - scoreFactor * 500; // 10% at neutral → 5% at highly trusted
  baseBps -= favor * 200; // builders: up to −2%
  if (input.extractionIndex >= 5000) baseBps += 250;
  baseBps += defaulted * 150;
  // Merchant Health: a proven-healthy business (≥65) earns a small, bounded interest break (≤100 bps).
  // Only applies when health is known and confident; never a penalty when absent.
  if (input.merchantHealth != null && input.merchantHealth >= 65) {
    const healthBreak = Math.min(100, Math.round(((input.merchantHealth - 65) / 35) * 100)); // 65→0, 100→−100
    if (healthBreak > 0) { baseBps -= healthBreak; explanation.push('Healthy business metrics → a small additional interest break.'); }
  }
  baseBps = Math.max(200, Math.min(MAX_INTEREST_BPS, baseBps));
  const suggestedInterestBps = {
    min: Math.max(200, Math.round(baseBps - 150)),
    max: Math.min(MAX_INTEREST_BPS, Math.round(baseBps + 150)),
  };
  if (favor > 0 && input.extractionIndex < 3000) explanation.push('Strong Builder Record + low extraction → a more favorable interest range.');

  // Collateral / guarantor posture.
  let collateralGuidance: SuggestedLoanTerms['collateralGuidance'] = 'none — ProofScore-backed';
  if (defaulted > 0 || input.extractionIndex >= 7000) collateralGuidance = 'guarantor required';
  else if (input.proofScore < 6000 || input.extractionIndex >= 5000) collateralGuidance = 'guarantor recommended';
  if (collateralGuidance !== 'none — ProofScore-backed') explanation.push(`A guarantor co-signer is ${collateralGuidance.includes('required') ? 'required' : 'recommended'} for this profile.`);

  // Risk tier.
  let riskTier: LoanRiskTier;
  if (defaulted > 0) riskTier = 'Cautious';
  else if (input.extractionIndex >= 7000) riskTier = 'Restricted';
  else if (input.proofScore >= 7000 && favor >= 0.55 && repaid > 0) riskTier = 'Prime';
  else if (input.proofScore >= 6000 && input.extractionIndex < 5000) riskTier = 'Standard';
  else riskTier = 'Cautious';

  explanation.push('These are suggestions, not commands. Final terms are agreed between borrower and lender; the protocol enforces only the ProofScore-based ceiling. Your tokens are never held by the Seer.');

  return { eligible, onChainMaxVfide: onChainMax, suggestedLimitVfide, suggestedInterestBps, collateralGuidance, riskTier, explanation };
}
