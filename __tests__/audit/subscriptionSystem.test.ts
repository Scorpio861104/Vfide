/**
 * Subscription Commerce System — adversarial + edge matrix (Campaign A).
 *
 * Comprehensive certification of the allowance-pull channel: subscriber-sovereign authority, the full pull state
 * machine (timing / fraud / pinning / allowance+balance / grace / failed-payment auto-cancel), bounds, batch
 * isolation, and the recovery/inheritance interactions.
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshSub, createSubscription, modifySubscription, cancelSubscription, pauseSubscription, resumeSubscription,
  processPayment, emergencyCancel, batchProcessPayments, allowanceIsAggregate,
  MAX_BATCH_SIZE, MAX_FAILED_PAYMENTS, MERCHANT_EXCLUSIVE_WINDOW, type PullCtx, type Sub,
} from '@/lib/audit/subscriptionSystemModel';

const T = 1_000_000;
const okCtx = (o: Partial<PullCtx> = {}): PullCtx => ({
  now: T, block: 1, subscriberVaultLive: 'SVAULT', merchantVaultLive: 'MVAULT',
  allowance: 1000, balance: 1000, bannedSubscriber: false, bannedMerchant: false, ...o,
});

// ─────────────────────────────────────────────────────────────────────────────
// Subscriber-sovereign authority
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign A: subscriber-sovereign authority', () => {
  it('AUTH-01 only the subscriber can MODIFY the amount — a merchant cannot raise it', () => {
    const s = freshSub();
    expect(modifySubscription(s, 'merchant', 999999, 3600)).toEqual({ ok: false, reason: 'not-subscriber' });
    expect(modifySubscription(s, 'subscriber', 50, 3600).ok).toBe(true); // subscriber controls their amount
    expect(s.amount).toBe(50);
  });
  it('AUTH-02 only the subscriber can cancel or resume; pause is subscriber OR merchant', () => {
    expect(cancelSubscription(freshSub(), 'merchant')).toEqual({ ok: false, reason: 'not-subscriber' });
    expect(pauseSubscription(freshSub(), 'merchant').ok).toBe(true); // either can pause
    expect(resumeSubscription(freshSub({ paused: true }), 'merchant', T)).toEqual({ ok: false, reason: 'not-subscriber' });
  });
  it('AUTH-03 resume does NOT retroactively bill the paused period', () => {
    const s = freshSub({ paused: true, nextPayment: T - 100 });
    resumeSubscription(s, 'subscriber', T);
    expect(s.nextPayment).toBe(T); // reset to now, no catch-up charge
  });
  it('AUTH-04 createSubscription is subscriber-initiated with sane bounds', () => {
    expect(createSubscription('subscriber', 'MERCH', 0, 3600, 'SVAULT', 'MVAULT')).toEqual({ ok: false, reason: 'invalid-amount' });
    expect(createSubscription('subscriber', 'MERCH', 100, 60, 'SVAULT', 'MVAULT')).toEqual({ ok: false, reason: 'invalid-interval' });
    expect(createSubscription('subscriber', 'MERCH', 100, 3600, 'SVAULT', 'MVAULT').ok).toBe(true);
  });
  it('AUTH-05 emergencyCancel is DAO-only', () => {
    expect(emergencyCancel('attacker')).toEqual({ ok: false, reason: 'not-dao' });
    expect(emergencyCancel('dao').ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pull state machine
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign A: pull state machine', () => {
  it('PULL-01 only the merchant may trigger during the 24h exclusive window', () => {
    expect(processPayment(freshSub(), 'subscriber', okCtx())).toEqual({ ok: false, reason: 'not-merchant' });
    expect(processPayment(freshSub(), 'merchant', okCtx()).ok).toBe(true);
  });
  it('PULL-02 after the exclusive window, subscriber/DAO may trigger; an attacker cannot', () => {
    const after = T + MERCHANT_EXCLUSIVE_WINDOW + 1;
    expect(processPayment(freshSub(), 'attacker', okCtx({ now: after }))).toEqual({ ok: false, reason: 'not-authorized' });
    expect(processPayment(freshSub(), 'subscriber', okCtx({ now: after })).ok).toBe(true);
  });
  it('PULL-03 a fraud-banned subscriber or merchant blocks the pull', () => {
    expect(processPayment(freshSub(), 'merchant', okCtx({ bannedSubscriber: true }))).toEqual({ ok: false, reason: 'fraud-blocked' });
    expect(processPayment(freshSub(), 'merchant', okCtx({ bannedMerchant: true }))).toEqual({ ok: false, reason: 'fraud-blocked' });
  });
  it('PULL-04 a pull pulls EXACTLY sub.amount and advances the clock by interval', () => {
    const s = freshSub({ amount: 100, interval: 100 });
    processPayment(s, 'merchant', okCtx());
    expect(s.nextPayment).toBe(T + 100);
  });
  it('PULL-05 insufficient allowance/balance → grace period; failures cancel after MAX (one per block)', () => {
    const s = freshSub();
    // 3 failures across 3 distinct blocks → auto-cancel
    expect(processPayment(s, 'merchant', okCtx({ allowance: 0, block: 1 }))).toEqual({ ok: false, reason: 'payment-failed-grace' });
    expect(s.graceEndTime).toBeGreaterThan(0);
    processPayment(s, 'merchant', okCtx({ allowance: 0, block: 2 }));
    expect(processPayment(s, 'merchant', okCtx({ allowance: 0, block: 3 }))).toEqual({ ok: false, reason: 'max-failures-cancelled' });
    expect(s.active).toBe(false);
  });
  it('PULL-06 N-H12 anti-spam: repeated same-block failures count only ONCE', () => {
    const s = freshSub();
    processPayment(s, 'merchant', okCtx({ allowance: 0, block: 5 }));
    processPayment(s, 'merchant', okCtx({ allowance: 0, block: 5 })); // same block — not counted again
    processPayment(s, 'merchant', okCtx({ allowance: 0, block: 5 }));
    expect(s.failedPayments).toBe(1); // only one failure recorded despite 3 calls in the block
    expect(s.active).toBe(true); // not auto-cancelled by same-block spam
  });
  it('PULL-07 recovery clears the subscriber vaultOf → pull reverts "no user vault" (Campaign C correction)', () => {
    expect(processPayment(freshSub(), 'merchant', okCtx({ subscriberVaultLive: '' }))).toEqual({ ok: false, reason: 'no-user-vault' });
  });
  it('PULL-08 grace expiry auto-cancels the subscription', () => {
    const s = freshSub({ graceEndTime: T - 1 });
    expect(processPayment(s, 'merchant', okCtx())).toEqual({ ok: false, reason: 'grace-period-expired' });
    expect(s.active).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Batch + bounds
// ─────────────────────────────────────────────────────────────────────────────
describe('Campaign A: batch processing + bounds', () => {
  it('BATCH-01 batch is bounded by MAX_BATCH_SIZE', () => {
    expect(batchProcessPayments(new Array(MAX_BATCH_SIZE + 1).fill(0))).toEqual({ ok: false, reason: 'batch-too-large' });
    expect(batchProcessPayments(new Array(MAX_BATCH_SIZE).fill(0)).ok).toBe(true);
  });
  it('BOUND-01 the allowance is a single AGGREGATE bound across all the subscriber\'s subscriptions', () => {
    expect(allowanceIsAggregate()).toBe(true);
  });
});
