/**
 * Seer — Headquarters Observations (Platform Transformation, Wave 3).
 *
 * The deterministic intelligence layer, surfaced across the headquarters. Given a participant's real state (wallet
 * connection, ProofScore, continuity readiness, merchant activity, configured systems), it produces typed
 * observations that EXPLAIN, TEACH, WARN, surface OPPORTUNITY, RECOMMEND, or CONNECT systems — and it never decides.
 *
 * Honest by construction (no LLM, no autonomy, fully deterministic — same inputs, same observations):
 *   • Every observation fires ONLY when its real condition holds — warnings appear only on genuine gaps, never
 *     fabricated.
 *   • Recommendations point ONLY to live, usable actions — the Seer never recommends a capability that is not built.
 *   • Severity mirrors lib/seer/merchantAdvisor's vocabulary ('good' | 'info' | 'watch' | 'concern') for one
 *     consistent Seer voice across surfaces.
 */
import type { DomainId } from '@/lib/headquarters/model';

export type ObservationKind = 'explain' | 'teach' | 'warn' | 'opportunity' | 'recommend' | 'connect';
export type Severity = 'good' | 'info' | 'watch' | 'concern';
export type ContinuityReadiness = 'protected' | 'partial' | 'incomplete' | 'unknown';

export interface SeerInputs {
  isConnected: boolean;
  proofScore: number | null;
  continuityReadiness: ContinuityReadiness;
  merchantActive: boolean;
  configured: string[]; // capability ids the participant has set up
}

export interface SeerObservation {
  id: string;
  kind: ObservationKind;
  domain: DomainId | 'cross';
  severity: Severity;
  title: string;   // plain language, the participant's side of the screen
  detail: string;
  action?: { label: string; href: string }; // always a live, usable destination
  priority: number; // higher = surfaced first
}

const SEVERITY_RANK: Record<Severity, number> = { concern: 3, watch: 2, info: 1, good: 0 };

const obs = (
  id: string, kind: ObservationKind, domain: DomainId | 'cross', severity: Severity,
  title: string, detail: string, action?: { label: string; href: string },
): SeerObservation => ({ id, kind, domain, severity, title, detail, action, priority: SEVERITY_RANK[severity] });

/**
 * Derive the Seer's observations from real state. Deterministic and honest: each branch is guarded by the actual
 * condition, so nothing is invented.
 */
export function deriveObservations(i: SeerInputs): SeerObservation[] {
  if (!i.isConnected) {
    return [obs('connect', 'teach', 'cross', 'info',
      'Connect to see your briefing',
      'Once your wallet is connected, the Seer reads your real ownership, trust, and commerce state and surfaces what matters.')];
  }

  const out: SeerObservation[] = [];

  // ── Ownership / continuity ──
  if (i.continuityReadiness === 'incomplete') {
    out.push(obs('own-gap', 'warn', 'ownership', 'concern',
      'Your protection has a gap',
      'Your continuity plan is not set up yet. If you lost your device, your assets could be hard to reach. Setting up a vault and naming a guardian closes this.',
      { label: 'Set up continuity', href: '/continuity' }));
  } else if (i.continuityReadiness === 'partial') {
    out.push(obs('own-partial', 'recommend', 'ownership', 'watch',
      'A few protections are still open',
      'You have made a start. Finishing recovery, guardians, and inheritance makes your protection complete.',
      { label: 'Finish setup', href: '/continuity' }));
  } else if (i.continuityReadiness === 'protected') {
    out.push(obs('own-good', 'explain', 'ownership', 'good',
      'Your protection is in place',
      'Your vault, recovery, and inheritance are set up and active. The Seer will flag anything that changes that.'));
  }

  // ── Trust / ProofScore ──
  if (i.proofScore === null) {
    out.push(obs('trust-teach', 'teach', 'trust', 'info',
      'How your ProofScore works',
      'Your ProofScore is your trust, earned from real outcomes — completed payments, fulfilled orders, honored agreements. It is never bought.',
      { label: 'See ProofScore', href: '/proofscore' }));
  } else if (i.proofScore < 4000) {
    out.push(obs('trust-build', 'recommend', 'trust', 'watch',
      'Build your trust to lower your fees',
      'Each completed and honored transaction raises your ProofScore — and a higher score means lower fees on every payment.',
      { label: 'See ProofScore', href: '/proofscore' }));
  } else if (i.proofScore >= 8000) {
    out.push(obs('trust-strong', 'explain', 'trust', 'good',
      'Your trust earns you the lowest fees',
      'Your ProofScore is strong, which puts you at the lowest fee tier on the network.'));
    out.push(obs('trust-fee-connect', 'connect', 'cross', 'info',
      'Trust and cost are linked',
      'Your ProofScore directly sets your transaction fee — building trust is also how you pay less.'));
  } else {
    out.push(obs('trust-solid', 'explain', 'trust', 'info',
      'Your trust is solid and improving',
      'Your ProofScore is in good standing and rises with each honored transaction.'));
  }

  // ── Always-on teaching connect (a core reassurance) ──
  out.push(obs('guardian-teach', 'teach', 'cross', 'info',
    'Guardians help you recover — never control your funds',
    'The people you name as guardians can help you regain access if you lose your device. They can never move or take your assets.'));

  // ── Business ──
  if (i.merchantActive) {
    out.push(obs('biz-grow', 'opportunity', 'business', 'info',
      'Keep your fulfillment strong to grow',
      'Your discovery in the marketplace rises with real outcomes — fulfilled orders and a healthy ProofScore. Consistent delivery compounds.',
      { label: 'See analytics', href: '/merchant/analytics' }));
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/** Observations scoped to a single headquarters (plus cross-cutting ones that touch it). */
export function observationsForDomain(i: SeerInputs, domain: DomainId): SeerObservation[] {
  return deriveObservations(i).filter((o) => o.domain === domain || o.domain === 'cross');
}
