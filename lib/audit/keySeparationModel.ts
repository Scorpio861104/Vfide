/**
 * Key Separation — executable logic model (Campaign B).
 *
 * Certifies the SEPARATION POSTURE of the three security domains (from Campaign C: owner identity / admin /
 * spending). Traced from `CardBoundVault.sol` (constructor, splitAdminFromActive, recoveryAdminUnseparated,
 * _emitRecoverySplitReminder) + the frontend (which, per this audit, does NOT surface the posture). Questions
 * answered: is separation mandatory or optional; what is the default; can a user accidentally remain unseparated;
 * how does each posture behave after device loss / recovery / inheritance; and is any of it explained in the UX.
 *
 *   POSTURES:
 *     • UNSEPARATED (default at creation): admin == activeWallet == ownerIdentity (== owner_). One key holds all.
 *     • SEPARATED: the user moved admin to a distinct key (transferAdmin) and/or rotated the spending key.
 *     • UNSEPARATED_POST_RECOVERY: recovery converges admin == activeWallet (recoveryAdminUnseparated = true);
 *       the contract emits a WEEKLY RecoverySplitReminder; splitAdminFromActive re-separates (two-step).
 *
 *   SECURITY CONSEQUENCE (ties to OC-4 / Campaign C): in UNSEPARATED, a single-key compromise can abort recovery
 *   (the ownerIdentity == the hot key), an asymmetric griefing deadlock. In SEPARATED, a spending-key compromise
 *   cannot abort recovery (ownerIdentity is a distinct key) and is fully recoverable.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export type Posture = 'unseparated' | 'separated' | 'unseparatedPostRecovery';
export type Event = 'deviceLossAllKeys' | 'spendingKeyCompromise' | 'recovery' | 'inheritance';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

/** At vault creation the deployer sets admin == activeWallet == owner_ — the default is UNSEPARATED. */
export function defaultPostureAtCreation(): Posture {
  return 'unseparated';
}

/** Separation is OPTIONAL: it is achievable but never forced by the protocol. */
export function isSeparationMandatory(): boolean {
  return false;
}

/** Transition the posture via a user/protocol action. */
export function applyAction(p: Posture, action: 'transferAdminToDistinctKey' | 'recovery' | 'splitAdminFromActive'): Posture {
  switch (action) {
    case 'transferAdminToDistinctKey': return 'separated'; // user separates admin from the spending key
    case 'recovery': return 'unseparatedPostRecovery'; // recovery converges admin == activeWallet
    case 'splitAdminFromActive': return 'separated'; // re-separate after recovery (two-step)
  }
}

/** splitAdminFromActive: only valid in the post-recovery unseparated state; two-step; newAdmin must differ from activeWallet. */
export function splitAdminFromActive(p: Posture, newAdmin: string, activeWallet: string, caller: string, admin: string): R {
  if (caller !== admin) return E('not-admin');
  if (newAdmin === '') return E('zero');
  if (newAdmin === activeWallet) return E('same-admin');
  if (p !== 'unseparatedPostRecovery') return E('no-separation-needed');
  return OK; // sets pendingAdmin; the successor must accept (two-step)
}

/** Whether, in a given posture, the ownerIdentity key (which gates recovery-abort) is the SAME as the hot spending key. */
export function ownerIdentityEqualsHotKey(p: Posture): boolean {
  // unseparated and post-recovery both collapse ownerIdentity onto the hot key; separated does not.
  return p !== 'separated';
}

/** Security outcome of an event under a posture. */
export function outcome(p: Posture, ev: Event): { recoverable: boolean; canGriefRecovery: boolean; note: string } {
  switch (ev) {
    case 'spendingKeyCompromise': {
      const collapsed = ownerIdentityEqualsHotKey(p);
      return {
        recoverable: !collapsed, // separated → recoverable; unseparated → attacker can abort
        canGriefRecovery: collapsed, // unseparated → the compromised hot key == ownerIdentity can abort recovery
        note: collapsed ? 'hot key == ownerIdentity → can abort recovery (OC-4 griefing)' : 'distinct keys → recovery evicts attacker',
      };
    }
    case 'deviceLossAllKeys':
      // all keys lost (not attacker-controlled): guardians recover; nobody can abort (owner has no key)
      return { recoverable: true, canGriefRecovery: false, note: 'keys lost not controlled → guardian recovery proceeds' };
    case 'recovery':
      return { recoverable: true, canGriefRecovery: false, note: 'recovery converges keys; re-separation needed afterward' };
    case 'inheritance':
      // separation does not change inheritance mechanics; more distinct keys = more veto options for a living owner
      return { recoverable: true, canGriefRecovery: false, note: 'inheritance is guardian-initiated + owner-vetoable regardless of posture' };
  }
}

// ── UX surfacing (the Campaign B finding) ────────────────────────────────────
/**
 * Models whether the FRONTEND surfaces each posture concern. Per this audit, ALL of these are false:
 * the three-key model is not explained, separation is not guided, and the RecoverySplitReminder event +
 * splitAdminFromActive flow are contract-only (not consumed by any UI).
 */
export interface UxSurfacing {
  explainsThreeKeys: boolean;
  guidesSeparationInOnboarding: boolean;
  surfacesRecoverySplitReminder: boolean;
  exposesSplitAdminFromActiveAction: boolean;
}
export function currentUxSurfacing(): UxSurfacing {
  return {
    explainsThreeKeys: false,
    guidesSeparationInOnboarding: false,
    surfacesRecoverySplitReminder: false, // RecoverySplitReminderEmitted only in the ABI, no UI consumer
    exposesSplitAdminFromActiveAction: false, // contract-only
  };
}
