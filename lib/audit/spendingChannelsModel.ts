/**
 * Spending Channels & Authority — executable logic model (OC campaign, Capabilities 2 & 3).
 *
 * Ground truth traced from `CardBoundVault.sol` (executePayMerchant/VaultToVault/FundEscrow, queueWithdrawal),
 * `CardBoundVaultAdminFacet.sol` (approveVFIDE), and `SubscriptionManager.sol` (processPayment). VFIDE leaves a
 * vault through TWO distinct channels with DIFFERENT authority + control models:
 *
 *   CHANNEL 1 — DIRECT SPEND (merchant pay / peer transfer / escrow fund):
 *     • Authority: ONLY a valid activeWallet SIGNATURE. Not admin, not guardian, not DAO, not an attacker.
 *     • Controls: per-tx cap, daily cap, walletEpoch binding, sequential nonce, Seer enforcement, portal mediation.
 *     • Recovery severs it: walletEpoch bump invalidates pre-signed intents; clearOnRecovery voids the queue.
 *
 *   CHANNEL 2 — SUBSCRIPTION PULL (recurring commerce):
 *     • Authority: an ERC20 ALLOWANCE set by approveVFIDE (admin-only, 7-day timelock, guardian-cancellable),
 *       then pulled via transferFrom by processPayment (merchant-exclusive window → merchant/subscriber/DAO).
 *     • Controls: allowance cap + fixed sub.amount per interval + vault-mapping pinning + grace/auto-cancel.
 *       Does NOT enforce the vault's per-tx/daily caps or walletEpoch — a DELIBERATE, DIFFERENT control surface.
 *     • Recovery does NOT auto-revoke the allowance (gap — see model + report). Operational remediation: the
 *       recovered owner revokes the allowance / cancels the subscription. A walletEpoch binding was rejected
 *       because it would also break LEGITIMATE rotations.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export type Caller = 'activeWallet' | 'admin' | 'guardian' | 'dao' | 'merchant' | 'subscriber' | 'attacker' | 'merchantPortal';

// ── Channel 1: direct spend authority ────────────────────────────────────────
export interface DirectSpendState {
  activeWallet: string;
  walletEpoch: number;
  maxPerTransfer: number;
  dailyTransferLimit: number;
  spentToday: number;
}

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

/**
 * A direct spend is authorized ONLY by an activeWallet signature, regardless of who SUBMITS the tx. The submitter
 * (merchant portal / escrow contract) is just a relay; the binding authority is `signerOfIntent === activeWallet`.
 */
export function directSpendAuthorized(s: DirectSpendState, signerOfIntent: string, intentEpoch: number, amount: number): R {
  if (intentEpoch !== s.walletEpoch) return E('invalid-epoch'); // recovery invalidates old intents
  if (amount === 0 || amount > s.maxPerTransfer) return E('transfer-limit');
  if (s.spentToday + amount > s.dailyTransferLimit) return E('daily-limit');
  if (signerOfIntent !== s.activeWallet) return E('invalid-signer'); // THE authority check
  s.spentToday += amount;
  return OK;
}

// ── Channel 2: subscription pull ─────────────────────────────────────────────
export interface Subscription {
  subscriber: string;
  merchant: string;
  subscriberVault: string;
  merchantVault: string;
  amount: number; // fixed per cycle
  interval: number;
  nextPayment: number;
  active: boolean;
  paused: boolean;
}

export interface SubChannelState {
  subscriberVaultNow: string; // current vaultOf(subscriber) — pinned against sub.subscriberVault
  allowance: number; // approveVFIDE(SubscriptionManager, amount) — admin-set, timelocked
  MERCHANT_EXCLUSIVE_WINDOW: number;
}

/** approveVFIDE authority: admin-only; (timelock + guardian-cancellation modeled in the funding audit). */
export function approveAllowanceAuthorized(caller: Caller): R {
  if (caller !== 'admin') return E('not-admin');
  return OK;
}

/**
 * processPayment authority + bounds. Pulls EXACTLY sub.amount, only when due, only by an authorized trigger,
 * only while the vault mapping is unchanged, and only within the allowance.
 */
export function subscriptionPull(
  st: SubChannelState, sub: Subscription, caller: Caller, now: number,
): R {
  if (!sub.active) return E('inactive');
  if (sub.paused) return E('paused');
  if (now < sub.nextPayment) return E('too-early'); // interval rate-bound
  // authority: merchant-exclusive window, then merchant/subscriber/DAO
  if (now < sub.nextPayment + st.MERCHANT_EXCLUSIVE_WINDOW) {
    if (caller !== 'merchant') return E('not-merchant');
  } else if (caller !== 'merchant' && caller !== 'subscriber' && caller !== 'dao') {
    return E('not-authorized');
  }
  // vault-mapping pinning (defense in depth)
  if (st.subscriberVaultNow !== sub.subscriberVault) return E('vault-changed');
  // allowance bound
  if (st.allowance < sub.amount) return E('insufficient-allowance');
  // success: pull exactly sub.amount, advance the clock
  st.allowance -= sub.amount;
  sub.nextPayment += sub.interval;
  return OK;
}

/** Recovery effect on each channel — channel 1 severed, channel 2 allowance persists (the gap). */
export function recoveryEffect(direct: DirectSpendState, sub: SubChannelState): { channel1Severed: boolean; channel2AllowanceRevoked: boolean } {
  direct.walletEpoch += 1; // invalidates channel-1 pre-signed intents
  // sub.allowance is UNCHANGED by recovery (the documented gap); subscriberVaultNow also unchanged by a
  // wallet rotation (vaultOf is keyed by owner), so vault-pinning does not auto-trigger either.
  return { channel1Severed: true, channel2AllowanceRevoked: false };
}

// ── Authority matrix helper ──────────────────────────────────────────────────
/** Who can cause VFIDE to leave the vault on the DIRECT channel? Only the activeWallet signature. */
export function canTriggerDirectSpend(signer: Caller): boolean {
  return signer === 'activeWallet';
}
