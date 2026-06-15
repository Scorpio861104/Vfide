/**
 * Ownership Identity Architecture — executable logic model (Campaign C).
 *
 * Certifies VFIDE's three SECURITY DOMAINS and the relationships between them, traced from `CardBoundVault.sol`
 * (transferAdmin/acceptAdmin, finalizeWalletRotation, executeRecoveryRotation) and `VaultHub.sol`
 * (ensureVault, executeRecoveryRotation, abortRecoveryRotation, vaultOf/ownerOfVault):
 *
 *   DOMAIN 1 — OWNER IDENTITY  (`ownerOfVault` / `vaultOf`, hub): the canonical "who owns this vault" anchor.
 *              Powers: gates abortRecoveryRotation; is the identity commerce contracts resolve via vaultOf(caller).
 *              Mutates: ONLY at registration (ensureVault) and recovery. NOT by admin transfer or wallet rotation.
 *   DOMAIN 2 — ADMIN AUTHORITY (`admin`, vault): config authority (guardian/limit/PoL/rescue proposals, all
 *              timelocked) + can PROPOSE a wallet rotation (guardian-approved). Mutates: two-step transferAdmin/
 *              acceptAdmin, or recovery.
 *   DOMAIN 3 — SPENDING AUTHORITY (`activeWallet`, vault): signs direct-spend intents. Mutates: finalizeWalletRotation
 *              (admin-proposed + guardian-approved + delay), or recovery.
 *
 *   KEY PROPERTY — IDENTITY vs SPENDING-KEY divergence: a legitimate wallet rotation changes `activeWallet` but NOT
 *   `ownerOfVault` (they diverge — the account identity is stable, the spending key rotates). Recovery changes BOTH
 *   (a full ownership transfer) and clears the old owner's `vaultOf`. Consequence for commerce (vaultOf-keyed):
 *     • legitimate rotation → subscriptions SURVIVE (vaultOf unchanged).
 *     • recovery → subscriptions SEVERED (vaultOf[oldOwner]=0 → processPayment reverts "no user vault").
 *     • inheritance → subscriptions CONTINUE through VETO/CLAIM (vaultOf unchanged), settle at MEMORIAL.
 *
 *   NO-ESCALATION INVARIANT: no lower domain can acquire a higher domain's authority without proper authorization.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export type Domain = 'ownerIdentity' | 'admin' | 'spending';
export type Mutator = 'registration' | 'transferAdmin' | 'walletRotation' | 'recovery';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

/** Which mutators are authorized to change each domain. */
export function authorizedMutators(domain: Domain): Set<Mutator> {
  switch (domain) {
    case 'ownerIdentity': return new Set(['registration', 'recovery']); // NOT transferAdmin, NOT walletRotation
    case 'admin': return new Set(['transferAdmin', 'recovery']);
    case 'spending': return new Set(['walletRotation', 'recovery']);
  }
}

/** Can `mutator` legitimately change `domain`? */
export function canMutate(domain: Domain, mutator: Mutator): boolean {
  return authorizedMutators(domain).has(mutator);
}

// ── Escalation matrix: can holding domain A grant domain B without authorization? ──
/**
 * Returns true iff an actor who controls ONLY `holder` can, by their own unilateral action, acquire `target`.
 * The certification requires this to be false for every lower→higher pair.
 */
export function canEscalate(holder: Domain, target: Domain): boolean {
  if (holder === target) return true; // trivially holds its own
  // spending key: signs intents only — cannot call transferAdmin (onlyAdmin), cannot trigger recovery (guardians).
  if (holder === 'spending') return false;
  // admin: can transferAdmin (stays admin) and PROPOSE a rotation (changes spending key, but needs guardian
  // approval + delay — not unilateral) — but CANNOT change ownerOfVault (only recovery does).
  if (holder === 'admin') {
    // admin influencing the spending key requires guardian approval, so it is not a unilateral escalation;
    // admin can never acquire ownerIdentity.
    return false;
  }
  // ownerIdentity: its only power is abortRecoveryRotation + being the canonical record; it does not command
  // admin or spending, so it cannot unilaterally acquire either.
  if (holder === 'ownerIdentity') return false;
  return false;
}

// ── Admin transfer (two-step) ────────────────────────────────────────────────
export interface AdminTransfer { admin: string; pendingAdmin: string }
export function transferAdmin(s: AdminTransfer, caller: string, newAdmin: string): R {
  if (caller !== s.admin) return E('not-admin'); // onlyAdmin initiates
  if (newAdmin === '') return E('zero');
  s.pendingAdmin = newAdmin;
  return OK; // does NOT change admin yet — the new admin must accept
}
export function acceptAdmin(s: AdminTransfer, caller: string): R {
  if (caller !== s.pendingAdmin) return E('not-pending-admin'); // only the named successor can accept
  s.admin = s.pendingAdmin;
  s.pendingAdmin = '';
  return OK;
}

// ── vaultOf semantics across the three transition types ──────────────────────
export interface HubMapping {
  vaultOf: Map<string, string>; // owner identity → vault
  ownerOfVault: Map<string, string>; // vault → owner identity
}
export function legitimateRotation(_h: HubMapping, _vault: string): void {
  // changes vault.activeWallet only — the hub mapping is intentionally untouched (identity is stable)
}
export function recoveryTransfer(h: HubMapping, vault: string, oldOwner: string, newWallet: string): void {
  h.vaultOf.set(oldOwner, ''); // cleared — this is what severs old subscriptions
  h.ownerOfVault.set(vault, newWallet);
  h.vaultOf.set(newWallet, vault);
}
export function inheritanceDistribution(_h: HubMapping, _vault: string): void {
  // distributes assets to heirs (new heir vaults via ensureVault) — does NOT change the deceased's vaultOf entry
}

/** A subscription pull resolves the subscriber's vault via vaultOf and pins it. */
export function subscriptionResolves(h: HubMapping, subscriber: string, pinnedVault: string): R {
  const live = h.vaultOf.get(subscriber) ?? '';
  if (live === '') return E('no-user-vault'); // recovery cleared it
  if (live !== pinnedVault) return E('vault-changed');
  return OK;
}

/** Commerce contracts resolve the CALLER's vault via vaultOf(msg.sender) — i.e. the owner identity, not the spending key. */
export function commerceResolvesCaller(h: HubMapping, caller: string): R {
  const v = h.vaultOf.get(caller) ?? '';
  if (v === '') return E('no-vault-for-caller'); // e.g. calling from a rotated spending key (not the identity)
  return OK;
}
