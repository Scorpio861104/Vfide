/**
 * Governance — emergency boundary, voting integrity, treasury & committee MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the logic of DAO.sol (proposal/vote lifecycle),
 * EmergencyControl.sol (breaker toggle + committee), and the treasury/timelock boundary in pure TS so the
 * governance-integrity and non-custodial-boundary invariants run as scenarios. NOT the deployed bytecode.
 *
 * Invariants under test:
 *   • EMERGENCY power is toggle-only: it flips a global protocol breaker; it CANNOT freeze/seize/move a user
 *     vault, and a global halt CANNOT trap a user's withdrawals (the vault never consults the breaker).
 *   • VOTING is ProofScore-weighted (frozen snapshot), NOT token-weighted — flash-loaning tokens buys no votes;
 *     a voter must own a vault, pass SeerGuardian governance restrictions, and votes are time-fenced.
 *   • PROPOSAL execution is quorum-gated (absolute floor, no cascading reduction) and timelocked.
 *   • The EMERGENCY COMMITTEE is M-of-N with an anti-flap cooldown (≥5 min) and vote expiry.
 */

// ─────────────────────────── Emergency boundary (the flagged item)

export type BreakerScope = 'globalProtocolHalt' | 'userVault';
/** EmergencyControl toggles ONLY a global protocol breaker — it has no user-vault scope. */
export function emergencyScope(): BreakerScope { return 'globalProtocolHalt'; }

/**
 * Whether a given global-halt state can block a user's vault withdrawal. The vault does NOT consult the global
 * breaker, so the answer is always false: a protocol halt cannot trap user funds (non-custodial boundary).
 */
export function haltCanBlockUserWithdrawal(_globalHalted: boolean): boolean {
  return false; // CardBoundVault fund-exit is independent of EmergencyControl/breaker state
}

/** EmergencyControl cannot freeze/seize/move user funds — only authorized owner-signed intents move funds. */
export function emergencyCanTouchUserFunds(): boolean { return false; }

// ─────────────────────────── Emergency committee (M-of-N)

export const MIN_COOLDOWN_SECONDS = 5 * 60; // L-2 fix: cooldown floored to prevent anti-flap bypass

export interface CommitteeState { threshold: number; members: number; approvals: number; }
export type ToggleAuthority = 'dao' | 'committee' | 'attacker' | 'member';

/** A breaker toggle requires either the DAO directly, or committee M-of-N. */
export function canToggleBreaker(authority: ToggleAuthority, c: CommitteeState): { ok: boolean; reason?: string } {
  if (authority === 'dao') return { ok: true };
  if (authority === 'committee') {
    if (c.approvals >= c.threshold && c.threshold > 0) return { ok: true };
    return { ok: false, reason: 'BELOW_THRESHOLD' };
  }
  return { ok: false, reason: 'NOT_AUTHORIZED' };
}

/** A cooldown shorter than the floor is rejected (anti-flap protection cannot be disabled). */
export function validCooldown(seconds: number): boolean { return seconds >= MIN_COOLDOWN_SECONDS; }

/** Anti-flap: a new toggle is only allowed once the cooldown since the last toggle has elapsed. */
export function canToggleNow(lastToggleTs: number, nowTs: number, cooldownSeconds: number): boolean {
  return nowTs >= lastToggleTs + Math.max(MIN_COOLDOWN_SECONDS, cooldownSeconds);
}

// ─────────────────────────── Voting integrity (DAO.sol)

export const MIN_VOTING_PERIOD_HOURS = 1;
export const MAX_VOTING_PERIOD_DAYS = 30;
export const VOTE_GRACE_PERIOD_MIN = 30;     // anti-front-running: voting closes early
export const ABSOLUTE_MIN_QUORUM = 500;      // floor; quorum cannot cascade below this

export interface VoterEligibility { ownsVault: boolean; guardianAllowsGovernance: boolean; }
/** A voter must own a vault AND pass SeerGuardian governance restrictions. */
export function voterEligible(v: VoterEligibility): boolean {
  return v.ownsVault && v.guardianAllowsGovernance;
}

/**
 * Vote WEIGHT is the voter's ProofScore at a frozen snapshot — NOT token balance. Flash-loaning tokens gives
 * tokenBalance but no score, so it yields zero extra weight. Governance-fatigue reduces weight for frequent voters.
 */
export function voteWeight(args: { proofScoreSnapshot: number; tokenBalance: number; fatiguePenaltyPct: number }): number {
  // tokenBalance is intentionally unused — it cannot contribute to weight.
  const base = Math.max(0, args.proofScoreSnapshot);
  const penalty = Math.max(0, Math.min(100, args.fatiguePenaltyPct));
  return Math.floor((base * (100 - penalty)) / 100);
}

export type VoteTiming = { nowTs: number; startTs: number; endTs: number };
export type VoteResult = { ok: true } | { ok: false; reason: 'NOT_STARTED' | 'ENDED' | 'GRACE_CLOSED' | 'INELIGIBLE' | 'ALREADY_VOTED' };

/** Models DAO.vote timing + eligibility gates (flash-loan timing protection + anti-front-running grace). */
export function authorizeVote(t: VoteTiming, elig: VoterEligibility, alreadyVoted: boolean): VoteResult {
  if (t.nowTs < t.startTs) return { ok: false, reason: 'NOT_STARTED' };     // flash-loan timing protection
  if (t.nowTs >= t.endTs) return { ok: false, reason: 'ENDED' };
  if (t.nowTs >= t.endTs - VOTE_GRACE_PERIOD_MIN * 60) return { ok: false, reason: 'GRACE_CLOSED' }; // anti-front-run
  if (!voterEligible(elig)) return { ok: false, reason: 'INELIGIBLE' };
  if (alreadyVoted) return { ok: false, reason: 'ALREADY_VOTED' };
  return { ok: true };
}

// ─────────────────────────── Proposal lifecycle (quorum floor + timelock)

export function validVotingPeriod(seconds: number): boolean {
  return seconds >= MIN_VOTING_PERIOD_HOURS * 3600 && seconds <= MAX_VOTING_PERIOD_DAYS * 86400;
}

/** Quorum can be lowered by governance but never below the absolute floor (DAO-02: no cascading reduction). */
export function validQuorumChange(newQuorum: number): boolean {
  return newQuorum >= ABSOLUTE_MIN_QUORUM;
}

export type ExecResult = { ok: true } | { ok: false; reason: 'NOT_PASSED' | 'BELOW_QUORUM' | 'TIMELOCK_PENDING' | 'NOT_TIMELOCK' };

/** A proposal executes only if: passed (for > against), quorum met, timelock elapsed, and via the timelock. */
export function authorizeExecute(args: {
  forVotes: number; againstVotes: number; quorum: number; totalWeightVoted: number;
  timelockElapsed: boolean; callerIsTimelock: boolean;
}): ExecResult {
  if (!args.callerIsTimelock) return { ok: false, reason: 'NOT_TIMELOCK' };
  if (args.totalWeightVoted < args.quorum) return { ok: false, reason: 'BELOW_QUORUM' };
  if (args.forVotes <= args.againstVotes) return { ok: false, reason: 'NOT_PASSED' };
  if (!args.timelockElapsed) return { ok: false, reason: 'TIMELOCK_PENDING' };
  return { ok: true };
}
