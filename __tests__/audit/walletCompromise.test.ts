/**
 * Wallet Compromise Scenario Matrix — adversarial matrix (OC campaign, Capability 6).
 *
 * For each off-chain vector: what is EXPOSED, what stays PROTECTED, can the vault be RECOVERED.
 * The throughline: no single compromise grants instant escalation (limits/config timelocked, VFIDE un-rescuable),
 * the hot key is blast-radius-bounded, and recovery works — with ONE documented tension when the account-identity
 * key is unseparated from the hot key.
 */
import { describe, it, expect } from '@jest/globals';
import {
  keysCompromised, exposureOf, assess, maxLossPerDay, type KeyPosture,
} from '@/lib/audit/walletCompromiseModel';

const SEPARATED: KeyPosture = { separated: true };
const UNSEPARATED: KeyPosture = { separated: false };

// ─────────────────────────────────────────────────────────────────────────────
// Universal protections — true for EVERY compromise
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap6 universal protections (hold under any compromise)', () => {
  const vectors = ['stolenPhone', 'malware', 'keyCompromise', 'simSwap', 'deviceTheft'] as const;
  it.each(vectors)('UNIV-01 [%s] limits can NEVER be raised instantly (7d timelock)', (v) => {
    expect(assess(v, UNSEPARATED).exposure.canRaiseLimitsInstantly).toBe(false);
  });
  it.each(vectors)('UNIV-02 [%s] VFIDE can NEVER be drained via rescue (double-guard)', (v) => {
    expect(assess(v, UNSEPARATED).exposure.canDrainVfideViaRescue).toBe(false);
  });
  it.each(vectors)('UNIV-03 [%s] config can NEVER be changed instantly (timelocked + guardian-cancellable)', (v) => {
    expect(assess(v, UNSEPARATED).exposure.canChangeConfigInstantly).toBe(false);
  });
  it.each(vectors)('UNIV-04 [%s] vault ownership can NEVER be seized (__forceSetOwner removed)', (v) => {
    expect(assess(v, UNSEPARATED).exposure.vaultOwnershipSeized).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-scenario breakdown
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap6 scenario: SIM swap', () => {
  it('SIM-01 a SIM swap compromises NO on-chain key (no phone-number authority)', () => {
    expect(keysCompromised('simSwap', UNSEPARATED).size).toBe(0);
    const e = exposureOf(keysCompromised('simSwap', UNSEPARATED));
    expect(e.canDirectSpend).toBe(false); // nothing is exposed
    expect(e.recoverableByGuardians).toBe(true);
  });
});

describe('Cap6 scenario: wallet key compromise (hot spending key)', () => {
  it('KEY-01 exposes bounded direct spend only — capped at the daily limit per day', () => {
    const { exposure } = assess('keyCompromise', SEPARATED);
    expect(exposure.canDirectSpend).toBe(true);
    expect(maxLossPerDay(3000, exposure)).toBe(3000); // bounded — not the whole vault
    expect(exposure.canRaiseLimitsInstantly).toBe(false);
  });
  it('KEY-02 with keys SEPARATED, a hot-key compromise is fully recoverable (cannot abort recovery)', () => {
    const { exposure } = assess('keyCompromise', SEPARATED);
    expect(exposure.canAbortRecovery).toBe(false);
    expect(exposure.recoverableByGuardians).toBe(true);
  });
});

describe('Cap6 scenario: stolen phone / device theft', () => {
  it('THEFT-01 SEPARATED posture: only the hot key is lost; admin + identity stay safe; recoverable', () => {
    const { keys, exposure } = assess('deviceTheft', SEPARATED);
    expect(keys.has('activeWallet')).toBe(true);
    expect(keys.has('admin')).toBe(false);
    expect(keys.has('ownerOfVault')).toBe(false);
    expect(exposure.recoverableByGuardians).toBe(true);
  });
  it('THEFT-02 UNSEPARATED posture (default): all keys on one device — still cannot escalate or seize', () => {
    const { exposure } = assess('deviceTheft', UNSEPARATED);
    // even the worst case cannot raise limits, drain VFIDE, change config instantly, or seize ownership
    expect(exposure.canRaiseLimitsInstantly).toBe(false);
    expect(exposure.canDrainVfideViaRescue).toBe(false);
    expect(exposure.vaultOwnershipSeized).toBe(false);
  });
});

describe('Cap6 scenario: malware', () => {
  it('MAL-01 worst case exfiltrates the hot key; tricked signatures are still limit-bounded', () => {
    const { exposure } = assess('malware', SEPARATED);
    expect(exposure.canDirectSpend).toBe(true);
    expect(maxLossPerDay(1000, exposure)).toBe(1000); // a tricked signature still cannot exceed the cap
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The documented tension — recovery-abort when account-identity is unseparated
// ─────────────────────────────────────────────────────────────────────────────
describe('Cap6 recovery-abort tension (the one finding)', () => {
  it('ABORT-01 SEPARATED: a hot-key compromise CANNOT abort recovery — guardians evict the attacker', () => {
    expect(assess('deviceTheft', SEPARATED).exposure.canAbortRecovery).toBe(false);
    expect(assess('deviceTheft', SEPARATED).exposure.recoverableByGuardians).toBe(true);
  });
  it('ABORT-02 UNSEPARATED (default): identity == hot key, so the attacker CAN abort recovery (griefing)', () => {
    const { exposure } = assess('deviceTheft', UNSEPARATED);
    expect(exposure.canAbortRecovery).toBe(true); // the documented tension
    expect(exposure.recoverableByGuardians).toBe(false); // blocked while the attacker keeps aborting
    // BUT still bounded: cannot escalate beyond the daily spend limit
    expect(exposure.canRaiseLimitsInstantly).toBe(false);
    expect(exposure.canDrainVfideViaRescue).toBe(false);
  });
  it('ABORT-03 separation is the mitigation that already exists in the architecture', () => {
    // The same attack, the only difference is key posture — separation closes it.
    expect(assess('deviceTheft', UNSEPARATED).exposure.canAbortRecovery).toBe(true);
    expect(assess('deviceTheft', SEPARATED).exposure.canAbortRecovery).toBe(false);
  });
});
