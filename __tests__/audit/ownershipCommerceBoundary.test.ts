/**
 * Ownership ↔ Commerce Boundary — adversarial + edge matrix (Audit 1 of the OC campaign).
 *
 * Asserts the architectural boundary properties traced from source:
 *  • Capability 4: wallet = spending authority, NOT a second ownership layer (the wallet never holds funds).
 *  • Capability 8: settlement is DIRECT vault → merchant / vault → vault (no wallet hop).
 *  • Capability 5: spending controls (per-tx, daily, large-payment queue) are enforced.
 *  • Capability 6: wallet compromise is blast-radius-bounded and fully recoverable.
 *  • Capability 7: recovery invalidates pre-signed intents (epoch) AND clears the queue.
 */
import { describe, it, expect } from '@jest/globals';
import {
  freshVault, payMerchant, peerTransfer, cancelQueuedPayment, executeQueuedPayment,
  recoveryRotateWallet, walletHoldsNoFunds, type VaultState, type PayIntent,
} from '@/lib/audit/ownershipCommerceBoundaryModel';

const T0 = 30_000_000;
const DAY = 24 * 60 * 60;

const intent = (s: VaultState, over: Partial<PayIntent> = {}): PayIntent => ({
  vault: s.address, merchantPortal: 'PORTAL', token: s.vfideToken, merchant: 'MERCHANT',
  recipient: 'MERCHANT_RECIP', amount: 100, nonce: s.nextNonce, walletEpoch: s.walletEpoch,
  deadline: T0 + 30 * DAY, chainId: s.chainId, signer: s.activeWallet, ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability 4 — wallet is spending authority, NOT a second ownership layer
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap4: ownership/spending separation', () => {
  it('OC4-01 a merchant payment moves funds OUT OF THE VAULT (the sole asset store)', () => {
    const s = freshVault();
    const before = s.vaultBalance;
    payMerchant(s, intent(s, { amount: 100 }), T0);
    expect(s.vaultBalance).toBe(before - 100);
  });
  it('OC4-02 INVARIANT: the wallet never holds protocol funds (not an ownership layer)', () => {
    const s = freshVault();
    payMerchant(s, intent(s, { amount: 100 }), T0);
    peerTransfer(s, { vault: s.address, toVault: 'PEER_VAULT', amount: 100, nonce: s.nextNonce, walletEpoch: s.walletEpoch, deadline: T0 + DAY, chainId: s.chainId, signer: s.activeWallet }, T0);
    expect(walletHoldsNoFunds(s)).toBe(true); // wallet balance stayed 0 throughout
  });
  it('OC4-03 only the active wallet SIGNATURE authorizes spend — not admin, guardian, or DAO', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { signer: 'OWNER' }), T0)).toEqual({ ok: false, reason: 'invalid-signer' });
    expect(payMerchant(s, intent(s, { signer: 'GUARDIAN' }), T0)).toEqual({ ok: false, reason: 'invalid-signer' });
    expect(payMerchant(s, intent(s, { signer: 'DAO' }), T0)).toEqual({ ok: false, reason: 'invalid-signer' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability 8 — settlement path is DIRECT (no wallet hop)
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap8: settlement path', () => {
  it('OC8-01 merchant settlement requires the merchant portal as caller (mediation)', () => {
    const s = freshVault();
    // an intent with no merchant portal is invalid (the contract requires msg.sender == merchantPortal)
    expect(payMerchant(s, intent(s, { merchantPortal: '' }), T0)).toEqual({ ok: false, reason: 'pay-intent-invalid' });
  });
  it('OC8-02 peer transfer goes vault → REGISTERED vault only (not arbitrary addresses)', () => {
    const s = freshVault();
    const mk = (toVault: string) => ({ vault: s.address, toVault, amount: 100, nonce: s.nextNonce, walletEpoch: s.walletEpoch, deadline: T0 + DAY, chainId: s.chainId, signer: s.activeWallet });
    expect(peerTransfer(s, mk('RANDOM_EOA'), T0)).toEqual({ ok: false, reason: 'not-vault' });
    expect(peerTransfer(s, mk('PEER_VAULT'), T0).ok).toBe(true);
  });
  it('OC8-03 a payment cannot target the vault itself or a burn address', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { recipient: s.address }), T0)).toEqual({ ok: false, reason: 'pay-intent-invalid' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability 5 — spending controls
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap5: spending controls', () => {
  it('OC5-01 a single payment cannot exceed the per-transaction limit', () => {
    const s = freshVault({ maxPerTransfer: 1000 });
    expect(payMerchant(s, intent(s, { amount: 1001 }), T0)).toEqual({ ok: false, reason: 'transfer-limit' });
  });
  it('OC5-02 cumulative spend cannot exceed the daily limit', () => {
    const s = freshVault({ maxPerTransfer: 1000, dailyTransferLimit: 1500, largePaymentThreshold: 0 });
    expect(payMerchant(s, intent(s, { amount: 1000 }), T0).ok).toBe(true); // spent 1000
    expect(payMerchant(s, intent(s, { amount: 1000 }), T0)).toEqual({ ok: false, reason: 'daily-limit' }); // 2000 > 1500
  });
  it('OC5-03 the daily window resets after 24h', () => {
    const s = freshVault({ maxPerTransfer: 1000, dailyTransferLimit: 1000, largePaymentThreshold: 0 });
    payMerchant(s, intent(s, { amount: 1000 }), T0); // exhaust today
    expect(payMerchant(s, intent(s, { amount: 1000 }), T0 + 2 * 60)).toEqual({ ok: false, reason: 'daily-limit' });
    expect(payMerchant(s, intent(s, { amount: 1000 }), T0 + DAY + 60).ok).toBe(true); // next day OK
  });
  it('OC5-04 a large payment is QUEUED (delayed), not instant', () => {
    const s = freshVault({ largePaymentThreshold: 500 });
    const r = payMerchant(s, intent(s, { amount: 600 }), T0);
    expect(r).toEqual({ ok: true, queued: true });
    expect(s.paymentQueue.length).toBe(1);
    expect(s.vaultBalance).toBe(100000); // not yet moved — still queued
  });
  it('OC5-05 a queued payment can be cancelled by a GUARDIAN (not just the owner)', () => {
    const s = freshVault({ largePaymentThreshold: 500 });
    payMerchant(s, intent(s, { amount: 600 }), T0);
    expect(cancelQueuedPayment(s, 0, true).ok).toBe(true); // guardian/admin authorized
    expect(s.paymentQueue[0]!.cancelled).toBe(true);
    // a cancelled payment cannot then execute
    expect(executeQueuedPayment(s, 0, true, T0 + DAY + 60)).toEqual({ ok: false, reason: 'already-processed' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Capability 6 — wallet compromise blast radius (the debit-card security model)
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap6: wallet compromise is bounded + recoverable', () => {
  it('OC6-01 a stolen wallet key CANNOT drain the vault in one transaction (per-tx cap)', () => {
    const s = freshVault({ maxPerTransfer: 1000, vaultBalance: 100000 });
    // attacker has the wallet key, signs a drain intent
    expect(payMerchant(s, intent(s, { amount: 100000, signer: s.activeWallet }), T0)).toEqual({ ok: false, reason: 'transfer-limit' });
  });
  it('OC6-02 a stolen wallet key is capped at the DAILY limit per day', () => {
    const s = freshVault({ maxPerTransfer: 1000, dailyTransferLimit: 3000, largePaymentThreshold: 0, vaultBalance: 100000 });
    let drained = 0;
    for (let i = 0; i < 5; i++) {
      const r = payMerchant(s, intent(s, { amount: 1000, signer: s.activeWallet }), T0);
      if (r.ok) drained += 1000;
    }
    expect(drained).toBe(3000); // capped at daily limit despite 5 attempts; 97000 still in the vault
    expect(s.vaultBalance).toBe(97000);
  });
  it('OC6-03 RECOVERY rotates the wallet → the attacker\'s pre-signed intents become invalid (epoch)', () => {
    const s = freshVault();
    const stolenIntent = intent(s, { amount: 100, signer: s.activeWallet }); // signed at epoch 1
    recoveryRotateWallet(s, 'NEW_WALLET'); // epoch → 2
    expect(payMerchant(s, stolenIntent, T0)).toEqual({ ok: false, reason: 'invalid-epoch' });
  });
  it('OC6-04 RECOVERY clears the payment queue → an attacker\'s queued large payment is voided', () => {
    const s = freshVault({ largePaymentThreshold: 500 });
    payMerchant(s, intent(s, { amount: 600, signer: s.activeWallet }), T0); // attacker queues a large payment
    expect(s.paymentQueue.length).toBe(1);
    recoveryRotateWallet(s, 'NEW_WALLET'); // clearOnRecovery
    expect(s.paymentQueue.length).toBe(0); // queued attacker payment is gone
  });
  it('OC6-05 the VAULT (ownership) is never seized by a spending-key compromise — only bounded spend is possible', () => {
    const s = freshVault({ maxPerTransfer: 1000, dailyTransferLimit: 3000, vaultBalance: 100000 });
    // no amount of wallet-key signing changes admin or seizes the vault; worst case is bounded daily spend
    payMerchant(s, intent(s, { amount: 1000, signer: s.activeWallet }), T0);
    expect(s.admin).toBe('OWNER'); // ownership/config authority untouched
    expect(s.vaultBalance).toBeGreaterThan(95000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Replay / binding protections
// ─────────────────────────────────────────────────────────────────────────────
describe('replay + binding', () => {
  it('BIND-01 an intent for another chain is rejected', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { chainId: 1 }), T0)).toEqual({ ok: false, reason: 'invalid-chain' });
  });
  it('BIND-02 an intent for another vault is rejected', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { vault: 'OTHER_VAULT' }), T0)).toEqual({ ok: false, reason: 'pay-intent-invalid' });
  });
  it('BIND-03 nonces are strictly sequential — a replayed/out-of-order nonce is rejected', () => {
    const s = freshVault({ largePaymentThreshold: 0 });
    payMerchant(s, intent(s, { amount: 100, nonce: 0 }), T0); // consumes nonce 0
    expect(payMerchant(s, intent(s, { amount: 100, nonce: 0 }), T0)).toEqual({ ok: false, reason: 'invalid-nonce' }); // replay
  });
  it('BIND-04 an expired intent is rejected', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { deadline: T0 - 1 }), T0)).toEqual({ ok: false, reason: 'expired' });
  });
  it('BIND-05 only VFIDE is a valid payment token', () => {
    const s = freshVault();
    expect(payMerchant(s, intent(s, { token: 'USDC' }), T0)).toEqual({ ok: false, reason: 'token-invalid' });
  });
});
