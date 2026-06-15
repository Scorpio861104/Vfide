/**
 * Milestone acceptance engine (Professional Services Operations — Phase 2).
 *
 * Pure, side-effect-free state-machine logic for the per-milestone acceptance lifecycle, so the subjective-
 * acceptance rules (client accept / reasoned reject / SILENCE = acceptance auto-release) are testable
 * independent of the DB, the route, and the chain.
 *
 * On-chain truth = the linked CommerceEscrow (one escrow per milestone, whole-amount single-shot). This layer
 * sequences the escrow and decides WHEN a release/dispute is warranted; it does not itself move funds.
 *
 * BLOCKCHAIN BOUNDARY (honest): server code cannot sign the client's on-chain release()/dispute()/fund()
 * transactions — those require the client's wallet. This engine produces the DECISION + the escrow action that
 * the client's wallet (or a DAO/relayer/settleByInheritance path for an absent party) must execute. The DB
 * status reflects the orchestration decision; `escrow_action` names the chain call that realizes it.
 */

export type MilestoneStatus =
  | 'draft' | 'defined' | 'funded' | 'submitted' | 'accepted' | 'released'
  | 'in_dispute' | 'refunded' | 'cancelled';

export type EscrowAction = 'none' | 'fund' | 'release' | 'dispute' | 'refund';

/** Valid forward transitions for the milestone state machine (spec §4). */
const TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  draft:      ['defined', 'cancelled'],
  defined:    ['funded', 'cancelled'],
  funded:     ['submitted', 'cancelled', 'refunded'],
  submitted:  ['accepted', 'in_dispute'],          // accept (client/silence) or reject (→ dispute)
  accepted:   ['released'],                          // acceptance decided → escrow release is due
  released:   [],                                    // terminal (paid)
  in_dispute: ['released', 'refunded'],              // DAO resolve(buyerWins) → refund; else release
  refunded:   [],                                    // terminal (returned)
  cancelled:  [],                                    // terminal
};

export function canTransition(from: MilestoneStatus, to: MilestoneStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export interface MilestoneView {
  status: MilestoneStatus;
  escrow_id: number | null;
  acceptance_deadline: string | null; // ISO; set at submission
}

export type MilestoneRejection =
  | 'NOT_FUNDED' | 'NOT_SUBMITTED' | 'ALREADY_DECIDED' | 'NO_ESCROW' | 'INVALID_TRANSITION';

/** A milestone can be funded only from `defined` and only once (no existing escrow). */
export function canFund(m: MilestoneView): { ok: true } | { ok: false; reason: MilestoneRejection } {
  if (m.status !== 'defined') return { ok: false, reason: 'INVALID_TRANSITION' };
  if (m.escrow_id != null) return { ok: false, reason: 'ALREADY_DECIDED' };
  return { ok: true };
}

/** Provider may submit a deliverable only when the milestone is funded (escrow exists). */
export function canSubmit(m: MilestoneView): { ok: true } | { ok: false; reason: MilestoneRejection } {
  if (m.escrow_id == null) return { ok: false, reason: 'NO_ESCROW' };
  if (m.status !== 'funded' && m.status !== 'submitted') return { ok: false, reason: 'NOT_FUNDED' };
  return { ok: true };
}

/** Compute the acceptance deadline (ms epoch) from a submission time + the engagement's window. */
export function acceptanceDeadline(submittedAtMs: number, windowSecs: number): number {
  return submittedAtMs + Math.max(0, windowSecs) * 1000;
}

/**
 * Client acceptance decision. Acceptance is valid only from `submitted`. Returns the escrow action the client's
 * wallet must execute (`release`). Acceptance is the orchestration decision; the chain release realizes it.
 */
export function decideAccept(m: MilestoneView): { ok: true; next: MilestoneStatus; escrow_action: EscrowAction } | { ok: false; reason: MilestoneRejection } {
  if (m.status !== 'submitted') return { ok: false, reason: 'NOT_SUBMITTED' };
  if (m.escrow_id == null) return { ok: false, reason: 'NO_ESCROW' };
  return { ok: true, next: 'accepted', escrow_action: 'release' };
}

/** Client rejection with a reason → opens a milestone-scoped dispute on the escrow. */
export function decideReject(m: MilestoneView, reason: string): { ok: true; next: MilestoneStatus; escrow_action: EscrowAction } | { ok: false; reason: MilestoneRejection } {
  if (m.status !== 'submitted') return { ok: false, reason: 'NOT_SUBMITTED' };
  if (m.escrow_id == null) return { ok: false, reason: 'NO_ESCROW' };
  if (!reason || reason.trim().length === 0) return { ok: false, reason: 'INVALID_TRANSITION' }; // a reasoned reject requires a reason
  return { ok: true, next: 'in_dispute', escrow_action: 'dispute' };
}

/**
 * SILENCE = ACCEPTANCE. The auto-release keeper calls this for each `submitted` milestone: if the acceptance
 * window has elapsed with no client decision, the milestone auto-accepts (and release becomes due). Returns
 * null when not yet due (so the keeper skips it).
 */
export function autoAcceptIfElapsed(m: MilestoneView, nowMs: number): { next: MilestoneStatus; escrow_action: EscrowAction; auto: true } | null {
  if (m.status !== 'submitted') return null;
  if (m.escrow_id == null) return null;
  if (!m.acceptance_deadline) return null;
  if (new Date(m.acceptance_deadline).getTime() > nowMs) return null; // window not elapsed
  return { next: 'accepted', escrow_action: 'release', auto: true };
}

/** An engagement completes when every (non-cancelled) milestone is released. */
export function engagementComplete(milestoneStatuses: MilestoneStatus[]): boolean {
  const active = milestoneStatuses.filter((s) => s !== 'cancelled');
  return active.length > 0 && active.every((s) => s === 'released');
}
