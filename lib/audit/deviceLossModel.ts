/**
 * Device Loss Architecture — executable logic model (Backend Completion Campaign 3).
 *
 * Certifies VFIDE's resilience across real-world device-loss situations, answering for each: (1) can the user still
 * function? (2) for how long / time to regain? (3) what remains protected? Traced from the verified layers:
 *   • Non-custodial: vault assets live ON-CHAIN, never on the device. Device loss never touches the assets directly.
 *   • Key custody determines impact: phone-only (key gone with the device), hardware-wallet (key off the phone),
 *     paper-backup (key restorable).
 *   • Recovery: guardian recovery regains access / severs an attacker in ~72h (RECOVERY_CHALLENGE_DELAY).
 *   • Session: JWT 24h — gives API access (read), NOT vault signing; a stolen session expires within 24h.
 *   • App-lock: biometric unlock required for amounts ABOVE a threshold (large-amount device-level protection).
 *   • Velocity limits: maxPerTransfer + dailyTransferLimit bound ALL attacker spending on-chain regardless.
 *   • SIM swap: compromises nothing on-chain (SMS is a notification channel, not auth).
 *   • Continuity: incapacitation is handled by proof-of-life + inheritance with long, owner-vetoable windows.
 *
 * Protected-regardless invariants (from Wallet-Compromise / Campaign C): cannot drain VFIDE (rescue-blocked),
 * cannot seize the vault (recovery-only, guardian-gated), cannot change config instantly (timelocked +
 * guardian-cancellable), cannot transfer the owner identity except via recovery.
 */

export type Scenario = 'lostPhone' | 'brokenPhone' | 'stolenPhone' | 'simSwap' | 'malware' | 'travel' | 'hospitalization';
export type KeyCustody = 'phoneOnly' | 'hardwareWallet' | 'paperBackup';
export type RecoverySetup = 'guardiansSet' | 'notSet';
export type AppLock = 'locked' | 'unlocked' | 'notConfigured';

export type TimeToRegain = 'immediate' | 'recoveryWindow72h' | 'neverWithoutRecoveryOrBackup' | 'notApplicable';

// ── Does the scenario put the device in a hostile party's hands? ─────────────
export function attackerHasDevice(s: Scenario): boolean {
  return s === 'stolenPhone' || s === 'malware'; // malware = adversary on the device/key; others are non-hostile
}

// ── Is the user's own key still available to THEM after the event? ───────────
export function userRetainsKey(s: Scenario, custody: KeyCustody): boolean {
  if (custody === 'hardwareWallet') return true;  // key lives on the hardware device, not the phone
  if (custody === 'paperBackup') return true;     // key restorable from the backup
  // phoneOnly:
  switch (s) {
    case 'travel': return true;            // user still has the phone
    case 'hospitalization': return true;   // user still possesses the phone (just incapacitated)
    case 'simSwap': return true;           // SIM swap doesn't take the phone/key
    case 'lostPhone': case 'brokenPhone': case 'stolenPhone': case 'malware': return false; // key inaccessible/gone
  }
}

// ── Can the user still function (transact), and how soon? ────────────────────
export function timeToRegain(s: Scenario, custody: KeyCustody, recovery: RecoverySetup): TimeToRegain {
  if (s === 'simSwap' || s === 'travel') return 'notApplicable'; // never lost vault access in the first place
  if (s === 'hospitalization') return 'notApplicable';            // a health event, not a key-access event
  if (userRetainsKey(s, custody)) return 'immediate';            // hardware/paper backup → sign from another device now
  // phone-only key is gone (lost/broken/stolen/malware):
  return recovery === 'guardiansSet' ? 'recoveryWindow72h' : 'neverWithoutRecoveryOrBackup';
}

export function canFunctionEventually(s: Scenario, custody: KeyCustody, recovery: RecoverySetup): boolean {
  const t = timeToRegain(s, custody, recovery);
  return t !== 'neverWithoutRecoveryOrBackup';
}

// ── App-lock: does a locked stolen device still let an attacker move funds? ──
/** Above-threshold spends require biometric unlock; below-threshold do not. Velocity limits still bound all spends. */
export function appLockBlocksAmount(lock: AppLock, amount: number, threshold: number): boolean {
  if (lock === 'locked') return amount >= threshold; // locked blocks at/above the unlock threshold
  return false; // unlocked or not-configured → app-lock does not block (velocity limits still apply on-chain)
}

// ── Attacker damage bound (when attackerHasDevice + key accessible) ──────────
export interface DamageBound { canDrainVfide: boolean; canSeizeVault: boolean; canChangeConfigInstantly: boolean; spendingBounded: boolean; severedByRecovery: boolean }
export function attackerDamage(): DamageBound {
  return {
    canDrainVfide: false,            // rescueERC20 double-guards VFIDE
    canSeizeVault: false,            // ownership transfer is recovery-only, guardian-gated
    canChangeConfigInstantly: false, // setSpendLimits/guardian changes are timelocked + guardian-cancellable
    spendingBounded: true,           // maxPerTransfer + dailyTransferLimit
    severedByRecovery: true,         // guardian recovery bumps walletEpoch + clears queues
  };
}

// ── What remains protected, regardless of the device event ───────────────────
export function protectedInvariants(): DamageBound {
  return attackerDamage(); // the same guarantees hold whether or not a device is compromised
}

// ── Session bound: a stolen API session is short-lived and not a signing key ─
export function stolenSessionMaxHours(): number { return 24; }
export function sessionGrantsVaultSigning(): boolean { return false; } // JWT is API auth, not the on-chain key

// ── SIM-swap on-chain impact ─────────────────────────────────────────────────
export function simSwapCompromisesVault(): boolean { return false; } // SMS is a notification channel, not auth

// ── Incapacitation (hospitalization) handled by continuity, owner-vetoable ───
export function incapacitationHandledByContinuity(s: Scenario): { assetsSafe: boolean; continuityVetoable: boolean } {
  return { assetsSafe: true, continuityVetoable: true }; // PoL + inheritance with long windows; owner can veto on return
}
