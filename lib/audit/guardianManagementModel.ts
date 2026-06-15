/**
 * Guardian Management — executable logic model (ACTIVE path audit, Continuity Audit 2).
 *
 * Mirrors guardian add/remove, threshold rules, the change timelock, trustee (recovery-initiation) promotion,
 * guardian maturity, and single-instance recovery rotation as implemented in `CardBoundVault.sol` +
 * `CardBoundVaultAdminFacet.sol` + `CardBoundVaultAdminManager.sol`. NOT the compiled contract; a green hardhat
 * run is the stage-2 confirmation.
 *
 * Modeled invariants (asserted by the matrix):
 *  • Post-setup, guardian/trustee changes go through a 1-day timelock (propose→apply); the owner can cancel.
 *  • Cannot remove the last guardian; threshold auto-clamps to count; post-setup minimum is 2 guardians + thr≥2.
 *  • Threshold cannot be 0, cannot exceed count, and (post-setup, multi-guardian) cannot equal count
 *    (zero-redundancy guard: a 3-of-3 set would let ONE guardian loss lock recovery).
 *  • Trustee (recovery-initiation) power requires an EXISTING and (post-setup) MATURE guardian
 *    (GUARDIAN_MATURITY_PERIOD = 7d) — the Audit-2 fix the contract comment promised but did not enforce.
 *  • Recovery rotation is SINGLE-INSTANCE (one slot; a new stage overwrites) → no concurrent recoveries.
 */

export const MAX_GUARDIANS = 10;
export const GUARDIAN_CHANGE_DELAY = 1 * 24 * 60 * 60; // 1 day
export const GUARDIAN_MATURITY_PERIOD = 7 * 24 * 60 * 60; // 7 days

export interface GuardianState {
  guardians: Map<string, number>; // address -> addedAt
  threshold: number;
  trustees: Set<string>;
  setupComplete: boolean;
  pendingChange: { guardian: string; active: boolean; executeAt: number } | null;
  pendingTrustee: { guardian: string; trustee: boolean; executeAt: number } | null;
  pendingRotation: { newWallet: string; nonce: number } | null;
  rotationNonce: number;
}

export function freshGuardians(overrides: Partial<GuardianState> = {}): GuardianState {
  return {
    guardians: new Map([['G1', 0], ['G2', 0], ['G3', 0]]),
    threshold: 2,
    trustees: new Set(['G1']),
    setupComplete: true,
    pendingChange: null,
    pendingTrustee: null,
    pendingRotation: null,
    rotationNonce: 0,
    ...overrides,
  };
}

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

const count = (s: GuardianState) => s.guardians.size;
const isGuardian = (s: GuardianState, g: string) => s.guardians.has(g);
const isMature = (s: GuardianState, g: string, now: number) => {
  const addedAt = s.guardians.get(g);
  return addedAt !== undefined && now >= addedAt + GUARDIAN_MATURITY_PERIOD;
};

/** Bootstrap-only direct setter (reverts post-setup). */
export function setGuardian(s: GuardianState, g: string, active: boolean, now: number): R {
  if (s.setupComplete) return E('use-propose-apply');
  if (g === '') return E('zero');
  applyGuardianMutation(s, g, active, now);
  return validateInvariants(s);
}

/** Post-setup: propose a guardian change (starts the 1-day timelock). */
export function proposeGuardianChange(s: GuardianState, g: string, active: boolean, now: number): R {
  if (!s.setupComplete) return E('bootstrap-uses-setGuardian');
  s.pendingChange = { guardian: g, active, executeAt: now + GUARDIAN_CHANGE_DELAY };
  return OK;
}

/** Apply a proposed guardian change after the timelock. */
export function applyGuardianChange(s: GuardianState, now: number): R {
  const p = s.pendingChange;
  if (!p) return E('no-pending');
  if (now < p.executeAt) return E('timelock-not-elapsed');
  s.pendingChange = null;
  applyGuardianMutation(s, p.guardian, p.active, now);
  return validateInvariants(s);
}

/** Owner cancels a pending guardian change within the timelock window. */
export function cancelGuardianChange(s: GuardianState): R {
  if (!s.pendingChange) return E('no-pending');
  s.pendingChange = null;
  return OK;
}

function applyGuardianMutation(s: GuardianState, g: string, active: boolean, now: number): void {
  const already = s.guardians.has(g);
  if (already === active) return;
  if (active) {
    s.guardians.set(g, now); // addedAt = now (maturity clock starts)
  } else {
    s.guardians.delete(g);
    s.trustees.delete(g); // a removed guardian cannot remain a trustee
    if (s.threshold > count(s)) s.threshold = count(s); // auto-clamp
  }
}

/** setGuardianThreshold: bounds + zero-redundancy guard. */
export function setGuardianThreshold(s: GuardianState, threshold: number): R {
  if (threshold === 0 || threshold > count(s)) return E('invalid-threshold');
  if (s.setupComplete && count(s) >= 2 && threshold === count(s)) return E('zero-redundancy');
  s.threshold = threshold;
  return OK;
}

/** Bootstrap-only direct trustee setter. */
export function setTrustee(s: GuardianState, g: string, trustee: boolean, now: number): R {
  if (s.setupComplete) return E('use-propose-apply');
  return applyTrusteeMutation(s, g, trustee, now);
}

/** Post-setup: propose a trustee change (1-day timelock). */
export function proposeTrusteeChange(s: GuardianState, g: string, trustee: boolean, now: number): R {
  if (!s.setupComplete) return E('bootstrap-uses-setTrustee');
  s.pendingTrustee = { guardian: g, trustee, executeAt: now + GUARDIAN_CHANGE_DELAY };
  return OK;
}

export function applyTrusteeChange(s: GuardianState, now: number): R {
  const p = s.pendingTrustee;
  if (!p) return E('no-pending');
  if (now < p.executeAt) return E('timelock-not-elapsed');
  const res = applyTrusteeMutation(s, p.guardian, p.trustee, now);
  if (res.ok) s.pendingTrustee = null;
  return res;
}

export function cancelTrusteeChange(s: GuardianState): R {
  if (!s.pendingTrustee) return E('no-pending');
  s.pendingTrustee = null;
  return OK;
}

/**
 * The chokepoint for ALL trustee grants. Enforces: must be a guardian; AND (post-setup) must be MATURE.
 * The maturity check is the Audit-2 fix — previously documented but not enforced.
 */
function applyTrusteeMutation(s: GuardianState, g: string, trustee: boolean, now: number): R {
  if (s.trustees.has(g) === trustee) return OK;
  if (trustee && !isGuardian(s, g)) return E('not-guardian');
  if (trustee && s.setupComplete && !isMature(s, g, now)) return E('guardian-immature'); // ← Audit-2 fix
  if (trustee) s.trustees.add(g);
  else s.trustees.delete(g);
  return OK;
}

/** Recovery rotation is SINGLE-INSTANCE: a new stage overwrites the one slot. */
export function stageRecoveryRotation(s: GuardianState, newWallet: string): R {
  if (newWallet === '') return E('zero');
  if (!s.setupComplete) return E('setup-required');
  s.rotationNonce += 1;
  s.pendingRotation = { newWallet, nonce: s.rotationNonce }; // overwrites any prior — single slot
  return OK;
}

export function validateInvariants(s: GuardianState): R {
  if (count(s) === 0) return E('invalid-threshold'); // cannot remove last guardian
  if (s.threshold === 0) return E('invalid-threshold');
  if (s.threshold > count(s)) return E('threshold-exceeds-count');
  // post-setup safety minimum (count<2 or thr<2) is a hub-invalidation SIGNAL in the contract, modeled as a flag
  return OK;
}

/** Helper for the matrix: is the vault below the post-setup safe minimum (signals hub invalidation)? */
export function belowSafeMinimum(s: GuardianState): boolean {
  return s.setupComplete && (count(s) < 2 || s.threshold < 2);
}
