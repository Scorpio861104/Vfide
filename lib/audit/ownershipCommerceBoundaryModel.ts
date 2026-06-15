/**
 * Ownership ↔ Commerce Boundary — executable logic model (Audit 1 of the OC campaign).
 *
 * Mirrors the spending/settlement logic of `CardBoundVault.sol` (executePayMerchant / executeVaultToVaultTransfer
 * / executeFundEscrow) + `CardBoundVaultPaymentQueueManager.sol`. Encodes the GROUND-TRUTH architecture traced
 * from source (NOT assumptions):
 *
 *   • The VAULT is the sole asset store (ownership). Protocol funds NEVER live in the wallet.
 *   • The activeWallet is a SPENDING AUTHORITY (signing key) — it signs intents; it is not a second ownership layer.
 *   • Settlement is DIRECT FROM VAULT: Vault → Merchant (recipient) / Vault → Vault (peer) / Vault → Escrow.
 *     There is NO Vault → Wallet → Merchant hop.
 *   • Spending is bounded by per-tx + daily limits, large-payment queueing, sequential nonce, walletEpoch
 *     binding, chain + deadline binding, and merchant-portal mediation.
 *   • Recovery (guardian wallet-rotation) bumps walletEpoch (invalidating pre-signed intents) AND clears the
 *     payment queue (clearOnRecovery) — so a compromised wallet's blast radius is bounded and fully recoverable.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export interface PayIntent {
  vault: string;
  merchantPortal: string;
  token: string;
  merchant: string;
  recipient: string;
  amount: number;
  nonce: number;
  walletEpoch: number;
  deadline: number;
  chainId: number;
  signer: string; // who signed it (modeled directly; on-chain this is ecrecover)
}

export interface VaultState {
  address: string;
  vfideToken: string;
  chainId: number;
  admin: string; // config authority
  activeWallet: string; // spending authority (signing key) — holds NO funds
  walletEpoch: number;
  nextNonce: number;
  maxPerTransfer: number;
  dailyTransferLimit: number;
  spentToday: number;
  dayStart: number;
  largePaymentThreshold: number; // 0 = queueing disabled
  vaultBalance: number; // the ONLY asset store
  walletBalance: number; // INVARIANT: always 0 — the wallet never holds protocol funds
  paymentQueue: { recipient: string; amount: number; executeAfter: number; executed: boolean; cancelled: boolean }[];
  registeredVaults: Set<string>; // for peer transfers
  paused: boolean;
}

const DAY = 24 * 60 * 60;

export function freshVault(o: Partial<VaultState> = {}): VaultState {
  return {
    address: 'VAULT',
    vfideToken: 'VFIDE',
    chainId: 8453,
    admin: 'OWNER',
    activeWallet: 'WALLET',
    walletEpoch: 1,
    nextNonce: 0,
    maxPerTransfer: 1000,
    dailyTransferLimit: 3000,
    spentToday: 0,
    dayStart: 0,
    largePaymentThreshold: 500,
    vaultBalance: 100000,
    walletBalance: 0,
    paymentQueue: [],
    registeredVaults: new Set(['VAULT', 'PEER_VAULT']),
    paused: false,
    ...o,
  };
}

export type R = { ok: true; queued?: boolean } | { ok: false; reason: string };
const OK = (queued = false): R => ({ ok: true, queued });
const E = (reason: string): R => ({ ok: false, reason });

function refreshDailyWindow(s: VaultState, now: number): void {
  if (now >= s.dayStart + DAY) {
    s.dayStart = now;
    s.spentToday = 0;
  }
}

/** executePayMerchant: the merchant settlement path. Funds move DIRECTLY vault → recipient. */
export function payMerchant(s: VaultState, intent: PayIntent, now: number): R {
  if (s.paused) return E('paused');
  if (intent.vault !== s.address) return E('pay-intent-invalid');
  if (intent.merchantPortal === '') return E('pay-intent-invalid');
  if (intent.merchant === '') return E('pay-intent-invalid');
  if (intent.token !== s.vfideToken) return E('token-invalid'); // VFIDE only (H2)
  if (intent.recipient === '' || intent.recipient === s.address) return E('pay-intent-invalid');
  if (intent.chainId !== s.chainId) return E('invalid-chain');
  if (intent.walletEpoch !== s.walletEpoch) return E('invalid-epoch'); // rotation invalidates pre-signed intents
  if (intent.deadline < now) return E('expired');
  if (intent.nonce !== s.nextNonce) return E('invalid-nonce'); // strict sequential
  if (intent.amount === 0 || intent.amount > s.maxPerTransfer) return E('transfer-limit'); // per-tx cap

  refreshDailyWindow(s, now);
  if (s.spentToday + intent.amount > s.dailyTransferLimit) return E('daily-limit'); // daily cap

  if (intent.signer !== s.activeWallet) return E('invalid-signer'); // ONLY the active wallet authorizes spend

  s.nextNonce += 1;

  // large-payment queueing (opt-in via threshold > 0): delayed + cancellable instead of instant
  if (s.largePaymentThreshold > 0 && intent.amount >= s.largePaymentThreshold) {
    s.spentToday += intent.amount;
    s.paymentQueue.push({ recipient: intent.recipient, amount: intent.amount, executeAfter: now + DAY, executed: false, cancelled: false });
    return OK(true);
  }

  // instant settlement: funds move DIRECTLY from the vault to the recipient (NOT via the wallet)
  s.spentToday += intent.amount;
  s.vaultBalance -= intent.amount;
  // INVARIANT: walletBalance is untouched — the wallet never receives protocol funds
  return OK(false);
}

/** executeVaultToVaultTransfer: peer transfer. Receiver MUST be a registered vault. Direct vault → vault. */
export function peerTransfer(
  s: VaultState, intent: { vault: string; toVault: string; amount: number; nonce: number; walletEpoch: number; deadline: number; chainId: number; signer: string }, now: number,
): R {
  if (s.paused) return E('paused');
  if (intent.vault !== s.address) return E('invalid-signature');
  if (intent.toVault === '' || intent.toVault === s.address || intent.toVault === 'DEAD') return E('not-vault');
  if (!s.registeredVaults.has(intent.toVault)) return E('not-vault'); // receiver must be a real vault
  if (intent.chainId !== s.chainId) return E('invalid-chain');
  if (intent.walletEpoch !== s.walletEpoch) return E('invalid-epoch');
  if (intent.deadline < now) return E('expired');
  if (intent.nonce !== s.nextNonce) return E('invalid-nonce');
  if (intent.amount === 0 || intent.amount > s.maxPerTransfer) return E('transfer-limit');
  refreshDailyWindow(s, now);
  if (s.spentToday + intent.amount > s.dailyTransferLimit) return E('daily-limit');
  if (intent.signer !== s.activeWallet) return E('invalid-signer');
  s.nextNonce += 1;
  s.spentToday += intent.amount;
  s.vaultBalance -= intent.amount;
  return OK(false);
}

/** Cancel a queued payment — authorized for admin OR a guardian (defense in depth). */
export function cancelQueuedPayment(s: VaultState, index: number, isAdminOrGuardian: boolean): R {
  if (!isAdminOrGuardian) return E('not-authorized');
  const q = s.paymentQueue[index];
  if (!q) return E('invalid-index');
  if (q.executed || q.cancelled) return E('already-processed');
  q.cancelled = true;
  return OK();
}

/** Execute a ready queued payment — admin only. Funds move vault → recipient. */
export function executeQueuedPayment(s: VaultState, index: number, isAdmin: boolean, now: number): R {
  if (!isAdmin) return E('not-authorized');
  const q = s.paymentQueue[index];
  if (!q) return E('invalid-index');
  if (q.executed || q.cancelled) return E('already-processed');
  if (now < q.executeAfter) return E('not-ready');
  q.executed = true;
  s.vaultBalance -= q.amount;
  return OK();
}

/** Guardian wallet-rotation (recovery): bumps epoch AND clears the payment queue (clearOnRecovery). */
export function recoveryRotateWallet(s: VaultState, newWallet: string): void {
  s.activeWallet = newWallet;
  s.walletEpoch += 1; // invalidates all pre-signed intents (epoch mismatch)
  s.paymentQueue = []; // clearOnRecovery — voids any queued payment from the old (compromised) wallet
}

/** The ownership invariant: the wallet never holds protocol funds. */
export function walletHoldsNoFunds(s: VaultState): boolean {
  return s.walletBalance === 0;
}
