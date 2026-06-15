/**
 * Wallet Compromise Scenario Matrix — executable logic model (OC campaign, Capability 6).
 *
 * Maps each off-chain attack VECTOR (stolen phone, malware, key compromise, SIM swap, device theft) onto the
 * on-chain KEY whose compromise it implies, then enumerates what is EXPOSED, what stays PROTECTED, and whether
 * the vault is RECOVERABLE. Grounded in the verified architecture:
 *
 *   THREE distinct keys (start equal at creation, diverge once the user separates them):
 *     • activeWallet  — HOT spending key. Signs direct-spend intents. Rotatable (proposeWalletRotation / recovery).
 *     • admin         — config key. Proposes guardian/limit/PoL/rescue changes — ALL timelocked + guardian-cancellable.
 *     • ownerOfVault  — hub account-identity anchor. Gates abortRecoveryRotation. Changes ONLY via recovery.
 *
 *   Verified invariants used below:
 *     • Direct spend is bounded by per-tx + daily limits + large-payment queue; needs the activeWallet SIGNATURE.
 *     • setSpendLimits is timelocked 7d — limits cannot be raised instantly by ANY compromise.
 *     • rescueERC20 cannot touch VFIDE (double-guarded) — no admin-drain of the protocol asset.
 *     • Recovery rotates activeWallet (72h challenge, M-of-N approvers) and clears queues + invalidates intents.
 *     • The SIM/phone-number has NO on-chain authority — the contracts have no SMS/2FA dependency.
 *
 * NOT the compiled contract; a green hardhat run is the stage-2 confirmation.
 */

export type OnChainKey = 'activeWallet' | 'admin' | 'ownerOfVault';
export type Vector = 'stolenPhone' | 'malware' | 'keyCompromise' | 'simSwap' | 'deviceTheft';

/** Whether the user has separated the hot spending key from the account-identity / config keys. */
export interface KeyPosture {
  separated: boolean; // true = activeWallet is a distinct key from admin & ownerOfVault
}

/** What an attacker holding a given set of compromised keys can and cannot do. */
export interface Exposure {
  canDirectSpend: boolean; // sign bounded direct-spend intents (capped by limits)
  canRaiseLimitsInstantly: boolean; // raise per-tx/daily caps with no delay
  canDrainVfideViaRescue: boolean; // pull full VFIDE balance bypassing limits
  canChangeConfigInstantly: boolean; // guardians/PoL/threshold with no delay
  canAbortRecovery: boolean; // block guardian recovery via abortRecoveryRotation
  vaultOwnershipSeized: boolean; // reassign ownership / seize the vault outright
  recoverableByGuardians: boolean; // can guardians rotate the wallet to evict the attacker
}

/** Map a vector + posture to the set of on-chain keys it compromises (worst-case realistic assumption). */
export function keysCompromised(vector: Vector, posture: KeyPosture): Set<OnChainKey> {
  switch (vector) {
    case 'simSwap':
      // No on-chain key depends on the phone number — SIM swap compromises NOTHING on-chain.
      return new Set();
    case 'keyCompromise':
      // Exfiltration of the hot signing key only.
      return new Set(['activeWallet', ...(posture.separated ? [] : (['admin', 'ownerOfVault'] as OnChainKey[]))]);
    case 'malware':
      // Malware can lift keys present on the device (the hot key at minimum) or trick a signature (still bounded).
      return new Set(['activeWallet', ...(posture.separated ? [] : (['admin', 'ownerOfVault'] as OnChainKey[]))]);
    case 'stolenPhone':
    case 'deviceTheft':
      // Worst case: every key kept on the single device. If separated (cold admin/identity elsewhere), only the hot key.
      return posture.separated ? new Set(['activeWallet']) : new Set(['activeWallet', 'admin', 'ownerOfVault']);
  }
}

/** Derive the attacker's exposure from the compromised key set. */
export function exposureOf(keys: Set<OnChainKey>): Exposure {
  const hasSpending = keys.has('activeWallet');
  const hasConfig = keys.has('admin');
  const hasIdentity = keys.has('ownerOfVault');
  return {
    canDirectSpend: hasSpending, // bounded by limits + queue regardless
    canRaiseLimitsInstantly: false, // setSpendLimits is timelocked 7d — NEVER instant
    canDrainVfideViaRescue: false, // rescueERC20 double-guards VFIDE — NEVER
    canChangeConfigInstantly: false, // all admin config changes are timelocked + guardian-cancellable
    canAbortRecovery: hasIdentity, // ONLY the account-identity key can abort recovery
    vaultOwnershipSeized: false, // __forceSetOwner removed — ownership cannot be reassigned by anyone
    // Guardians can always rotate the wallet UNLESS the attacker also holds the identity key and keeps aborting.
    recoverableByGuardians: !hasIdentity,
  };
}

/** Convenience: full assessment for a vector + posture. */
export function assess(vector: Vector, posture: KeyPosture): { keys: Set<OnChainKey>; exposure: Exposure } {
  const keys = keysCompromised(vector, posture);
  return { keys, exposure: exposureOf(keys) };
}

/** The bounded worst-case loss while an attacker holds the hot key: daily limit per day until recovery. */
export function maxLossPerDay(dailyTransferLimit: number, exposure: Exposure): number {
  return exposure.canDirectSpend ? dailyTransferLimit : 0;
}
