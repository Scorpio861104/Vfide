/**
 * FraudRegistry + FraudJury — fraud-process MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the fraud accusation / jury-confirmation / consequence
 * logic in pure TS so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's
 * FraudRegistry / NonCustodialNoFreeze hardhat suites are the on-chain evidence for a compiler-equipped env.
 *
 * The fraud surface is where the non-custodial invariant is most tempting to violate — "punish the fraudster by
 * taking their funds." VFIDE does NOT. This model encodes the actual design:
 *
 *   • NON-CUSTODIAL CONSEQUENCE: a confirmed fraud flag's ONLY effects are a risk SIGNAL to counterparties, a
 *     Seer score penalty (→ higher fees), and a SERVICE ban (no merchant / pool rewards / endorsing). Funds are
 *     NEVER held, delayed, or seized — the flagged user keeps every token in their own vault. escrowTransfer is
 *     a no-op ABI stub; the 30-day hold was removed.
 *   • PEER-CONFIRMED, NOT DAO-DECREED: confirmation requires a FraudJury supermajority. The DAO can VETO a case
 *     (force Dismissed) but can NEVER confirm one — condemnation requires peer consensus; the DAO's only fraud
 *     power is mercy.
 *   • COMMIT-REVEAL JURY: votes are committed then revealed, so early votes can't anchor later ones (no
 *     bandwagoning). Confirm needs >= JURY_QUORUM (5) reveals AND >= 66% of revealed votes; otherwise Dismissed.
 *     Quorum failure => Dismissed (fail-safe to leniency — an absent jury clears the accused).
 *   • SPAM-RESISTANT ACCUSATION: reporter must have ProofScore >= MIN_REPORTER_SCORE; one complaint per
 *     reporter/target/epoch; a dismissed false complaint slashes the reporter's score, escalating for repeat
 *     offenders (the reporter bond).
 *   • FORGIVENESS: signal + service-ban auto-expire after SIGNAL_TTL (90d); restitution (make a victim whole)
 *     clears the flag early. Not a permanent scarlet letter (except explicit permanent bans).
 */

// ─────────────────────────── Accusation (spam-resistant)

export const MIN_REPORTER_SCORE = 5000;
export const COMPLAINTS_TO_FLAG = 3;
export const SIGNAL_TTL_DAYS = 90;
export const JURY_QUORUM = 5;
export const CONFIRM_SUPERMAJORITY_PCT = 66;

export type FileResult = { ok: true } | { ok: false; reason: 'SCORE_TOO_LOW' | 'DUPLICATE_THIS_EPOCH' | 'SELF_REPORT' };

/** A reporter may file iff score >= MIN_REPORTER_SCORE, not a duplicate this epoch, and not self-reporting. */
export function authorizeFileComplaint(args: {
  reporterScore: number; alreadyFiledThisEpoch: boolean; isSelf: boolean;
}): FileResult {
  if (args.isSelf) return { ok: false, reason: 'SELF_REPORT' };
  if (args.reporterScore < MIN_REPORTER_SCORE) return { ok: false, reason: 'SCORE_TOO_LOW' };
  if (args.alreadyFiledThisEpoch) return { ok: false, reason: 'DUPLICATE_THIS_EPOCH' };
  return { ok: true };
}

/** A false (dismissed) complaint slashes the reporter's score, escalating with prior dismissals (reporter bond). */
export function reporterPenalty(baseSlash: number, priorDismissals: number): number {
  return baseSlash * (priorDismissals + 1); // escalating
}

/** A target enters review once complaints reach the flag threshold. */
export function entersReview(complaintCount: number): boolean {
  return complaintCount >= COMPLAINTS_TO_FLAG;
}

// ─────────────────────────── Jury confirmation (peer supermajority, commit-reveal)

export type JuryVerdict = 'Confirmed' | 'Dismissed';

/**
 * Jury outcome from revealed votes. Confirm requires quorum AND a >=66% confirm share of REVEALED votes; any
 * quorum shortfall (or sub-supermajority) yields Dismissed — leniency by default.
 */
export function juryVerdict(args: { revealedTotal: number; revealedConfirm: number }): JuryVerdict {
  if (args.revealedTotal < JURY_QUORUM) return 'Dismissed'; // quorum failure → fail-safe to leniency
  const confirmPct = (args.revealedConfirm * 100) / args.revealedTotal;
  return confirmPct >= CONFIRM_SUPERMAJORITY_PCT ? 'Confirmed' : 'Dismissed';
}

/** Commit-reveal: a reveal only counts if it matches the prior commitment in the reveal window. */
export function revealCounts(args: { committed: boolean; commitmentMatches: boolean; inRevealWindow: boolean }): boolean {
  return args.committed && args.commitmentMatches && args.inRevealWindow;
}

// ─────────────────────────── DAO role: veto-only (mercy, never condemnation)

export type DaoFraudAction = 'veto' | 'confirm' | 'dismiss';

/** The DAO may dismiss/veto a case but may NEVER unilaterally confirm fraud. */
export function daoActionAllowed(action: DaoFraudAction): boolean {
  return action !== 'confirm';
}

/**
 * confirmFraud finalizes a flag. With a jury wired it REQUIRES a jury confirmation; without one it requires the
 * appeal window to elapse. It never lets the DAO confirm on its own.
 */
export type ConfirmResult = { ok: true } | { ok: false; reason: 'NOT_PENDING' | 'ALREADY_FLAGGED' | 'JURY_NOT_CONFIRMED' | 'APPEAL_WINDOW_OPEN' };
export function authorizeConfirmFraud(args: {
  isPendingReview: boolean; isFlagged: boolean;
  juryWired: boolean; juryConfirmed: boolean;
  appealWindowElapsed: boolean;
}): ConfirmResult {
  if (!args.isPendingReview) return { ok: false, reason: 'NOT_PENDING' };
  if (args.isFlagged) return { ok: false, reason: 'ALREADY_FLAGGED' };
  if (args.juryWired) {
    if (!args.juryConfirmed) return { ok: false, reason: 'JURY_NOT_CONFIRMED' };
  } else if (!args.appealWindowElapsed) {
    return { ok: false, reason: 'APPEAL_WINDOW_OPEN' };
  }
  return { ok: true };
}

// ─────────────────────────── Consequence is non-custodial

export type FlagEffect = 'risk_signal' | 'seer_score_penalty' | 'service_ban';

/** The complete set of consequences of a confirmed flag — note the ABSENCE of any fund effect. */
export function confirmedFlagEffects(): FlagEffect[] {
  return ['risk_signal', 'seer_score_penalty', 'service_ban'];
}

/** A flag NEVER holds, delays, or seizes funds. escrowTransfer is a no-op stub; transfers always settle. */
export function flagHoldsOrSeizesFunds(): boolean { return false; }
export function transferStillSettlesWhenFlagged(): boolean { return true; }

// ─────────────────────────── Forgiveness

/** A confirmed signal + service-ban auto-expires after SIGNAL_TTL (unless a permanent ban is set). */
export function flagActive(args: { confirmedAtDay: number; nowDay: number; permanentBan: boolean }): boolean {
  if (args.permanentBan) return true;
  return args.nowDay < args.confirmedAtDay + SIGNAL_TTL_DAYS;
}

/** Restitution (victim made whole, confirmed) clears the flag early. */
export function restitutionClearsFlag(restitutionConfirmed: boolean): boolean {
  return restitutionConfirmed;
}

/** rescueExcessTokens recovers only accidentally-sent tokens (no escrow is ever held) — not the accused's funds. */
export function rescueTargetsAccusedFunds(): boolean { return false; }
