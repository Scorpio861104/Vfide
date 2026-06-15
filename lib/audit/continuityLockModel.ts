/**
 * Continuity Lock — executable logic model (Backend Completion Campaign 12, Wave E — BUILT this campaign).
 *
 * Mirrors contracts/vault/ContinuityLock.sol. The lock makes the inheritance hand-off complete DETERMINISTICALLY
 * once the owner's veto window has passed on an active claim, so a compromised owner key cannot STALL (repeatedly
 * cancel) or HIJACK (redirect config) the heirs — while a genuinely-returning owner, corroborated by a guardian
 * quorum, can still reclaim. It locks PROCESS, never FUNDS.
 *
 * States mirror CardBoundVaultInheritanceManager: NORMAL(0) → VETO_PERIOD(1) → CLAIM_WINDOW(2) → MEMORIAL(3).
 * The lock is engaged exactly during an active, non-finalized CLAIM_WINDOW that has not been owner-reclaimed.
 *
 * NOT the compiled contract; on-chain stage-2 (bytecode) + the manager integration are the deployment confirmations.
 */

export const STATE_NORMAL = 0;
export const STATE_VETO_PERIOD = 1;
export const STATE_CLAIM_WINDOW = 2;
export const STATE_MEMORIAL = 3;
export const INHERITANCE_VETO_PERIOD_DAYS = 30;

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

export interface LockInputs {
  state: number;
  distributionFinalized: boolean;
  ownerReclaimed: boolean; // a guardian-corroborated owner reclaim completed for this claim
}

// ── Core: is the lock engaged? (deterministic) ───────────────────────────────
export function isLocked(i: LockInputs): boolean {
  if (i.state !== STATE_CLAIM_WINDOW) return false; // NORMAL / VETO / MEMORIAL → never locked
  if (i.distributionFinalized) return false;        // already completed
  if (i.ownerReclaimed) return false;               // legitimate owner escape completed
  return true;
}

// ── Guards (mirror the require* helpers) ─────────────────────────────────────
/** Config changes (propose/confirm/clear) are forbidden while locked (anti-hijack). */
export function configChangeAllowed(i: LockInputs): R {
  return isLocked(i) ? E('CL_Locked') : OK;
}
/** A lone-key owner override is forbidden while locked (anti-stall); always allowed during the veto window. */
export function loneOwnerOverrideAllowed(i: LockInputs): R {
  return isLocked(i) ? E('CL_Locked') : OK;
}
/** Heir claims + finalize are NEVER blocked by the lock — the lock exists to let them complete. */
export function heirProgressAllowedWhileLocked(): boolean { return true; }

// ── Guardian-corroborated owner reclaim (the living-owner escape) ────────────
export interface ReclaimState { votes: Set<string> }
export function newReclaimState(): ReclaimState { return { votes: new Set() }; }

export function castGuardianReclaimVote(rs: ReclaimState, guardian: string, callerIsGuardian: boolean, i: LockInputs): R {
  if (!isLocked(i)) return E('CL_NotLocked');     // only meaningful while locked
  if (!callerIsGuardian) return E('CL_NotGuardian');
  if (rs.votes.has(guardian)) return E('CL_AlreadyVoted');
  rs.votes.add(guardian);
  return OK;
}
export function checkGuardianCorroboratedReclaim(rs: ReclaimState, guardianThreshold: number, i: LockInputs): R {
  if (!isLocked(i)) return E('CL_NotLocked');
  if (rs.votes.size < guardianThreshold) return E('CL_QuorumNotReached');
  return OK;
}

// ── Non-custodial invariants (by construction) ───────────────────────────────
/** The lock never holds, moves, or seizes funds. */
export function lockMovesFunds(): boolean { return false; }
export function lockSeizesFunds(): boolean { return false; }
/** The lock NEVER engages during the veto window — the owner's single-key defense is fully preserved. */
export function lockEngagesDuringVeto(): boolean {
  return isLocked({ state: STATE_VETO_PERIOD, distributionFinalized: false, ownerReclaimed: false });
}
/** A genuinely-returning owner with a guardian quorum can still reclaim post-veto. */
export function ownerCanEscapeViaGuardians(threshold: number, guardians: string[]): boolean {
  const i: LockInputs = { state: STATE_CLAIM_WINDOW, distributionFinalized: false, ownerReclaimed: false };
  const rs = newReclaimState();
  for (const g of guardians) castGuardianReclaimVote(rs, g, true, i);
  return checkGuardianCorroboratedReclaim(rs, threshold, i).ok;
}
/** A LONE key (no guardian corroboration) can never stall the heirs post-veto. */
export function loneKeyCanStall(threshold: number): boolean {
  const i: LockInputs = { state: STATE_CLAIM_WINDOW, distributionFinalized: false, ownerReclaimed: false };
  // lone key cannot cast guardian votes (not a guardian) and cannot lone-override while locked
  const rs = newReclaimState();
  const voteRejected = !castGuardianReclaimVote(rs, 'attacker', false, i).ok;
  const overrideBlocked = !loneOwnerOverrideAllowed(i).ok;
  const quorumUnreachable = !checkGuardianCorroboratedReclaim(rs, threshold, i).ok;
  return !(voteRejected && overrideBlocked && quorumUnreachable); // false = cannot stall
}
/** Config is frozen while locked (a compromised key cannot redirect heirs post-veto). */
export function configFrozenWhenLocked(): boolean {
  return !configChangeAllowed({ state: STATE_CLAIM_WINDOW, distributionFinalized: false, ownerReclaimed: false }).ok;
}
