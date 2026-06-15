/**
 * Spending Channels & Authority — adversarial + edge matrix (OC campaign, Capabilities 2 & 3).
 *
 * Cap 2 (who can trigger): only the activeWallet signature authorizes a direct spend; not admin/guardian/DAO/
 * attacker. Subscription pulls have their own bounded trigger set.
 * Cap 3 (spending types): direct (merchant/peer/escrow) vs subscription pull — two channels, two control models.
 * Plus the Cap-7 recovery interaction: recovery severs the direct channel but not subscription allowances.
 */
import { describe, it, expect } from '@jest/globals';
import {
  directSpendAuthorized, approveAllowanceAuthorized, subscriptionPull, recoveryEffect, canTriggerDirectSpend,
  type DirectSpendState, type SubChannelState, type Subscription, type Caller,
} from '@/lib/audit/spendingChannelsModel';

const T0 = 50_000_000;
const DAY = 24 * 60 * 60;

const freshDirect = (o: Partial<DirectSpendState> = {}): DirectSpendState => ({
  activeWallet: 'WALLET', walletEpoch: 1, maxPerTransfer: 1000, dailyTransferLimit: 3000, spentToday: 0, ...o,
});
const freshSub = (o: Partial<Subscription> = {}): Subscription => ({
  subscriber: 'USER', merchant: 'MERCH', subscriberVault: 'UVAULT', merchantVault: 'MVAULT',
  amount: 100, interval: 30 * DAY, nextPayment: T0, active: true, paused: false, ...o,
});
const freshSubState = (o: Partial<SubChannelState> = {}): SubChannelState => ({
  subscriberVaultNow: 'UVAULT', allowance: 1000, MERCHANT_EXCLUSIVE_WINDOW: DAY, ...o,
});

// ─────────────────────────────────────────────────────────────────────────────
// Cap 2 — DIRECT spend authority: ONLY the activeWallet signature
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap2: direct-spend authority is the activeWallet signature ONLY', () => {
  const callers: Caller[] = ['admin', 'guardian', 'dao', 'merchant', 'attacker', 'merchantPortal'];
  it.each(callers)('AUTH-01 %s CANNOT authorize a direct spend (only activeWallet can)', (caller) => {
    expect(canTriggerDirectSpend(caller)).toBe(false);
  });
  it('AUTH-02 only the activeWallet signature passes', () => {
    expect(canTriggerDirectSpend('activeWallet')).toBe(true);
  });
  it('AUTH-03 an intent signed by anyone but the activeWallet is rejected even if relayed by the portal', () => {
    const s = freshDirect();
    // the merchant portal SUBMITS, but the intent must be signed by the activeWallet
    expect(directSpendAuthorized(s, 'attacker', s.walletEpoch, 100)).toEqual({ ok: false, reason: 'invalid-signer' });
    expect(directSpendAuthorized(s, 'admin', s.walletEpoch, 100)).toEqual({ ok: false, reason: 'invalid-signer' });
    expect(directSpendAuthorized(s, 'WALLET', s.walletEpoch, 100).ok).toBe(true);
  });
  it('AUTH-04 a guardian cannot trigger a spend (guardians recover, they do not spend)', () => {
    const s = freshDirect();
    expect(directSpendAuthorized(s, 'guardian', s.walletEpoch, 100)).toEqual({ ok: false, reason: 'invalid-signer' });
  });
  it('AUTH-05 the DAO cannot trigger a spend from a user vault', () => {
    const s = freshDirect();
    expect(directSpendAuthorized(s, 'dao', s.walletEpoch, 100)).toEqual({ ok: false, reason: 'invalid-signer' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cap 3 — direct spend is bounded by the vault controls
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap3: direct channel is bounded by vault controls', () => {
  it('DIR-01 direct spend respects the per-tx + daily caps', () => {
    const s = freshDirect({ maxPerTransfer: 1000, dailyTransferLimit: 1500 });
    expect(directSpendAuthorized(s, 'WALLET', s.walletEpoch, 1001)).toEqual({ ok: false, reason: 'transfer-limit' });
    expect(directSpendAuthorized(s, 'WALLET', s.walletEpoch, 1000).ok).toBe(true);
    expect(directSpendAuthorized(s, 'WALLET', s.walletEpoch, 1000)).toEqual({ ok: false, reason: 'daily-limit' });
  });
  it('DIR-02 a pre-recovery signed intent is invalid after recovery (epoch)', () => {
    const s = freshDirect();
    const oldEpoch = s.walletEpoch;
    s.walletEpoch += 1; // recovery
    expect(directSpendAuthorized(s, 'WALLET', oldEpoch, 100)).toEqual({ ok: false, reason: 'invalid-epoch' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cap 3 — SUBSCRIPTION channel: distinct authority + bounds
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap3: subscription channel authority + bounds', () => {
  it('SUB-01 only the MERCHANT may trigger during the exclusive window', () => {
    const sub = freshSub(); const st = freshSubState();
    expect(subscriptionPull(st, sub, 'subscriber', T0)).toEqual({ ok: false, reason: 'not-merchant' });
    expect(subscriptionPull(st, sub, 'merchant', T0).ok).toBe(true);
  });
  it('SUB-02 after the exclusive window, merchant/subscriber/DAO may trigger; an attacker cannot', () => {
    const st = freshSubState();
    const afterWindow = T0 + st.MERCHANT_EXCLUSIVE_WINDOW + 1;
    expect(subscriptionPull(st, freshSub(), 'attacker', afterWindow)).toEqual({ ok: false, reason: 'not-authorized' });
    expect(subscriptionPull(freshSubState(), freshSub(), 'subscriber', afterWindow).ok).toBe(true);
  });
  it('SUB-03 a pull cannot happen before the interval elapses (rate bound)', () => {
    const sub = freshSub({ nextPayment: T0 + DAY }); const st = freshSubState();
    expect(subscriptionPull(st, sub, 'merchant', T0)).toEqual({ ok: false, reason: 'too-early' });
  });
  it('SUB-04 a pull transfers EXACTLY the agreed amount and advances the clock by the interval', () => {
    const sub = freshSub({ amount: 100, interval: 30 * DAY }); const st = freshSubState({ allowance: 1000 });
    subscriptionPull(st, sub, 'merchant', T0);
    expect(st.allowance).toBe(900); // pulled exactly 100
    expect(sub.nextPayment).toBe(T0 + 30 * DAY);
  });
  it('SUB-05 a pull is blocked if the subscriber vault mapping changed (vault-pinning)', () => {
    const sub = freshSub(); const st = freshSubState({ subscriberVaultNow: 'DIFFERENT_VAULT' });
    expect(subscriptionPull(st, sub, 'merchant', T0)).toEqual({ ok: false, reason: 'vault-changed' });
  });
  it('SUB-06 a pull is blocked once the allowance is exhausted', () => {
    const sub = freshSub({ amount: 600 }); const st = freshSubState({ allowance: 1000 });
    expect(subscriptionPull(st, sub, 'merchant', T0).ok).toBe(true); // 600 pulled, 400 left
    sub.nextPayment = T0; // pretend due again
    expect(subscriptionPull(st, sub, 'merchant', T0)).toEqual({ ok: false, reason: 'insufficient-allowance' });
  });
  it('SUB-07 establishing the allowance is ADMIN-ONLY (timelock + guardian-cancel modeled in funding audit)', () => {
    expect(approveAllowanceAuthorized('attacker')).toEqual({ ok: false, reason: 'not-admin' });
    expect(approveAllowanceAuthorized('merchant')).toEqual({ ok: false, reason: 'not-admin' });
    expect(approveAllowanceAuthorized('admin').ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cap 7 — recovery interaction (the documented gap)
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap7: recovery severs the direct channel but NOT subscription allowances', () => {
  it('REC-01 recovery invalidates direct-channel intents (epoch) — channel 1 severed', () => {
    const direct = freshDirect(); const st = freshSubState();
    const r = recoveryEffect(direct, st);
    expect(r.channel1Severed).toBe(true);
  });
  it('REC-02 recovery does NOT auto-revoke the subscription allowance — the documented gap', () => {
    const direct = freshDirect(); const st = freshSubState({ allowance: 1000 });
    const r = recoveryEffect(direct, st);
    expect(r.channel2AllowanceRevoked).toBe(false);
    expect(st.allowance).toBe(1000); // allowance persists; operational remediation required (revoke / cancel)
  });
  it('REC-03 BUT the allowance can only have been established admin-only + timelocked (primary protection holds)', () => {
    // an attacker cannot have silently created the allowance — it required an admin action with a 7-day,
    // guardian-cancellable timelock (SUB-07). The gap is a defense-in-depth inconsistency, not a silent drain.
    expect(approveAllowanceAuthorized('attacker').ok).toBe(false);
  });
});
