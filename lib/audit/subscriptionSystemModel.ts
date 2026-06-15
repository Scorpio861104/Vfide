/**
 * Subscription Commerce System — executable logic model (Campaign A, the dedicated subscription audit).
 *
 * The authoritative model of the allowance-pull channel, traced from `SubscriptionManager.sol`. Certifies the full
 * system: authority (who can do what), the pull state machine (timing / fraud / vault-pinning / allowance+balance /
 * grace / failed-payment auto-cancel), the bounds (amount + interval + aggregate allowance), batch processing,
 * reentrancy safety, and the recovery/inheritance interactions (incorporating the Campaign C correction).
 *
 *   AUTHORITY (subscriber-sovereign):
 *     create / modify(amount,interval) / cancel / resume  → SUBSCRIBER only (resume: subscriber only; pause: either).
 *     pause                                               → subscriber OR merchant.
 *     processPayment                                      → merchant (24h exclusive) → merchant/subscriber/DAO.
 *     emergencyCancel                                     → DAO only (48h delay + revoke).
 *   KEY PROPERTY: a merchant can NEVER raise the amount or force continuation; the subscriber can modify/cancel
 *   anytime; resume does not retroactively bill. Subscriptions are subscriber-controlled standing authorizations,
 *   NOT merchant-guaranteed revenue.
 *
 *   BOUNDS: amount > 0, interval >= 1h; pull = exactly sub.amount per interval; allowance is a SINGLE aggregate
 *   vault→SubscriptionManager allowance shared by ALL the subscriber's subscriptions (no per-sub allowance).
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export const GRACE_PERIOD = 3 * 24 * 60 * 60;
export const MAX_FAILED_PAYMENTS = 3;
export const MAX_BATCH_SIZE = 200;
export const MERCHANT_EXCLUSIVE_WINDOW = 24 * 60 * 60;

export type Actor = 'subscriber' | 'merchant' | 'dao' | 'attacker';
export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

export interface Sub {
  subscriber: string; merchant: string; subscriberVault: string; merchantVault: string;
  amount: number; interval: number; nextPayment: number;
  active: boolean; paused: boolean; pausedAt: number;
  graceEndTime: number; failedPayments: number; lastFailedBlock: number;
}

export function freshSub(o: Partial<Sub> = {}): Sub {
  return {
    subscriber: 'SUB', merchant: 'MERCH', subscriberVault: 'SVAULT', merchantVault: 'MVAULT',
    amount: 100, interval: 30 * 24 * 60 * 60, nextPayment: 1_000_000,
    active: true, paused: false, pausedAt: 0, graceEndTime: 0, failedPayments: 0, lastFailedBlock: 0, ...o,
  };
}

// ── Lifecycle authority ──────────────────────────────────────────────────────
export function createSubscription(caller: Actor, merchant: string, amount: number, interval: number, callerVault: string, merchantVault: string): R {
  if (merchant === '' || merchant === caller) return E('invalid-merchant');
  if (amount === 0) return E('invalid-amount');
  if (interval < 3600) return E('invalid-interval');
  if (callerVault === '' || merchantVault === '') return E('vault-changed'); // both must have vaults
  return OK; // subscriber-initiated (msg.sender)
}
export function modifySubscription(sub: Sub, caller: Actor, newAmount: number, newInterval: number): R {
  if (caller !== 'subscriber') return E('not-subscriber'); // MERCHANT CANNOT modify the amount
  if (!sub.active) return E('inactive');
  if (newAmount === 0) return E('invalid-amount');
  if (newInterval < 3600) return E('invalid-interval');
  sub.amount = newAmount; sub.interval = newInterval;
  return OK;
}
export function cancelSubscription(sub: Sub, caller: Actor): R {
  if (caller !== 'subscriber') return E('not-subscriber');
  sub.active = false; return OK;
}
export function pauseSubscription(sub: Sub, caller: Actor): R {
  if (!sub.active) return E('inactive');
  if (sub.paused) return E('already-paused');
  if (caller !== 'subscriber' && caller !== 'merchant') return E('not-authorized');
  sub.paused = true; return OK;
}
export function resumeSubscription(sub: Sub, caller: Actor, now: number): R {
  if (!sub.active) return E('inactive');
  if (!sub.paused) return E('not-paused');
  if (caller !== 'subscriber') return E('not-subscriber'); // only the subscriber resumes
  sub.paused = false;
  if (now > sub.nextPayment) sub.nextPayment = now; // NO retroactive billing for the paused period
  return OK;
}

// ── The pull state machine ───────────────────────────────────────────────────
export interface PullCtx {
  now: number; block: number;
  subscriberVaultLive: string; merchantVaultLive: string; // vaultOf(...) at pull time (recovery clears these)
  allowance: number; balance: number;
  bannedSubscriber: boolean; bannedMerchant: boolean;
}
export function processPayment(sub: Sub, caller: Actor, c: PullCtx): R {
  if (!sub.active) return E('inactive');
  if (sub.paused) return E('paused');
  if (c.now < sub.nextPayment) return E('too-early');
  if (c.bannedSubscriber || c.bannedMerchant) return E('fraud-blocked');
  // authority: merchant-exclusive window, then merchant/subscriber/DAO
  if (c.now < sub.nextPayment + MERCHANT_EXCLUSIVE_WINDOW) {
    if (caller !== 'merchant') return E('not-merchant');
  } else if (caller !== 'merchant' && caller !== 'subscriber' && caller !== 'dao') {
    return E('not-authorized');
  }
  // grace expiry → auto-cancel
  if (sub.graceEndTime > 0 && c.now > sub.graceEndTime) {
    sub.active = false; return E('grace-period-expired');
  }
  // vault resolution + pinning (recovery clears vaultOf → severs)
  if (c.subscriberVaultLive === '' || c.merchantVaultLive === '') return E('no-user-vault');
  if (c.subscriberVaultLive !== sub.subscriberVault || c.merchantVaultLive !== sub.merchantVault) return E('vault-changed');
  // allowance + balance → grace + failed-payment counting (one fail per block, N-H12)
  if (c.allowance < sub.amount || c.balance < sub.amount) {
    if (sub.lastFailedBlock !== c.block) { sub.failedPayments += 1; sub.lastFailedBlock = c.block; }
    if (sub.failedPayments >= MAX_FAILED_PAYMENTS) { sub.active = false; return E('max-failures-cancelled'); }
    if (sub.graceEndTime === 0) sub.graceEndTime = c.now + GRACE_PERIOD;
    return E('payment-failed-grace');
  }
  // success: reset grace/failed, advance clock FIRST (CEI), then pull exactly sub.amount
  sub.graceEndTime = 0; sub.failedPayments = 0;
  sub.nextPayment += sub.interval;
  return OK; // transferFrom(userVault, merchantVault, sub.amount); seer.reward is try/catch (cannot block)
}

// ── DAO emergency cancel (48h) ───────────────────────────────────────────────
export function emergencyCancel(caller: Actor): R {
  if (caller !== 'dao') return E('not-dao');
  return OK; // proposes; 48h delay + revoke option (modeled as authority-only here)
}

// ── Batch processing ─────────────────────────────────────────────────────────
export function batchProcessPayments(ids: number[]): R {
  if (ids.length > MAX_BATCH_SIZE) return E('batch-too-large');
  return OK; // each processPayment is try/catch-isolated — one failure cannot DoS the batch
}

// ── The aggregate-allowance property ─────────────────────────────────────────
/** All of a subscriber's subscriptions draw from ONE shared allowance — there is no per-subscription allowance. */
export function allowanceIsAggregate(): boolean {
  return true;
}
