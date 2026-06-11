/**
 * Seer Coverage Model (Full Seer Integration wave).
 *
 * The single source of truth for the Seer's subsystems: what each consumes, what it produces, and —
 * critically and honestly — whether it is actually LIVE, PARTIAL, or NOT YET BUILT. This encodes the
 * "Universal Seer Coverage Rule" (for every system: inputs / processing / outputs) so the claim of
 * coverage is auditable from code and can't drift into marketing.
 *
 * Status is deliberately conservative. A subsystem is only LIVE if it computes from real data and has
 * a real surface. PARTIAL means some of it is real but it depends on data/features that don't fully
 * exist. NOT_BUILT means the engine would need a backend or data source that isn't there — and we say
 * so rather than shipping a stub that fakes outputs.
 */

export type SeerCoverageStatus = 'LIVE' | 'PARTIAL' | 'NOT_BUILT';

export interface SeerSubsystem {
  id: string;
  name: string;
  /** One-line purpose. */
  purpose: string;
  inputs: string[];
  outputs: string[];
  status: SeerCoverageStatus;
  /** Where it lives / what it still needs — honest. */
  note: string;
}

export const SEER_SUBSYSTEMS: SeerSubsystem[] = [
  {
    id: 'builder-record',
    name: 'Builder Record Engine',
    purpose: 'Measure ecosystem contribution — not trust, not wealth.',
    inputs: ['merchant activity', 'store ops', 'governance participation', 'recovery/continuity', 'years active', 'lending participation'],
    outputs: ['Builder Score', 'Builder Tier/Classification'],
    status: 'LIVE',
    note: 'lib/seer/marketStability/builderRecord.ts + signals.ts (reads merchant/governance/continuity/tenure) + /api/seer/market-standing.',
  },
  {
    id: 'extraction-index',
    name: 'Extraction Index Engine',
    purpose: 'Measure destabilizing market behavior, separate from ProofScore.',
    inputs: ['indexed token transfers (sells/rebuys)', 'cycles'],
    outputs: ['Extraction Index (0–10,000)', 'Risk Category', 'whale-protocol input'],
    status: 'PARTIAL',
    note: 'Engine + 90-day decay + persistence are LIVE; "sells" are approximated from transfers to configured liquidity addresses. Needs swap/price classification in the indexer to be authoritative.',
  },
  {
    id: 'commerce-health',
    name: 'Commerce Health Engine',
    purpose: 'Monitor merchant health; flag struggling merchants early.',
    inputs: ['merchant revenue', 'customer growth', 'inventory', 'subscriptions', 'repeat rates'],
    outputs: ['Merchant Health Score', 'growth opportunities', 'risk warnings'],
    status: 'LIVE',
    note: 'Merchant Advisor (merchantAdvisor.ts) + /api/merchant/advisor derive real trends from timestamped data: revenue 30d-vs-prior, repeat-customer rate, refund rate, low stock, subscription opportunity, yielding a Commerce Health score plus grounded recommendations; reports insufficient data for new stores rather than faking trends.',
  },
  {
    id: 'marketplace-trust',
    name: 'Marketplace Trust Engine',
    purpose: 'Reward reliable merchants with visibility.',
    inputs: ['ProofScore', 'Builder Record', 'refund/dispute rates', 'delivery success'],
    outputs: ['Visibility Score', 'search ranking', 'featured eligibility'],
    status: 'PARTIAL',
    note: 'stabilityPolicy produces a visibilityMultiplier from Builder Record/extraction, and the disputes backend now feeds real dispute/refund signals into the scam-signal path. Delivery-success input still needs shipping data; otherwise inputs are largely real.',
  },
  {
    id: 'p2p-lending',
    name: 'P2P Lending Engine',
    purpose: 'Non-predatory growth capital, priced on contribution + behavior.',
    inputs: ['ProofScore', 'Builder Record', 'Extraction Index', 'repayment history'],
    outputs: ['borrowing eligibility', 'suggested limits/collateral/tier'],
    status: 'LIVE',
    note: 'Seer Lending Engine (lendingPolicy.ts) computes advisory terms (eligibility, suggested limit, fair interest range, collateral guidance, risk tier) from ProofScore + Builder Record + Extraction Index, aligned to VFIDETermLoan tier ceilings. Surfaced via /api/seer/market-standing + SeerLendingTerms; on-chain enforcement remains unchanged.',
  },
  {
    id: 'merchant-success',
    name: 'Merchant Success Engine',
    purpose: 'Act as an autonomous business advisor.',
    inputs: ['inventory', 'revenue', 'products', 'store activity', 'customer growth'],
    outputs: ['growth opportunities', 'automation suggestions', 'expansion recommendations'],
    status: 'LIVE',
    note: 'Merchant Advisor surfaces growth/retention/refund/inventory/subscription signals from real merchant data via /api/merchant/advisor + MerchantAdvisorCard. Advisory only — never changes prices, stock, or funds.',
  },
  {
    id: 'whale-protection',
    name: 'Whale Protection Engine',
    purpose: 'Protect builders and commerce; never punish ownership.',
    inputs: ['Extraction Index', 'Builder Record', 'ProofScore', 'Market Impact'],
    outputs: ['discretionary lending/visibility/emergency outcomes'],
    status: 'LIVE',
    note: 'lib/seer/marketStability/stabilityPolicy.ts. NOTE: token-level cooldowns/fees were deliberately NOT built — they contradict the non-custodial invariant (see Whale Protection architecture doc). The flat AntiWhale in VFIDEToken.sol is the token-level brake.',
  },
  {
    id: 'fraud-abuse',
    name: 'Fraud & Abuse Engine',
    purpose: 'Protect participants; fraud affects participation, never ownership.',
    inputs: ['fraud reports', 'disputes', 'merchant/buyer abuse'],
    outputs: ['risk adjustments', 'escrow adjustments', 'visibility changes'],
    status: 'LIVE',
    note: 'Disputes backend live: /api/disputes (open/respond/resolve/withdraw, non-custodial record mirroring the on-chain FraudRegistry — never holds funds) + useDisputes; upheld/refunded disputes feed the Seer scam signals (market-standing) and reduce marketplace visibility. On-chain confirmed-fraud punishment stays with FraudJury. Fraud affects participation, never ownership.',
  },
  {
    id: 'recovery-readiness',
    name: 'Recovery Readiness Engine',
    purpose: 'Prevent permanent loss.',
    inputs: ['guardian setup', 'recovery setup', 'vault config'],
    outputs: ['recovery readiness', 'security warnings', 'missing-component alerts'],
    status: 'LIVE',
    note: 'useContinuityStatus / useVaultRecovery expose guardian + recovery state; readiness is computed (not manual).',
  },
  {
    id: 'continuity',
    name: 'Continuity Engine',
    purpose: 'Protect businesses and families.',
    inputs: ['successor setup', 'inheritance', 'guardians', 'merchant succession'],
    outputs: ['continuity/succession readiness', 'preparedness warnings'],
    status: 'LIVE',
    note: 'Personal (useContinuityStatus) + merchant (/api/merchant/continuity, useMerchantContinuity) continuity, with computed readiness.',
  },
  {
    id: 'governance',
    name: 'Governance Engine',
    purpose: 'Reward ecosystem stewardship.',
    inputs: ['voting', 'proposal creation', 'execution'],
    outputs: ['governance participation metrics', 'steward recognition', 'builder bonus'],
    status: 'LIVE',
    note: 'Governance actions emit events; Builder Record counts governance participation from the durable event log.',
  },
  {
    id: 'sanctum',
    name: 'Sanctum Engine',
    purpose: 'Autonomous ecosystem support (Seer proposes, DAO approves).',
    inputs: ['fee pools', 'treasury', 'community requests', 'DAO directives'],
    outputs: ['grant / community / emergency support recommendations'],
    status: 'NOT_BUILT',
    note: 'Sanctum receives a fee share on-chain, but an autonomous grant-recommendation system has no backend. Deferred rather than stubbed.',
  },
];

export function coverageSummary() {
  const by = (s: SeerCoverageStatus) => SEER_SUBSYSTEMS.filter((x) => x.status === s).length;
  return {
    total: SEER_SUBSYSTEMS.length,
    live: by('LIVE'),
    partial: by('PARTIAL'),
    notBuilt: by('NOT_BUILT'),
  };
}
