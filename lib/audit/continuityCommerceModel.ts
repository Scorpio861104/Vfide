/**
 * Continuity ↔ Commerce Interaction — executable logic model (OC campaign, Capability 7).
 *
 * Ties the Continuity machinery (inheritance state machine, recovery, proof-of-life) to the commerce layer's TWO
 * spending channels. Ground truth traced from `CardBoundVault.sol` (_requireOperationalForOutboundTransfers,
 * withdrawFinalHeirPayout, executeRecoveryRotation), `CardBoundVaultInheritanceManager.sol`
 * (initiateInheritanceClaim, cancelClaimForRecovery), and `SubscriptionManager.sol`
 * (processPayment, settleByInheritance):
 *
 *   • Inheritance distributes the VAULT's assets (consumeHeirPayout → safeTransfer to the heir's vault). The
 *     activeWallet holds NO assets, so there are no separate "wallet assets" to inherit.
 *   • Inheritance is REACTIVE/guardian-gated: a guardian (not the DAO guardian) initiates a claim at any time
 *     (no inactivity requirement); the owner vetoes within the veto window. Spending does NOT refresh proof-of-life.
 *   • The continuity freezes fully govern the DIRECT channel but only PARTIALLY govern the SUBSCRIPTION channel:
 *       - Direct spend: BLOCKED the moment inheritance starts (state != NORMAL).
 *       - Subscription pull: continues through VETO + CLAIM; cancellable only at MEMORIAL (settleByInheritance).
 *       - Recovery: cancels the inheritance claim + clears queues (direct), but does NOT revoke the allowance (sub).
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export enum InhState { NORMAL = 0, VETO = 1, CLAIM = 2, MEMORIAL = 3 }

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

// ── Direct channel under continuity states ───────────────────────────────────
/** Direct spend is operational ONLY in NORMAL state (the inheritance freeze). */
export function directSpendUnderContinuity(state: InhState): R {
  if (state !== InhState.NORMAL) return E('inheritance-active'); // _requireOperationalForOutboundTransfers
  return OK;
}

// ── Subscription channel under continuity states ─────────────────────────────
/** A subscription pull does NOT consult the vault's inheritance state — it continues until settled. */
export function subscriptionPullUnderContinuity(state: InhState, settled: boolean): R {
  if (settled) return E('inactive'); // settleByInheritance flipped active=false
  // NOTE: no inheritance-state gate here — pulls proceed in VETO and CLAIM (the documented asymmetry)
  return OK;
}

/** settleByInheritance cancels a subscription ONLY when a party is in MEMORIAL state. */
export function settleByInheritance(state: InhState): R {
  if (state !== InhState.MEMORIAL) return E('not-inheritance-active'); // requires isInMemorialState
  return OK; // sub.active = false
}

// ── Inheritance distribution: vault assets only ──────────────────────────────
export interface InheritancePayout {
  vaultBalance: number;
  walletBalance: number; // always 0 — nothing to inherit here
}
/** Heir payout draws from the VAULT balance; the wallet holds nothing. */
export function heirPayout(p: InheritancePayout, amount: number): { fromVault: number; fromWallet: number } {
  p.vaultBalance -= amount;
  return { fromVault: amount, fromWallet: 0 };
}

// ── Inheritance initiation: guardian-gated, reactive (no inactivity / heartbeat) ──
export type InhActor = 'guardian' | 'daoGuardian' | 'owner' | 'attacker';
export interface InitiationCtx {
  state: InhState;
  heirCount: number;
  pendingRecovery: boolean;
}
export function initiateInheritance(ctx: InitiationCtx, actor: InhActor): R {
  if (ctx.state !== InhState.NORMAL) return E('wrong-state');
  if (ctx.heirCount === 0) return E('no-heirs');
  if (ctx.pendingRecovery) return E('recovery-in-progress');
  if (actor === 'daoGuardian') return E('dao-cannot-initiate'); // Decision 12
  if (actor !== 'guardian') return E('not-guardian');
  return OK; // → VETO_PERIOD. No inactivity requirement; spending is irrelevant to initiation.
}

/** Does spending refresh proof-of-life? NO — VFIDE proof-of-life is veto-based, not a heartbeat. */
export function spendingRefreshesProofOfLife(): boolean {
  return false;
}

// ── Recovery interaction ─────────────────────────────────────────────────────
export interface RecoveryContinuityState {
  inhState: InhState;
  queueCleared: boolean;
  subscriptionAllowance: number;
}
/** Recovery cancels the inheritance claim + clears the direct queue, but does NOT revoke the subscription allowance. */
export function recoveryUnderContinuity(s: RecoveryContinuityState): { claimCancelled: boolean; queueCleared: boolean; allowanceRevoked: boolean } {
  s.inhState = InhState.NORMAL; // cancelClaimForRecovery
  s.queueCleared = true; // clearOnRecovery
  // s.subscriptionAllowance UNCHANGED (the cross-channel gap, consistent with Audit 3)
  return { claimCancelled: true, queueCleared: true, allowanceRevoked: false };
}
