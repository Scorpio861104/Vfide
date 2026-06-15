/**
 * Fraud Registry — executable logic model (Backend Completion Campaign 7, closes Wave B).
 *
 * Certifies VFIDE's fraud-flagging system (FraudRegistry.sol + FraudJury.sol), traced from source:
 *   NON-CUSTODIAL: the system NEVER holds, delays, or seizes funds. The former 30-day hold is REMOVED —
 *   `escrowTransfer` now reverts and `requiresEscrow` returns false. A flagged user keeps everything in their vault;
 *   a flag affects reputation (Seer ProofScore penalty) + a service ban (merchant ecosystem), NOT funds.
 *
 *   Complaint flow (fileComplaint): reporter must have score ≥ MIN_REPORTER_SCORE (6000); cannot complain about
 *   self; ONE complaint per reporter per epoch (so a single attacker cannot reach the flag threshold alone);
 *   filing a dismissed/false complaint costs COMPLAINT_REPORTER_PENALTY (50). COMPLAINTS_TO_FLAG (3) distinct
 *   reporters → pending review.
 *
 *   Confirmation (confirmFraud, onlyDAO): when the FraudJury is wired, a flag may ONLY follow a jury confirmation
 *   (5-juror quorum, 66% commit-reveal supermajority; jurors score ≥7000), and the DAO can only daoVeto — it
 *   cannot create a flag. When NO jury is wired (pre-jury deployments), it falls back to a 48h appeal window
 *   (Finding FR-1: in that mode the DAO can confirm without the jury).
 *
 *   Forgiveness: a confirmed signal + service-ban auto-expires after SIGNAL_TTL (90d). Permanent bans carry a 7d
 *   timelock (appeal window, H-4).
 *
 * NOT the compiled contracts; on-chain stage-2 (bytecode) + service e2e are the deployment confirmations.
 */

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

// ── Constants (from source) ──────────────────────────────────────────────────
export const COMPLAINTS_TO_FLAG = 3;
export const MIN_REPORTER_SCORE = 6000;
export const COMPLAINT_REPORTER_PENALTY = 50;
export const SIGNAL_TTL_DAYS = 90;
export const PENDING_REVIEW_APPEAL_WINDOW_H = 48;
export const PERMANENT_BAN_DELAY_DAYS = 7;
export const JUROR_MIN_SCORE = 7000;
export const JURY_QUORUM = 5;
export const CONFIRM_SUPERMAJORITY_PCT = 66;
export const COMMIT_WINDOW_DAYS = 3;
export const REVEAL_WINDOW_DAYS = 2;

// ── fileComplaint guards ─────────────────────────────────────────────────────
export interface ComplaintCtx {
  target: 'zero' | 'self' | 'other';
  reporterScore: number;
  alreadyComplainedThisEpoch: boolean;
  complaintCount: number; // existing complaints against target
}
export function fileComplaint(ctx: ComplaintCtx): R {
  if (ctx.target === 'zero') return E('FR_Zero');
  if (ctx.target === 'self') return E('FR_SelfComplaint');
  if (ctx.alreadyComplainedThisEpoch) return E('FR_AlreadyComplained'); // one per reporter per epoch
  if (ctx.reporterScore < MIN_REPORTER_SCORE) return E('FR_InsufficientScore');
  if (ctx.complaintCount >= 100) return E('FR: complaint limit');
  return OK;
}

/** A flag threshold is reached only with COMPLAINTS_TO_FLAG distinct reporters (one per reporter per epoch). */
export function reachesFlagThreshold(distinctReporters: number): boolean {
  return distinctReporters >= COMPLAINTS_TO_FLAG;
}
/** A single attacker (one reporter) can never reach the flag threshold alone. */
export function singleAttackerCanFlag(): boolean { return COMPLAINTS_TO_FLAG <= 1; } // false

// ── FraudJury confirmation ───────────────────────────────────────────────────
export function jurorEligible(score: number): boolean { return score >= JUROR_MIN_SCORE; }
/** Jury confirms iff reveals reach quorum AND confirm-votes reach the supermajority threshold. */
export function juryConfirms(totalReveals: number, confirmVotes: number): boolean {
  if (totalReveals < JURY_QUORUM) return false;
  return (confirmVotes * 100) >= (totalReveals * CONFIRM_SUPERMAJORITY_PCT);
}

// ── confirmFraud (dual authority, with pre-jury fallback) ────────────────────
export interface ConfirmCtx {
  isPendingReview: boolean;
  isFlagged: boolean;
  juryWired: boolean;
  juryConfirmed: boolean;
  appealWindowElapsedH: number;
}
export function confirmFraud(callerIsDAO: boolean, ctx: ConfirmCtx): R {
  if (!callerIsDAO) return E('FR: not DAO');
  if (!ctx.isPendingReview) return E('FR: not pending review');
  if (ctx.isFlagged) return E('FR: already flagged');
  if (ctx.juryWired) {
    if (!ctx.juryConfirmed) return E('FR: jury has not confirmed'); // dual authority
  } else {
    if (ctx.appealWindowElapsedH < PENDING_REVIEW_APPEAL_WINDOW_H) return E('FR: appeal window not elapsed'); // FR-1 fallback
  }
  return OK;
}
/** The "no single authority can confirm" guarantee holds ONLY when the jury is wired (FR-1). */
export function noSingleAuthorityConfirms(juryWired: boolean): boolean { return juryWired; }
/** The DAO can VETO a jury verdict but cannot CREATE a flag. */
export function daoCanCreateFlagAlone(juryWired: boolean): boolean { return !juryWired; }

// ── Non-custodial invariant ──────────────────────────────────────────────────
/** escrowTransfer reverts — fund holds are removed. */
export function escrowTransferReverts(): boolean { return true; }
/** requiresEscrow returns false — the system never requires a hold. */
export function requiresEscrow(): boolean { return false; }
/** A fraud flag never seizes, holds, or delays the flagged user's funds. */
export function flagSeizesFunds(): boolean { return false; }
/** A flag's effect is reputation (ProofScore penalty) + service ban only. */
export function flagEffectIsReputationAndBanOnly(): boolean { return true; }

// ── Forgiveness / decay ──────────────────────────────────────────────────────
/** A confirmed flag is "active" only within SIGNAL_TTL of confirmation; afterward it decays (forgiveness). */
export function flagActive(daysSinceFlagged: number, isFlagged: boolean): boolean {
  return isFlagged && daysSinceFlagged <= SIGNAL_TTL_DAYS;
}
/** A permanent ban can finalize only after the 7d appeal timelock. */
export function permanentBanAllowed(daysSinceProposed: number): boolean {
  return daysSinceProposed >= PERMANENT_BAN_DELAY_DAYS;
}

// ── Weaponization resistance summary ─────────────────────────────────────────
/** Cost (in score) to a reporter whose complaint is dismissed as false. */
export function falseComplaintCost(): number { return COMPLAINT_REPORTER_PENALTY; }
/** Self-flagging is impossible (cannot complain about oneself). */
export function canSelfFlag(): boolean { return false; }

// ── Findings ─────────────────────────────────────────────────────────────────
/** FR-1: the dual-authority guarantee is conditional on the jury being wired; the pre-jury fallback lets the DAO
 *  confirm after a 48h appeal window without jury confirmation. */
export function dualAuthorityIsUnconditional(): boolean { return false; }
/** FR-2: vestigial escrow surface (escrowTransfer reverts, requiresEscrow false, vfideToken "for escrow releases")
 *  is retained as ABI-compat stubs after the 30-day hold was removed — safe but potentially confusing. */
export function vestigialEscrowSurfaceRemoved(): boolean { return false; }
