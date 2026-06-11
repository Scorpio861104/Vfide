/**
 * Seer Lending Engine.
 *
 * Produces advisory lending terms from ProofScore + Builder Record + Extraction Index.
 * This does not alter on-chain enforcement; it provides transparent guidance only.
 */

export const LOAN_TIER_SCORES = [5000, 6000, 7000, 8000] as const;
export const LOAN_TIER_LIMITS = [100, 1000, 5000, 20000] as const;
export const MAX_INTEREST_BPS = 1200;

export type LoanRiskTier = 'Prime' | 'Standard' | 'Cautious' | 'Restricted' | 'Ineligible';

export type BuilderCategory =
  | 'Institutional Merchant'
  | 'Community Steward'
  | 'Merchant'
  | 'Established Builder'
  | 'Builder'
  | 'Newcomer';

export interface BuilderSummary {
  category: BuilderCategory;
}

export interface LendingTermsInput {
  proofScore: number;
  builder: BuilderSummary;
  extractionIndex: number;
  loansRepaidOnTime?: number;
  loansDefaulted?: number;
}

export interface SuggestedLoanTerms {
  eligible: boolean;
  onChainMaxVfide: number;
  suggestedLimitVfide: number;
  suggestedInterestBps: { min: number; max: number };
  collateralGuidance: 'none - ProofScore-backed' | 'guarantor recommended' | 'guarantor required';
  riskTier: LoanRiskTier;
  explanation: string[];
}

function onChainMaxForScore(score: number): number {
  for (let i = LOAN_TIER_SCORES.length - 1; i >= 0; i--) {
    const tier = LOAN_TIER_SCORES[i];
    const limit = LOAN_TIER_LIMITS[i];
    if (tier !== undefined && limit !== undefined && score >= tier) return limit;
  }
  return 0;
}

function builderFavor(category: BuilderCategory): number {
  switch (category) {
    case 'Institutional Merchant':
      return 1;
    case 'Community Steward':
      return 0.85;
    case 'Merchant':
      return 0.7;
    case 'Established Builder':
      return 0.55;
    case 'Builder':
      return 0.35;
    default:
      return 0;
  }
}

function extractionCategory(extractionIndex: number): 'Low' | 'Elevated' | 'High' | 'Severe' {
  if (extractionIndex >= 7000) return 'Severe';
  if (extractionIndex >= 5000) return 'High';
  if (extractionIndex >= 3000) return 'Elevated';
  return 'Low';
}

export function suggestLoanTerms(input: LendingTermsInput): SuggestedLoanTerms {
  const explanation: string[] = [];
  const onChainMax = onChainMaxForScore(input.proofScore);
  const eligible = onChainMax > 0;

  if (!eligible) {
    return {
      eligible: false,
      onChainMaxVfide: 0,
      suggestedLimitVfide: 0,
      suggestedInterestBps: { min: 0, max: 0 },
      collateralGuidance: 'guarantor required',
      riskTier: 'Ineligible',
      explanation: [
        'ProofScore is below the lending threshold (5,000). Build trust through activity to qualify; ownership is unaffected.',
      ],
    };
  }

  const favor = builderFavor(input.builder.category);
  const defaulted = input.loansDefaulted ?? 0;
  const repaid = input.loansRepaidOnTime ?? 0;
  const exCategory = extractionCategory(input.extractionIndex);

  let limitFraction = 1;
  if (input.extractionIndex >= 7000) limitFraction = 0.4 + favor * 0.4;
  else if (input.extractionIndex >= 5000) limitFraction = 0.6 + favor * 0.3;
  else if (input.extractionIndex >= 3000) limitFraction = 0.8 + favor * 0.2;

  if (input.extractionIndex >= 3000) {
    explanation.push(
      `Market behavior is ${exCategory} so the suggested amount is reduced${favor > 0 ? ', softened by Builder Record' : ''}.`,
    );
  }

  const suggestedLimitVfide = Math.max(0, Math.round(onChainMax * Math.min(1, limitFraction)));

  const scoreFactor = Math.max(0, Math.min(1, (input.proofScore - 5000) / 3000));
  let baseBps = 1000 - scoreFactor * 500;
  baseBps -= favor * 200;
  if (input.extractionIndex >= 5000) baseBps += 250;
  baseBps += defaulted * 150;
  baseBps = Math.max(200, Math.min(MAX_INTEREST_BPS, baseBps));

  const suggestedInterestBps = {
    min: Math.max(200, Math.round(baseBps - 150)),
    max: Math.min(MAX_INTEREST_BPS, Math.round(baseBps + 150)),
  };

  let collateralGuidance: SuggestedLoanTerms['collateralGuidance'] = 'none - ProofScore-backed';
  if (defaulted > 0 || input.extractionIndex >= 7000) collateralGuidance = 'guarantor required';
  else if (input.proofScore < 6000 || input.extractionIndex >= 5000) collateralGuidance = 'guarantor recommended';

  if (collateralGuidance !== 'none - ProofScore-backed') {
    explanation.push(
      `A guarantor is ${collateralGuidance === 'guarantor required' ? 'required' : 'recommended'} for this profile.`,
    );
  }

  let riskTier: LoanRiskTier;
  if (defaulted > 0) riskTier = 'Cautious';
  else if (input.extractionIndex >= 7000) riskTier = 'Restricted';
  else if (input.proofScore >= 7000 && favor >= 0.55 && repaid > 0) riskTier = 'Prime';
  else if (input.proofScore >= 6000 && input.extractionIndex < 5000) riskTier = 'Standard';
  else riskTier = 'Cautious';

  explanation.push(
    'These are advisory suggestions. Borrower and lender agree final terms; protocol enforcement stays ProofScore-tier based.',
  );

  return {
    eligible,
    onChainMaxVfide: onChainMax,
    suggestedLimitVfide,
    suggestedInterestBps,
    collateralGuidance,
    riskTier,
    explanation,
  };
}
