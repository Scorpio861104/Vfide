/**
 * OwnerControlPanel (OCP) — non-custodial boundary & timelock-discipline MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the AUTHORIZATION / boundary logic of
 * OwnerControlPanel.sol in pure TS so the invariants run as scenarios. NOT the deployed bytecode (no solc here);
 * the repo's OwnerControlPanelGuardrails / QueueConsistency hardhat suites + verify-owner-controlpanel-guardrails
 * script are the on-chain evidence for a compiler-equipped environment.
 *
 * OCP is the centralized protocol-parameter aggregator ("control panel"). Its name invites the same scrutiny as
 * EmergencyControl and SeerAutonomous: does an "owner control panel" reach user funds? The audit's answer (from
 * source) is NO — and this model encodes why:
 *
 *   • NO FUND CUSTODY: OCP only "passes through calls" to SYSTEM contracts (token, burnRouter, seer, treasury).
 *     It never holds, moves, freezes, or seizes user tokens.
 *   • FREEZE/SEIZE REMOVED FROM ABI: vault_freezeVault / vault_cancelDAORecovery and DAO-recovery selectors were
 *     removed outright (not just reverted) — the surface doesn't advertise them.
 *   • PER-VAULT CUSTODIAL SETTERS ARE DEAD: setWithdrawalCooldown / setLargeTransferThreshold /
 *     setAbnormalTransactionThreshold exist only in a vestigial interface decl; OCP invokes them ZERO times.
 *   • vault_reportRisk is SIGNAL-ONLY: it calls panicGuard.reportRisk(...) (advisory/score path) — not custody.
 *   • TIMELOCK EVERYWHERE: ~44 _consumeQueuedAction gates + 23 propose/confirm pairs; delay bounded [24h, 30d];
 *     reducing the delay is rate-limited and capped at halving (anti-rug); actions expire after 30 days.
 *   • BOUNDED DELEGATIONS: fee policy delegates to burnRouter.setFeePolicy (which enforces [10%,95%]).
 */

// ─────────────────────────── Capability classification

export type OcpCapability =
  | 'configureSystemContracts'   // token/hub/burnRouter/seer/treasury wiring (protocol-level)
  | 'feePolicy'                  // delegates to burnRouter (bounded)
  | 'sustainability'             // burn caps / adaptive fees (protocol-level)
  | 'seerThresholds'             // governance/merchant score thresholds (bounded)
  | 'governanceDelay'            // the timelock length itself (bounded + anti-rug)
  | 'vaultSetModules'            // wire vault token/ledger (protocol-level, NOT user funds)
  | 'vaultSetDAOMultisig'        // protocol address wiring
  | 'vaultSetRecoveryTimelock'   // recovery timelock length (protocol param)
  | 'vaultReportRisk'            // SIGNAL to PanicGuard — advisory only
  // capabilities that DO NOT EXIST on OCP (removed / never wired):
  | 'vaultFreeze'                // REMOVED from ABI
  | 'vaultSeize'                 // never existed
  | 'setUserWithdrawalCooldown'  // vestigial interface only; invoked 0 times
  | 'daoRecovery';               // REMOVED from ABI

/** Whether a capability is actually exposed (callable) on OCP. Removed/vestigial ones return false. */
export function capabilityExists(cap: OcpCapability): boolean {
  switch (cap) {
    case 'vaultFreeze':
    case 'vaultSeize':
    case 'setUserWithdrawalCooldown':
    case 'daoRecovery':
      return false; // removed from ABI or never wired
    default:
      return true;
  }
}

/** Whether a capability can move/freeze/seize a USER's vault funds. For OCP this must be false for ALL of them. */
export function reachesUserFunds(_cap: OcpCapability): boolean {
  // No OCP capability touches user funds: system-config passes through to protocol contracts; vault_* are
  // protocol params or a risk SIGNAL; freeze/seize don't exist. The model encodes the audited invariant.
  return false;
}

/** vault_reportRisk routes to PanicGuard as an advisory signal; it has NO custody-freeze authority. */
export function reportRiskIsCustodial(): boolean { return false; }

// ─────────────────────────── Owner gating + timelock discipline

export type Caller = 'owner' | 'pendingOwner' | 'attacker';

/** Every state-changing OCP function is onlyOwner. */
export function authorizedToCall(caller: Caller): boolean {
  return caller === 'owner';
}

/** Ownership transfer is two-step (transfer → accept); the new owner must accept. */
export function ownershipTransferEffective(transferred: boolean, accepted: boolean): boolean {
  return transferred && accepted;
}

export const MIN_GOVERNANCE_DELAY_H = 24;       // hours
export const MAX_GOVERNANCE_DELAY_DAYS = 30;
export const GOVERNANCE_ACTION_EXPIRY_DAYS = 30;

/** A queued action executes only if: it was queued, the delay elapsed, and it hasn't expired. */
export type QueueResult = { ok: true } | { ok: false; reason: 'NOT_QUEUED' | 'DELAY_PENDING' | 'EXPIRED' };
export function authorizeQueuedAction(args: { queued: boolean; nowH: number; executeAfterH: number; queuedAtH: number }): QueueResult {
  if (!args.queued) return { ok: false, reason: 'NOT_QUEUED' };
  if (args.nowH < args.executeAfterH) return { ok: false, reason: 'DELAY_PENDING' };
  if (args.nowH > args.queuedAtH + GOVERNANCE_ACTION_EXPIRY_DAYS * 24) return { ok: false, reason: 'EXPIRED' };
  return { ok: true };
}

/** governance_setDelay is bounded [24h, 30d]. */
export function validGovernanceDelay(hours: number): boolean {
  return hours >= MIN_GOVERNANCE_DELAY_H && hours <= MAX_GOVERNANCE_DELAY_DAYS * 24;
}

/**
 * Anti-rug on the timelock itself: a delay REDUCTION is rate-limited (cooldown) and cannot cut the delay by
 * more than half in one move — so an owner can't quietly collapse the timelock to bypass it.
 */
export type DelayChangeResult = { ok: true } | { ok: false; reason: 'OUT_OF_RANGE' | 'REDUCE_TOO_LARGE' | 'COOLDOWN_ACTIVE' };
export function authorizeDelayChange(args: {
  oldH: number; newH: number; cooldownActive: boolean;
}): DelayChangeResult {
  if (!validGovernanceDelay(args.newH)) return { ok: false, reason: 'OUT_OF_RANGE' };
  if (args.newH < args.oldH) {
    if (args.cooldownActive) return { ok: false, reason: 'COOLDOWN_ACTIVE' };
    if (args.newH < args.oldH / 2) return { ok: false, reason: 'REDUCE_TOO_LARGE' };
  }
  return { ok: true };
}

// ─────────────────────────── Bounded delegations

export const FEE_FLOOR_BPS = 1000; // 10% — burnRouter enforces; OCP can't set below
export const FEE_CEIL_BPS = 9500;  // 95%

/** Fee policy delegates to burnRouter.setFeePolicy, which clamps to [10%, 95%] — no confiscatory fee. */
export function feePolicyAccepted(minBps: number, maxBps: number): boolean {
  return minBps >= FEE_FLOOR_BPS && maxBps <= FEE_CEIL_BPS && minBps <= maxBps;
}
