/**
 * Core Ownership — CardBoundVault non-custodial invariant MODEL (audit artifact).
 *
 * IMPORTANT HONESTY NOTE: this models the AUTHORIZATION LOGIC of CardBoundVault.sol in pure TypeScript so the
 * non-custodial invariants can be exercised as executing scenarios. It is NOT the deployed bytecode and NOT a
 * substitute for on-chain/hardhat tests (the sandbox cannot download solc to compile). It encodes the rules as
 * read from the Solidity source so an adversarial matrix can prove the *logic* admits no custodial path. The
 * repo additionally carries 23 hardhat vault tests + on-chain verifier scripts for when a compiler is available.
 *
 * Modeled rules (line refs to contracts/vault/CardBoundVault.sol & CardBoundVaultAdminFacet.sol):
 *  • Outbound transfer of the owner's VFIDE requires signer == activeWallet (CBV line 1582), with chain/epoch/
 *    nonce/deadline binding + maxPerTransfer + dailyTransferLimit + large-transfer 7-day queue.
 *  • admin / guardian CANNOT move the owner's VFIDE. rescueERC20 reverts for the VFIDE token at propose AND
 *    apply time (AdminFacet CBV_CannotRescueVFIDE); rescue is stray-token-only.
 *  • adminFacet is immutable (no setter) and the vault has no selfdestruct + CREATE2 ⇒ code cannot be swapped.
 *  • Inheritance moves funds only after proof-of-life failure, through VETO(30d)→CLAIM(90d); the living owner
 *    (activeWallet) can always veto/override; the DAO can veto but never initiate.
 */

// ── The actors. In the ATM-card model both `admin` (owner control key) and `activeWallet` (signing/card key)
//    belong to the OWNER; guardians are owner-chosen backstops; the DAO is governance. None is a custodian.
export type Actor = 'activeWallet' | 'admin' | 'guardian' | 'dao' | 'attacker';

export interface TransferIntent {
  signer: Actor;          // who signed the EIP-712 intent
  vault: 'self' | 'other';
  toVault: 'valid' | 'self' | 'dead' | 'nonVault';
  chainId: number;        // must equal block chainId
  walletEpoch: number;    // must equal current epoch
  nonce: number;          // must equal nextNonce
  deadline: number;       // must be >= now
  amount: number;
}

export interface VaultState {
  blockChainId: number;
  walletEpoch: number;
  nextNonce: number;
  now: number;
  maxPerTransfer: number;
  dailyTransferLimit: number;
  spentToday: number;
  largeTransferThreshold: number; // 0 = disabled
}

export type TransferOutcome =
  | { ok: true; queued: boolean }
  | { ok: false; reason: 'NOT_OWNER_SIGNER' | 'BAD_CHAIN' | 'BAD_EPOCH' | 'BAD_NONCE' | 'EXPIRED' | 'BAD_DEST' | 'OVER_MAX' | 'OVER_DAILY' | 'ZERO' };

/** Models executeVaultToVaultTransfer's gate (CBV 1556–1600). The owner's funds move ONLY on activeWallet's signed intent. */
export function authorizeTransfer(intent: TransferIntent, s: VaultState): TransferOutcome {
  if (intent.vault !== 'self') return { ok: false, reason: 'BAD_DEST' };
  if (intent.toVault !== 'valid') return { ok: false, reason: 'BAD_DEST' }; // self/dead/nonVault all rejected
  if (intent.chainId !== s.blockChainId) return { ok: false, reason: 'BAD_CHAIN' };
  if (intent.walletEpoch !== s.walletEpoch) return { ok: false, reason: 'BAD_EPOCH' };
  if (intent.deadline < s.now) return { ok: false, reason: 'EXPIRED' };
  if (intent.nonce !== s.nextNonce) return { ok: false, reason: 'BAD_NONCE' };
  if (intent.amount === 0) return { ok: false, reason: 'ZERO' };
  if (intent.amount > s.maxPerTransfer) return { ok: false, reason: 'OVER_MAX' };
  // THE non-custodial gate: only the owner's signing key authorizes movement of the owner's funds.
  if (intent.signer !== 'activeWallet') return { ok: false, reason: 'NOT_OWNER_SIGNER' };
  if (s.spentToday + intent.amount > s.dailyTransferLimit) return { ok: false, reason: 'OVER_DAILY' };
  const queued = s.largeTransferThreshold > 0 && intent.amount >= s.largeTransferThreshold;
  return { ok: true, queued };
}

// ── Admin rescue. Models rescueERC20/applyRescueERC20 (AdminFacet ~490–512): the owner's VFIDE can NEVER be
//    rescued by admin; only stray non-protocol tokens.
export type RescueOutcome = { ok: true } | { ok: false; reason: 'CANNOT_RESCUE_VFIDE' | 'NOT_ADMIN' | 'ZERO' };

export function authorizeRescueERC20(caller: Actor, token: 'VFIDE' | 'strayToken', to: 'set' | 'zero'): RescueOutcome {
  if (caller !== 'admin') return { ok: false, reason: 'NOT_ADMIN' };
  if (to === 'zero') return { ok: false, reason: 'ZERO' };
  if (token === 'VFIDE') return { ok: false, reason: 'CANNOT_RESCUE_VFIDE' }; // propose-time AND apply-time guard
  return { ok: true };
}

/** A pending rescue/large-transfer can be cancelled by admin OR any guardian during the 7-day timelock. */
export function canCancelPending(caller: Actor): boolean {
  return caller === 'admin' || caller === 'guardian';
}

// ── Code immutability. Models the structural facts that make "non-custodial by absence of code" hold.
export interface CodeImmutability { adminFacetImmutable: boolean; hasSetterForFacet: boolean; hasSelfdestruct: boolean; usesCreate2: boolean; }
/** Code cannot be swapped iff the facet is immutable with no setter AND there is no selfdestruct (CREATE2 alone is safe). */
export function codeCannotBeSwapped(c: CodeImmutability): boolean {
  if (!c.adminFacetImmutable || c.hasSetterForFacet) return false; // facet swap would add code
  if (c.hasSelfdestruct) return false;                              // metamorphic redeploy would replace code
  return true; // CREATE2 without selfdestruct = deterministic address only, not replaceable
}

// ── Inheritance. Models the claim lifecycle: proof-of-life failure → VETO(30d) → CLAIM(90d); the living owner
//    always wins; the DAO can veto but not initiate.
export type InheritanceState = 'none' | 'veto_period' | 'claim_window' | 'claimed';
export interface InheritanceAction { actor: Actor; action: 'initiate' | 'veto' | 'ownerOverride' | 'claim'; }

export type InheritanceResult = { ok: true; next: InheritanceState } | { ok: false; reason: string };

export function applyInheritance(state: InheritanceState, a: InheritanceAction, ownerAlive: boolean): InheritanceResult {
  switch (a.action) {
    case 'initiate':
      // DAO can VETO but cannot INITIATE (design Decision 12); a heir-guardian initiates after PoL failure.
      if (a.actor === 'dao') return { ok: false, reason: 'DAO_CANNOT_INITIATE' };
      if (a.actor === 'attacker') return { ok: false, reason: 'NOT_AUTHORIZED' };
      if (state !== 'none') return { ok: false, reason: 'ALREADY_ACTIVE' };
      return { ok: true, next: 'veto_period' };
    case 'veto':
      // owner (activeWallet), a guardian, or the DAO may veto during the veto period.
      if (!['activeWallet', 'guardian', 'dao'].includes(a.actor)) return { ok: false, reason: 'NOT_AUTHORIZED' };
      if (state !== 'veto_period' && state !== 'claim_window') return { ok: false, reason: 'NOTHING_TO_VETO' };
      return { ok: true, next: 'none' };
    case 'ownerOverride':
      // the living owner can ALWAYS cancel a claim against their vault.
      if (a.actor !== 'activeWallet') return { ok: false, reason: 'ONLY_OWNER' };
      if (!ownerAlive) return { ok: false, reason: 'OWNER_NOT_PRESENT' };
      return { ok: true, next: 'none' };
    case 'claim':
      if (ownerAlive) return { ok: false, reason: 'OWNER_ALIVE_BLOCKS_CLAIM' };
      if (state !== 'claim_window') return { ok: false, reason: 'NOT_IN_CLAIM_WINDOW' };
      if (!['guardian'].includes(a.actor)) return { ok: false, reason: 'ONLY_HEIR_GUARDIAN' };
      return { ok: true, next: 'claimed' };
    default:
      return { ok: false, reason: 'UNKNOWN' };
  }
}
