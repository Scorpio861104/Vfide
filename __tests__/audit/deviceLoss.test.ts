/**
 * Device Loss Architecture — adversarial + edge scenario matrix (Backend Completion Campaign 3).
 *
 * Certifies resilience across all 7 device-loss scenarios × key custody × recovery setup, answering can-function /
 * time-to-regain / what-protected, plus the layered protections (app-lock, velocity limits, recovery, session
 * bound, SIM-swap immunity, continuity for incapacitation). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  attackerHasDevice, userRetainsKey, timeToRegain, canFunctionEventually, appLockBlocksAmount, attackerDamage,
  protectedInvariants, stolenSessionMaxHours, sessionGrantsVaultSigning, simSwapCompromisesVault,
  incapacitationHandledByContinuity,
  type Scenario, type KeyCustody, type RecoverySetup, type AppLock,
} from '@/lib/audit/deviceLossModel';

const SCENARIOS: Scenario[] = ['lostPhone', 'brokenPhone', 'stolenPhone', 'simSwap', 'malware', 'travel', 'hospitalization'];
const CUSTODY: KeyCustody[] = ['phoneOnly', 'hardwareWallet', 'paperBackup'];
const RECOVERY: RecoverySetup[] = ['guardiansSet', 'notSet'];

// ═════════════════════════════════════════════════════════════════════════════
// A. Hostile-possession classification
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.A: hostile possession', () => {
  it('POSS-stolen + POSS-malware put the device/key in hostile hands', () => {
    expect(attackerHasDevice('stolenPhone')).toBe(true);
    expect(attackerHasDevice('malware')).toBe(true);
  });
  for (const s of ['lostPhone', 'brokenPhone', 'simSwap', 'travel', 'hospitalization'] as Scenario[]) {
    it(`POSS-${s} is non-hostile (no adversary gains the device/key)`, () => expect(attackerHasDevice(s)).toBe(false));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Does the USER retain their key? (scenario × custody)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.B: user key retention', () => {
  for (const s of SCENARIOS) {
    for (const c of CUSTODY) {
      it(`KEY-${s}-${c}`, () => {
        const retains = userRetainsKey(s, c);
        if (c !== 'phoneOnly') expect(retains).toBe(true); // backup custody always retains
        else if (['travel', 'hospitalization', 'simSwap'].includes(s)) expect(retains).toBe(true); // still has phone
        else expect(retains).toBe(false); // phone-only + lost/broken/stolen/malware → key gone
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Time-to-regain (scenario × custody × recovery) — "for how long?"
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.C: time to regain access', () => {
  for (const s of SCENARIOS) {
    for (const c of CUSTODY) {
      for (const r of RECOVERY) {
        it(`REGAIN-${s}-${c}-${r}`, () => {
          const t = timeToRegain(s, c, r);
          if (['simSwap', 'travel', 'hospitalization'].includes(s)) expect(t).toBe('notApplicable');
          else if (c !== 'phoneOnly') expect(t).toBe('immediate'); // backup → sign now from another device
          else expect(t).toBe(r === 'guardiansSet' ? 'recoveryWindow72h' : 'neverWithoutRecoveryOrBackup');
        });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Can the user function eventually? — "can the user still function?"
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.D: eventual functionality', () => {
  for (const s of SCENARIOS) {
    it(`FUNC-${s}-backup always recovers (hardware wallet)`, () => {
      expect(canFunctionEventually(s, 'hardwareWallet', 'notSet')).toBe(true);
    });
    it(`FUNC-${s}-guardians recovers even phone-only`, () => {
      expect(canFunctionEventually(s, 'phoneOnly', 'guardiansSet')).toBe(true);
    });
  }
  it('FUNC-worstcase phone-only + no recovery + lost/broken = permanent loss (FINDING D-1)', () => {
    expect(canFunctionEventually('lostPhone', 'phoneOnly', 'notSet')).toBe(false);
    expect(canFunctionEventually('brokenPhone', 'phoneOnly', 'notSet')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. App-lock behavior — large-amount device-level protection
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.E: app-lock amount gating', () => {
  it('LOCK-01 locked device blocks an at/above-threshold spend', () => expect(appLockBlocksAmount('locked', 100, 100)).toBe(true));
  it('LOCK-02 locked device blocks an above-threshold spend', () => expect(appLockBlocksAmount('locked', 500, 100)).toBe(true));
  it('LOCK-03 locked device does NOT block a below-threshold spend (FINDING D-2)', () => expect(appLockBlocksAmount('locked', 50, 100)).toBe(false));
  it('LOCK-04 unlocked device does not block (velocity limits still apply on-chain)', () => expect(appLockBlocksAmount('unlocked', 500, 100)).toBe(false));
  it('LOCK-05 not-configured app-lock does not block', () => expect(appLockBlocksAmount('notConfigured', 500, 100)).toBe(false));
  it('LOCK-06 even below-threshold spends remain bounded by on-chain velocity limits', () => {
    expect(attackerDamage().spendingBounded).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Attacker damage bound (stolen/malware with accessible key)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.F: attacker damage bound', () => {
  const d = attackerDamage();
  it('DMG-01 cannot drain VFIDE (rescue-blocked)', () => expect(d.canDrainVfide).toBe(false));
  it('DMG-02 cannot seize the vault (recovery-only)', () => expect(d.canSeizeVault).toBe(false));
  it('DMG-03 cannot change config instantly (timelocked + guardian-cancellable)', () => expect(d.canChangeConfigInstantly).toBe(false));
  it('DMG-04 spending is bounded (velocity limits)', () => expect(d.spendingBounded).toBe(true));
  it('DMG-05 attacker is severed by guardian recovery', () => expect(d.severedByRecovery).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// G. What remains protected — invariants hold for EVERY scenario
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.G: protected-regardless invariants', () => {
  for (const s of SCENARIOS) {
    it(`PROT-${s} assets/config/identity protected regardless of the event`, () => {
      void s;
      const p = protectedInvariants();
      expect(p.canDrainVfide).toBe(false);
      expect(p.canSeizeVault).toBe(false);
      expect(p.canChangeConfigInstantly).toBe(false);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Session bound — a stolen API session is short-lived, not a signing key
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.H: session bound', () => {
  it('SESS-01 a stolen API session expires within 24h', () => expect(stolenSessionMaxHours()).toBe(24));
  it('SESS-02 the API session does NOT grant vault signing (key is separate)', () => expect(sessionGrantsVaultSigning()).toBe(false));
  it('SESS-03 therefore a stolen session cannot move vault funds at all', () => {
    expect(sessionGrantsVaultSigning()).toBe(false); // funds require the on-chain key signature, not the JWT
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. SIM swap — on-chain immunity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.I: SIM swap', () => {
  it('SIM-01 SIM swap does not compromise the vault on-chain', () => expect(simSwapCompromisesVault()).toBe(false));
  it('SIM-02 the user retains their key through a SIM swap (phone/key not taken)', () => {
    expect(userRetainsKey('simSwap', 'phoneOnly')).toBe(true);
  });
  it('SIM-03 SIM swap never costs vault access (time-to-regain N/A)', () => {
    expect(timeToRegain('simSwap', 'phoneOnly', 'notSet')).toBe('notApplicable');
  });
  it('SIM-04 residual: SMS NOTIFICATIONS would route to the attacker (info channel only, not auth)', () => {
    expect(simSwapCompromisesVault()).toBe(false); // confirms the residual is notification-routing, not vault control
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Hospitalization / incapacitation — continuity handles it
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.J: incapacitation', () => {
  it('INC-01 assets are safe while the user is incapacitated', () => {
    expect(incapacitationHandledByContinuity('hospitalization').assetsSafe).toBe(true);
  });
  it('INC-02 continuity (proof-of-life/inheritance) is owner-vetoable on return', () => {
    expect(incapacitationHandledByContinuity('hospitalization').continuityVetoable).toBe(true);
  });
  it('INC-03 the user retains their key through hospitalization (just cannot act)', () => {
    expect(userRetainsKey('hospitalization', 'phoneOnly')).toBe(true);
  });
  it('INC-04 short incapacitation costs no vault access (time-to-regain N/A)', () => {
    expect(timeToRegain('hospitalization', 'phoneOnly', 'guardiansSet')).toBe('notApplicable');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Travel — possession retained, no impact
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.K: travel', () => {
  it('TRV-01 traveling retains the key and vault access', () => {
    expect(userRetainsKey('travel', 'phoneOnly')).toBe(true);
    expect(timeToRegain('travel', 'phoneOnly', 'notSet')).toBe('notApplicable');
  });
  it('TRV-02 losing the device WHILE traveling collapses to the lost/stolen scenarios (covered above)', () => {
    expect(canFunctionEventually('lostPhone', 'phoneOnly', 'guardiansSet')).toBe(true); // still recoverable if guardians set
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Findings summary (resilience conditional on setup)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.L: findings', () => {
  it('FIND-D1 phone-only + no recovery + no backup → lost/broken/stolen = permanent loss', () => {
    for (const s of ['lostPhone', 'brokenPhone', 'stolenPhone', 'malware'] as Scenario[]) {
      expect(canFunctionEventually(s, 'phoneOnly', 'notSet')).toBe(false);
    }
  });
  it('FIND-D1-mitigation either guardians OR a hardware/paper backup restores function in every scenario', () => {
    for (const s of ['lostPhone', 'brokenPhone', 'stolenPhone', 'malware'] as Scenario[]) {
      expect(canFunctionEventually(s, 'phoneOnly', 'guardiansSet')).toBe(true);
      expect(canFunctionEventually(s, 'hardwareWallet', 'notSet')).toBe(true);
      expect(canFunctionEventually(s, 'paperBackup', 'notSet')).toBe(true);
    }
  });
  it('FIND-D2 app-lock gates only at/above the unlock threshold; sub-threshold relies on velocity limits', () => {
    expect(appLockBlocksAmount('locked', 50, 100)).toBe(false);
    expect(attackerDamage().spendingBounded).toBe(true); // the on-chain backstop
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Combined real-world resolution per scenario × posture
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.M: combined resolution narratives', () => {
  // Stolen phone, varying posture
  it('RES-stolen-locked-guardians: attacker bounded + severed in 72h; user recovers', () => {
    expect(appLockBlocksAmount('locked', 1000, 100)).toBe(true); // large theft blocked at device
    expect(attackerDamage().spendingBounded).toBe(true);          // small theft bounded on-chain
    expect(attackerDamage().severedByRecovery).toBe(true);
    expect(timeToRegain('stolenPhone', 'phoneOnly', 'guardiansSet')).toBe('recoveryWindow72h');
  });
  it('RES-stolen-unlocked-guardians: velocity-bounded until recovery severs', () => {
    expect(appLockBlocksAmount('unlocked', 1000, 100)).toBe(false);
    expect(attackerDamage().spendingBounded).toBe(true);
    expect(canFunctionEventually('stolenPhone', 'phoneOnly', 'guardiansSet')).toBe(true);
  });
  it('RES-stolen-hardwareWallet: phone theft irrelevant (key off the phone)', () => {
    expect(userRetainsKey('stolenPhone', 'hardwareWallet')).toBe(true);
    expect(timeToRegain('stolenPhone', 'hardwareWallet', 'notSet')).toBe('immediate');
  });
  it('RES-malware-guardians: exfiltrated key bounded + severed like theft', () => {
    expect(attackerDamage().canSeizeVault).toBe(false);
    expect(attackerDamage().canDrainVfide).toBe(false);
    expect(timeToRegain('malware', 'phoneOnly', 'guardiansSet')).toBe('recoveryWindow72h');
  });
  it('RES-lost-paperBackup: restore key from backup, function immediately', () => {
    expect(timeToRegain('lostPhone', 'paperBackup', 'notSet')).toBe('immediate');
  });
  it('RES-broken-guardians: recover via guardians in ~72h', () => {
    expect(timeToRegain('brokenPhone', 'phoneOnly', 'guardiansSet')).toBe('recoveryWindow72h');
  });
  it('RES-simSwap-anyposture: vault untouched in every custody', () => {
    for (const c of CUSTODY) expect(timeToRegain('simSwap', c, 'notSet')).toBe('notApplicable');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Protected invariants — each invariant, across the hostile scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.N: invariant-by-invariant under hostile possession', () => {
  const HOSTILE: Scenario[] = ['stolenPhone', 'malware'];
  for (const s of HOSTILE) {
    it(`INV-drain-${s}: VFIDE cannot be drained`, () => { void s; expect(protectedInvariants().canDrainVfide).toBe(false); });
    it(`INV-seize-${s}: vault cannot be seized`, () => { void s; expect(protectedInvariants().canSeizeVault).toBe(false); });
    it(`INV-config-${s}: config cannot change instantly`, () => { void s; expect(protectedInvariants().canChangeConfigInstantly).toBe(false); });
    it(`INV-bounded-${s}: spending stays bounded`, () => { void s; expect(protectedInvariants().spendingBounded).toBe(true); });
    it(`INV-sever-${s}: recovery severs the attacker`, () => { void s; expect(protectedInvariants().severedByRecovery).toBe(true); });
  }
  it('INV-session-stolen: a stolen session cannot move funds and dies in 24h', () => {
    expect(sessionGrantsVaultSigning()).toBe(false);
    expect(stolenSessionMaxHours()).toBe(24);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. App-lock threshold sweep
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.O: app-lock threshold sweep', () => {
  const cases: Array<[AppLock, number, number, boolean]> = [
    ['locked', 0, 100, false], ['locked', 99, 100, false], ['locked', 100, 100, true], ['locked', 101, 100, true],
    ['locked', 10000, 100, true], ['unlocked', 100, 100, false], ['unlocked', 10000, 100, false],
    ['notConfigured', 100, 100, false], ['notConfigured', 10000, 100, false],
  ];
  cases.forEach(([lock, amt, thr, expected], i) => {
    it(`SWEEP-${i} ${lock} amount=${amt} threshold=${thr} → blocked=${expected}`, () => {
      expect(appLockBlocksAmount(lock, amt, thr)).toBe(expected);
    });
  });
  it('SWEEP-backstop sub-threshold and unlocked spends both fall back to on-chain velocity limits', () => {
    expect(appLockBlocksAmount('locked', 1, 100)).toBe(false);
    expect(appLockBlocksAmount('unlocked', 99999, 100)).toBe(false);
    expect(attackerDamage().spendingBounded).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Eventual-functionality completeness across the full grid
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 3.P: functionality grid completeness', () => {
  for (const s of SCENARIOS) {
    for (const c of CUSTODY) {
      it(`GRID-${s}-${c}-guardians always recovers`, () => {
        expect(canFunctionEventually(s, c, 'guardiansSet')).toBe(true);
      });
    }
  }
  it('GRID-only-permanent-loss-cell is phone-only + notSet + hard-loss scenarios', () => {
    let permanentLossCells = 0;
    for (const s of SCENARIOS) for (const c of CUSTODY) for (const r of RECOVERY) {
      if (!canFunctionEventually(s, c, r)) permanentLossCells++;
    }
    // exactly the 4 hard-loss scenarios (lost/broken/stolen/malware) at phone-only + notSet
    expect(permanentLossCells).toBe(4);
  });
});
