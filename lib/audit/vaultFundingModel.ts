/**
 * Vault Funding + Ownership Retention — executable logic model (OC campaign, Capability 1).
 *
 * Mirrors how assets ENTER the vault and the proof they REMAIN vault-owned, per `CardBoundVault.sol`
 * (canReceiveTransfer, rescueERC20/rescueNative) + `CardBoundVaultAdminFacet.sol`. Ground truth:
 *
 *   • There is NO deposit() — assets enter as a plain ERC20 balance transferred to the vault address.
 *   • canReceiveTransfer caps incoming VAULT-TO-VAULT transfers at MAX_VFIDE_WITHOUT_GUARDIAN (50K) until
 *     guardian setup completes. It is a SOFT cap (vault-to-vault path only) — raw ERC20 transfers cannot be
 *     intercepted (VFIDE is a plain ERC20 with no receiver hook); the binding loss bound pre-guardian is the
 *     daily spend limit, not the 50K cap.
 *   • VFIDE leaves ONLY via the owner-signed intent system (bounded by limits, queued, guardian-cancellable) or
 *     inheritance. rescueERC20 DOUBLE-GUARDS against VFIDE (propose + apply) so a compromised admin cannot drain
 *     it bypassing the limits/queue/signature/veto. Stray-token + native rescue are timelocked + guardian-cancellable.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export const MAX_VFIDE_WITHOUT_GUARDIAN = 50_000;
export const SENSITIVE_ADMIN_DELAY = 7 * 24 * 60 * 60; // 7 days

export interface FundingState {
  vfideToken: string;
  vaultBalance: number; // VFIDE held by the vault (its assets)
  strayBalances: Map<string, number>; // other tokens accidentally sent here
  nativeBalance: number; // ETH
  admin: string;
  guardians: Set<string>;
  guardianSetupComplete: boolean;
  pendingRescue: { token: string; to: string; amount: number; executeAt: number } | null;
  pendingNativeRescue: { to: string; amount: number; executeAt: number } | null;
}

export function freshFunding(o: Partial<FundingState> = {}): FundingState {
  return {
    vfideToken: 'VFIDE',
    vaultBalance: 0,
    strayBalances: new Map([['USDC', 0]]),
    nativeBalance: 0,
    admin: 'OWNER',
    guardians: new Set(['G1', 'G2']),
    guardianSetupComplete: true,
    pendingRescue: null,
    pendingNativeRescue: null,
    ...o,
  };
}

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

/** Raw ERC20 receipt: a plain token transfer to the vault. CANNOT be intercepted/capped (no hook). */
export function rawReceiveVFIDE(s: FundingState, amount: number): R {
  s.vaultBalance += amount; // unconditional — the token contract just credits the balance
  return OK;
}

/** canReceiveTransfer: the SOFT cap, checked by a SENDING vault on the vault-to-vault path only. */
export function canReceiveTransfer(s: FundingState, amount: number): boolean {
  if (s.guardianSetupComplete) return true;
  return s.vaultBalance + amount <= MAX_VFIDE_WITHOUT_GUARDIAN;
}

/** Incoming vault-to-vault transfer: gated by the receiver's canReceiveTransfer (the path the protocol controls). */
export function peerReceiveVFIDE(s: FundingState, amount: number): R {
  if (!canReceiveTransfer(s, amount)) return E('receiver-needs-guardian');
  s.vaultBalance += amount;
  return OK;
}

/** rescueERC20 (propose): DOUBLE-GUARD #1 — VFIDE can never be staged for rescue. Timelocked. */
export function rescueERC20Propose(s: FundingState, actor: string, token: string, to: string, amount: number, now: number): R {
  if (actor !== s.admin) return E('not-admin');
  if (token === '' || to === '') return E('zero');
  if (token === s.vfideToken) return E('cannot-rescue-vfide'); // drain-protection
  s.pendingRescue = { token, to, amount, executeAt: now + SENSITIVE_ADMIN_DELAY };
  return OK;
}

/** rescueERC20 (apply): DOUBLE-GUARD #2 — re-check at apply; timelock must elapse. */
export function rescueERC20Apply(s: FundingState, actor: string, now: number): R {
  if (actor !== s.admin) return E('not-admin');
  const p = s.pendingRescue;
  if (!p) return E('no-pending');
  if (now < p.executeAt) return E('timelock-not-elapsed');
  if (p.token === s.vfideToken) return E('cannot-rescue-vfide'); // defense-in-depth
  s.strayBalances.set(p.token, (s.strayBalances.get(p.token) ?? 0) - p.amount);
  s.pendingRescue = null;
  return OK;
}

/** Cancel a pending rescue — admin OR any guardian (the stolen-key backstop). */
export function rescueERC20Cancel(s: FundingState, actor: string): R {
  if (actor !== s.admin && !s.guardians.has(actor)) return E('not-guardian');
  if (!s.pendingRescue) return E('no-pending');
  s.pendingRescue = null;
  return OK;
}

/** Native (ETH) rescue: timelocked + guardian-cancellable (ETH is not the protocol asset, still protected). */
export function rescueNativePropose(s: FundingState, actor: string, to: string, amount: number, now: number): R {
  if (actor !== s.admin) return E('not-admin');
  if (to === '') return E('zero');
  s.pendingNativeRescue = { to, amount, executeAt: now + SENSITIVE_ADMIN_DELAY };
  return OK;
}
export function rescueNativeCancel(s: FundingState, actor: string): R {
  if (actor !== s.admin && !s.guardians.has(actor)) return E('not-guardian');
  if (!s.pendingNativeRescue) return E('no-pending');
  s.pendingNativeRescue = null;
  return OK;
}

/**
 * The ownership-retention invariant: enumerate the ONLY ways VFIDE can leave the vault.
 * Returns true iff `exitPath` is an authorized VFIDE exit. Anything else (admin rescue, seize, freeze) is false.
 */
export function isAuthorizedVfideExit(exitPath: string): boolean {
  const authorized = new Set([
    'signed-intent-pay-merchant',
    'signed-intent-peer-transfer',
    'signed-intent-fund-escrow',
    'owner-withdrawal-queue',
    'inheritance-heir-payout',
  ]);
  return authorized.has(exitPath);
}
