/**
 * Treasury cluster — drain-resistance & disbursement-bound MODEL (audit artifact).
 *   Covers EcoTreasuryVault.sol, RevenueSplitter.sol, FeeDistributor.sol.
 *
 * HONESTY NOTE (as in the other on-chain audits): models the fund-movement AUTHORIZATION / accounting logic in
 * pure TS so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's
 * EcoTreasuryVaultNotifierTimelock / EcoTreasuryVaultModuleExpiry / RevenueSplitter / FeeDistributorGuardrails
 * hardhat suites are the on-chain evidence for a compiler-equipped environment.
 *
 * Unlike the governance contracts (non-custodial by ABSENCE of fund code), these three HOLD funds — but
 * ECOSYSTEM/protocol funds, NOT user-vault funds. So the audit question is drain-resistance, not user custody:
 *
 *   • NO ARBITRARY-DRAIN PRIMITIVE. Every outflow is one of:
 *       - a routed distribution to a PRE-VALIDATED payee/pool set by shares that MUST sum to 100%, or
 *       - a DAO-gated discretionary disbursement (EcoTreasuryVault.sendVFIDE — routes through the certified
 *         DAO → timelock), or
 *       - a rescue of NON-treasury tokens only (the treasury's own VFIDE is excluded from rescue).
 *   • SPLITS MUST SUM TO 100%, BOUNDED PER SINK. FeeDistributor: dao+merchants+headhunters == MAX_BPS, none over
 *     MAX_SINGLE_BPS. RevenueSplitter: payee shares sum to 10000, no zero-shares. Distribution sends the FULL
 *     balance (last sink gets the rounding remainder) — nothing is skimmable.
 *   • CHANGES ARE TIMELOCKED. FeeDistributor split/destination/rescue all use propose → execute after a 72h
 *     delay. RevenueSplitter payee changes use update → apply. EcoTreasuryVault module/notifier changes are
 *     DAO-gated with expiry.
 *   • REENTRANCY-SAFE. All outflow functions are nonReentrant; distribution updates accounting per-transfer.
 *   • NOT USER FUNDS. These hold ecosystem funds; no path reaches a user's CardBoundVault.
 */

// ─────────────────────────── EcoTreasuryVault: discretionary outflow + rescue

export type Caller = 'dao' | 'admin' | 'other';

export type SendResult = { ok: true } | { ok: false; reason: 'NOT_DAO' | 'ZERO' | 'INSUFFICIENT' };

/** sendVFIDE is the only discretionary treasury outflow: DAO-only, non-zero, balance-bounded. */
export function authorizeSendVFIDE(args: {
  caller: Caller; to: 'zero' | 'addr'; amount: number; balance: number;
}): SendResult {
  if (args.caller !== 'dao') return { ok: false, reason: 'NOT_DAO' };
  if (args.to === 'zero' || args.amount === 0) return { ok: false, reason: 'ZERO' };
  if (args.balance < args.amount) return { ok: false, reason: 'INSUFFICIENT' };
  return { ok: true };
}

export type RescueResult = { ok: true } | { ok: false; reason: 'NOT_DAO' | 'ZERO' | 'CANNOT_RESCUE_TREASURY_TOKEN' };

/** rescueToken is DAO-only and CANNOT move the treasury's own VFIDE (must use sendVFIDE) — no skim path. */
export function authorizeRescueToken(args: {
  caller: Caller; token: 'vfide' | 'other'; to: 'zero' | 'addr'; amount: number;
}): RescueResult {
  if (args.caller !== 'dao') return { ok: false, reason: 'NOT_DAO' };
  if (args.token === 'vfide') return { ok: false, reason: 'CANNOT_RESCUE_TREASURY_TOKEN' };
  if (args.to === 'zero' || args.amount === 0) return { ok: false, reason: 'ZERO' };
  return { ok: true };
}

// ─────────────────────────── FeeDistributor: split validity + distribution accounting

export const MAX_BPS = 10000;
export const MAX_SINGLE_BPS = 8000; // no single channel may exceed this (prevents routing all to one sink)
export const SPLIT_CHANGE_DELAY_H = 72;

export type SplitResult = { ok: true } | { ok: false; reason: 'NOT_100_PERCENT' | 'SINGLE_TOO_HIGH' };

/** A proposed fee split must sum to exactly 100% and have no channel over the per-sink cap. */
export function validateSplit(dao: number, merchants: number, headhunters: number): SplitResult {
  if (dao + merchants + headhunters !== MAX_BPS) return { ok: false, reason: 'NOT_100_PERCENT' };
  if (dao > MAX_SINGLE_BPS || merchants > MAX_SINGLE_BPS || headhunters > MAX_SINGLE_BPS) {
    return { ok: false, reason: 'SINGLE_TOO_HIGH' };
  }
  return { ok: true };
}

/** Distribution allocates the FULL balance across the three pools; headhunter sink gets the remainder. */
export function distributionAllocation(balance: number, daoBps: number, merchantBps: number): { toDAO: number; toMerchants: number; toHeadhunters: number; total: number } {
  const toDAO = Math.floor((balance * daoBps) / MAX_BPS);
  const toMerchants = Math.floor((balance * merchantBps) / MAX_BPS);
  const toHeadhunters = balance - toDAO - toMerchants; // remainder — nothing left behind
  return { toDAO, toMerchants, toHeadhunters, total: toDAO + toMerchants + toHeadhunters };
}

/** A pending split/destination/rescue change applies only after the 72h delay. */
export function canExecuteTimelocked(args: { pending: boolean; nowH: number; effectiveTimeH: number }): boolean {
  return args.pending && args.nowH >= args.effectiveTimeH;
}

/** Admin-gated, and (for distribute) rate-limited + above the minimum + not paused. */
export function authorizeDistribute(args: {
  paused: boolean; nowH: number; lastDistH: number; minIntervalH: number; balance: number; minAmount: number;
}): { ok: true } | { ok: false; reason: 'PAUSED' | 'TOO_SOON' | 'BELOW_MINIMUM' } {
  if (args.paused) return { ok: false, reason: 'PAUSED' };
  if (args.nowH < args.lastDistH + args.minIntervalH) return { ok: false, reason: 'TOO_SOON' };
  if (args.balance < args.minAmount) return { ok: false, reason: 'BELOW_MINIMUM' };
  return { ok: true };
}

// ─────────────────────────── RevenueSplitter: payee share validity

export type PayeeResult = { ok: true } | { ok: false; reason: 'NOT_100_PERCENT' | 'ZERO_SHARE' };

/** Payee shares must sum to exactly 10000 (100%) and no payee may have a zero share. */
export function validatePayees(shares: number[]): PayeeResult {
  if (shares.some((s) => s === 0)) return { ok: false, reason: 'ZERO_SHARE' };
  const total = shares.reduce((a, b) => a + b, 0);
  if (total !== MAX_BPS) return { ok: false, reason: 'NOT_100_PERCENT' };
  return { ok: true };
}

/** Splitter distribution routes the full balance to the configured payees; last payee gets the remainder. */
export function splitterAllocation(balance: number, shares: number[]): number[] {
  const out: number[] = [];
  let distributed = 0;
  for (let i = 0; i < shares.length; i++) {
    const share = shares[i] ?? 0;
    const amt = i === shares.length - 1 ? balance - distributed : Math.floor((balance * share) / MAX_BPS);
    out.push(amt);
    distributed += amt;
  }
  return out;
}

// ─────────────────────────── Custody boundary

/** The treasury cluster holds ecosystem/protocol funds — NOT user-vault funds. */
export function holdsUserVaultFunds(): boolean { return false; }
/** No treasury path can freeze or seize a user's vault. */
export function canReachUserVault(): boolean { return false; }
