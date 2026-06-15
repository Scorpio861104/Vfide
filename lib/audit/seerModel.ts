/**
 * Seer — autonomous-enforcement boundary & bounds MODEL (audit artifact).
 *
 * Seer is VFIDE's autonomous intelligence layer (scoring, ranking, pattern detection, enforcement). The audit's
 * central question: does its autonomous power stay BOUNDED, NON-CUSTODIAL, and APPEALABLE? This file models the
 * authorization/enforcement logic of SeerAutonomous.sol + the vault's _enforceSeerAction, in pure TS. The
 * market-stability ENGINES (extractionIndex, stabilityPolicy, stabilityBonding) are pure TS and are exercised
 * DIRECTLY in the matrix (stronger evidence than a model).
 *
 * Modeled facts (refs in cert):
 *  • The vault's _enforceSeerAction calls Seer to OBSERVE, then DELIBERATELY IGNORES the verdict — a vault
 *    operation (payment, withdrawal, escrow funding) is NEVER blocked. Punishment is via score→fee, never funds.
 *  • Autonomous restrictions reach PROTOCOL-PARTICIPATION actions (governance/trade/stake/endorse), never funds.
 *  • A subject can challengeRestriction; the DAO resolveChallenge; severe actions have a challenge window.
 *  • Threshold/rate-limit changes are DAO-only and timelocked (SeerPolicyGuard classes carry per-class delays).
 *  • SEER-04: a Seer hook outage must not brick vault operations (try/catch fail-open on fund movement).
 */

// ─────────────────────────── The non-custodial enforcement boundary (the crux)

export type SeerVerdict = 'Allowed' | 'Warned' | 'Delayed' | 'Blocked' | 'Penalized';
export type VaultOp = 'payment' | 'withdrawal' | 'escrowFund' | 'transfer';

/**
 * Models the vault's _enforceSeerAction: Seer is CALLED (to observe) but its verdict is IGNORED for fund
 * movement. Returns whether the vault operation proceeds. Answer is ALWAYS true regardless of verdict.
 */
export function vaultOperationProceeds(_seerVerdict: SeerVerdict, _op: VaultOp): boolean {
  return true; // verdict intentionally not enforced — funds never blocked by Seer
}

/** SEER-04: if the Seer hook reverts/outages, the vault operation still proceeds (fail-open on funds). */
export function vaultOperationOnSeerOutage(): boolean { return true; }

/** Which action types autonomous enforcement can actually restrict — protocol participation, NOT fund exit. */
export type ActionType = 'Transfer' | 'VaultDeposit' | 'VaultWithdraw' | 'GovernanceVote' | 'GovernancePropose' | 'Endorse' | 'Stake' | 'Trade';
/**
 * Whether a restriction on a given action type can block a user's own FUNDS. Even though VaultWithdraw is an
 * enumerated ActionType (Seer tracks it), the vault does not honor the verdict — so the answer is always false.
 */
export function restrictionCanBlockFunds(_action: ActionType): boolean {
  return false; // the vault ignores Seer for fund movement; restrictions bite participation/reputation only
}

// ─────────────────────────── Restriction levels (protocol participation)

export type RestrictionLevel = 'None' | 'Monitored' | 'Limited' | 'Restricted' | 'Suspended' | 'Frozen';
const LEVEL_ORDER: RestrictionLevel[] = ['None', 'Monitored', 'Limited', 'Restricted', 'Suspended', 'Frozen'];

/** A higher restriction limits more PARTICIPATION actions — but never fund withdrawal (see restrictionCanBlockFunds). */
export function participationAllowed(level: RestrictionLevel, action: ActionType): boolean {
  // fund movement is always allowed (non-custodial); participation scales with level
  if (action === 'Transfer' || action === 'VaultWithdraw' || action === 'VaultDeposit') return true;
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx <= 1) return true;                 // None/Monitored: everything allowed
  if (action === 'GovernanceVote' || action === 'GovernancePropose') return idx < 3; // blocked at Restricted+
  if (action === 'Trade' || action === 'Stake' || action === 'Endorse') return idx < 4; // blocked at Suspended+
  return idx < 5;
}

// ─────────────────────────── Challenge / appeal

export const CHALLENGE_WINDOW_DAYS = 1;
export type Challenger = 'subject' | 'dao' | 'attacker';

/** A restriction subject may file a challenge; only they can (challengeRestriction is self-only). */
export function canFileChallenge(challenger: Challenger): boolean { return challenger === 'subject'; }
/** Only the DAO can resolve a challenge (resolveChallenge is onlyDAO). */
export function canResolveChallenge(resolver: Challenger): boolean { return resolver === 'dao'; }

// ─────────────────────────── Threshold / policy bounds

/** Autonomous threshold (rate-limit) changes are DAO-only and timelocked: not applicable until executeAfter. */
export function thresholdChangeEffective(isDAO: boolean, nowTs: number, executeAfterTs: number): boolean {
  return isDAO && nowTs >= executeAfterTs;
}

export type PolicyClass = 'critical' | 'important' | 'operational';
/** SeerPolicyGuard: each policy class carries a timelock delay; a change is effective only after its delay. */
export function policyChangeEffective(cls: PolicyClass, elapsedS: number, delays: Record<PolicyClass, number>): boolean {
  return elapsedS >= delays[cls];
}
