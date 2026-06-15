/**
 * Continuity Lock — adversarial + edge scenario matrix (Backend Completion Campaign 12, Wave E — BUILT).
 *
 * Certifies the process-completion lock: it engages exactly during an active non-finalized CLAIM_WINDOW (never
 * during veto), freezes config (anti-hijack), blocks the lone-key override (anti-stall), preserves a
 * guardian-corroborated owner escape, lets heirs complete deterministically, and never moves/seizes funds. Target
 * 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  isLocked, configChangeAllowed, loneOwnerOverrideAllowed, heirProgressAllowedWhileLocked,
  newReclaimState, castGuardianReclaimVote, checkGuardianCorroboratedReclaim,
  lockMovesFunds, lockSeizesFunds, lockEngagesDuringVeto, ownerCanEscapeViaGuardians, loneKeyCanStall,
  configFrozenWhenLocked,
  STATE_NORMAL, STATE_VETO_PERIOD, STATE_CLAIM_WINDOW, STATE_MEMORIAL,
  type LockInputs,
} from '@/lib/audit/continuityLockModel';

const li = (o: Partial<LockInputs> = {}): LockInputs => ({ state: STATE_CLAIM_WINDOW, distributionFinalized: false, ownerReclaimed: false, ...o });
const STATES = [STATE_NORMAL, STATE_VETO_PERIOD, STATE_CLAIM_WINDOW, STATE_MEMORIAL];
const NAME: Record<number, string> = { 0: 'NORMAL', 1: 'VETO', 2: 'CLAIM', 3: 'MEMORIAL' };

// ═════════════════════════════════════════════════════════════════════════════
// A. Lock state machine (state × finalized × reclaimed grid)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.A: lock state machine', () => {
  for (const state of STATES) {
    for (const finalized of [false, true]) {
      for (const reclaimed of [false, true]) {
        const expected = state === STATE_CLAIM_WINDOW && !finalized && !reclaimed;
        it(`LOCK-${NAME[state]}-f${finalized ? 1 : 0}-r${reclaimed ? 1 : 0} → ${expected ? 'LOCKED' : 'unlocked'}`, () => {
          expect(isLocked(li({ state, distributionFinalized: finalized, ownerReclaimed: reclaimed }))).toBe(expected);
        });
      }
    }
  }
  it('LOCK-only-claim the lock engages ONLY in CLAIM_WINDOW', () => {
    expect(isLocked(li({ state: STATE_CLAIM_WINDOW }))).toBe(true);
    expect(isLocked(li({ state: STATE_NORMAL }))).toBe(false);
    expect(isLocked(li({ state: STATE_VETO_PERIOD }))).toBe(false);
    expect(isLocked(li({ state: STATE_MEMORIAL }))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Config freeze (anti-hijack)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.B: config freeze', () => {
  it('CFG-01 config changes blocked while locked', () => expect(configChangeAllowed(li())).toEqual({ ok: false, reason: 'CL_Locked' }));
  it('CFG-02 config changes allowed in NORMAL', () => expect(configChangeAllowed(li({ state: STATE_NORMAL })).ok).toBe(true));
  it('CFG-03 config changes allowed during VETO', () => expect(configChangeAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true));
  it('CFG-04 config changes allowed after finalize (lock released)', () => expect(configChangeAllowed(li({ distributionFinalized: true })).ok).toBe(true));
  it('CFG-05 config changes allowed after owner reclaim', () => expect(configChangeAllowed(li({ ownerReclaimed: true })).ok).toBe(true));
  it('CFG-06 configFrozenWhenLocked invariant holds', () => expect(configFrozenWhenLocked()).toBe(true));
  for (const state of STATES) {
    const blocked = state === STATE_CLAIM_WINDOW;
    it(`CFG-state-${NAME[state]} config change ${blocked ? 'blocked' : 'allowed'}`, () => expect(configChangeAllowed(li({ state })).ok).toBe(!blocked));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Lone-key override block (anti-stall)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.C: lone-key override block', () => {
  it('OVR-01 lone override blocked while locked (cannot stall)', () => expect(loneOwnerOverrideAllowed(li())).toEqual({ ok: false, reason: 'CL_Locked' }));
  it('OVR-02 lone override allowed during VETO (owner defense preserved)', () => expect(loneOwnerOverrideAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true));
  it('OVR-03 lone override allowed in NORMAL', () => expect(loneOwnerOverrideAllowed(li({ state: STATE_NORMAL })).ok).toBe(true));
  it('OVR-04 lone override allowed once finalized (moot)', () => expect(loneOwnerOverrideAllowed(li({ distributionFinalized: true })).ok).toBe(true));
  for (const state of STATES) {
    const blocked = state === STATE_CLAIM_WINDOW;
    it(`OVR-state-${NAME[state]} lone override ${blocked ? 'blocked' : 'allowed'}`, () => expect(loneOwnerOverrideAllowed(li({ state })).ok).toBe(!blocked));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Veto window preservation (owner's single-key defense)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.D: veto window preserved', () => {
  it('VETO-01 lock NEVER engages during the veto window', () => expect(lockEngagesDuringVeto()).toBe(false));
  it('VETO-02 during veto, both config change and lone override are allowed', () => {
    expect(configChangeAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true);
    expect(loneOwnerOverrideAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true);
  });
  it('VETO-03 the owner keeps full single-key control until the veto window closes', () => {
    expect(isLocked(li({ state: STATE_VETO_PERIOD }))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Guardian-corroborated reclaim — vote casting
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.E: guardian reclaim votes', () => {
  it('GV-01 a guardian can vote while locked', () => {
    const rs = newReclaimState();
    expect(castGuardianReclaimVote(rs, 'g1', true, li()).ok).toBe(true);
  });
  it('GV-02 a non-guardian vote is rejected', () => {
    expect(castGuardianReclaimVote(newReclaimState(), 'attacker', false, li())).toEqual({ ok: false, reason: 'CL_NotGuardian' });
  });
  it('GV-03 a duplicate guardian vote is rejected', () => {
    const rs = newReclaimState();
    castGuardianReclaimVote(rs, 'g1', true, li());
    expect(castGuardianReclaimVote(rs, 'g1', true, li())).toEqual({ ok: false, reason: 'CL_AlreadyVoted' });
  });
  it('GV-04 votes cannot be cast when not locked', () => {
    expect(castGuardianReclaimVote(newReclaimState(), 'g1', true, li({ state: STATE_NORMAL }))).toEqual({ ok: false, reason: 'CL_NotLocked' });
    expect(castGuardianReclaimVote(newReclaimState(), 'g1', true, li({ state: STATE_VETO_PERIOD })).ok).toBe(false);
  });
  it('GV-05 distinct guardians accumulate votes', () => {
    const rs = newReclaimState();
    castGuardianReclaimVote(rs, 'g1', true, li());
    castGuardianReclaimVote(rs, 'g2', true, li());
    castGuardianReclaimVote(rs, 'g3', true, li());
    expect(rs.votes.size).toBe(3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Quorum / owner escape boundary
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.F: quorum & escape', () => {
  it('Q-01 escape blocked below threshold', () => {
    const rs = newReclaimState();
    castGuardianReclaimVote(rs, 'g1', true, li());
    expect(checkGuardianCorroboratedReclaim(rs, 3, li())).toEqual({ ok: false, reason: 'CL_QuorumNotReached' });
  });
  it('Q-02 escape allowed at exactly threshold', () => {
    const rs = newReclaimState();
    ['g1', 'g2', 'g3'].forEach((g) => castGuardianReclaimVote(rs, g, true, li()));
    expect(checkGuardianCorroboratedReclaim(rs, 3, li()).ok).toBe(true);
  });
  it('Q-03 escape allowed above threshold', () => {
    const rs = newReclaimState();
    ['g1', 'g2', 'g3', 'g4'].forEach((g) => castGuardianReclaimVote(rs, g, true, li()));
    expect(checkGuardianCorroboratedReclaim(rs, 3, li()).ok).toBe(true);
  });
  it('Q-04 ownerCanEscapeViaGuardians holds when quorum met', () => {
    expect(ownerCanEscapeViaGuardians(3, ['g1', 'g2', 'g3'])).toBe(true);
    expect(ownerCanEscapeViaGuardians(3, ['g1', 'g2'])).toBe(false);
  });
  // threshold sweep
  for (let t = 1; t <= 5; t++) {
    for (let n = 0; n <= 6; n++) {
      const guardians = Array.from({ length: n }, (_, k) => `g${k}`);
      const ok = n >= t;
      it(`QSWEEP-t${t}-n${n} ${n} guardians vs threshold ${t} → ${ok ? 'escape' : 'no escape'}`, () => {
        expect(ownerCanEscapeViaGuardians(t, guardians)).toBe(ok);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Lone-key cannot stall
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.G: lone-key cannot stall', () => {
  for (let t = 1; t <= 5; t++) {
    it(`STALL-t${t} a lone key cannot stall the heirs (threshold ${t})`, () => expect(loneKeyCanStall(t)).toBe(false));
  }
  it('STALL-override a lone key cannot lone-override while locked', () => expect(loneOwnerOverrideAllowed(li()).ok).toBe(false));
  it('STALL-vote a lone key cannot cast a guardian vote', () => expect(castGuardianReclaimVote(newReclaimState(), 'attacker', false, li()).ok).toBe(false));
  it('STALL-quorum a lone key cannot reach the reclaim quorum', () => expect(checkGuardianCorroboratedReclaim(newReclaimState(), 2, li()).ok).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Heir progress always allowed
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.H: heir progress', () => {
  it('HEIR-01 heir progress is never blocked by the lock', () => expect(heirProgressAllowedWhileLocked()).toBe(true));
  it('HEIR-02 the lock exists precisely to let heirs complete deterministically', () => {
    expect(isLocked(li())).toBe(true);          // locked
    expect(heirProgressAllowedWhileLocked()).toBe(true); // yet heirs proceed
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Non-custodial invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.I: non-custodial', () => {
  it('NC-01 the lock never moves funds', () => expect(lockMovesFunds()).toBe(false));
  it('NC-02 the lock never seizes funds', () => expect(lockSeizesFunds()).toBe(false));
  it('NC-03 the lock gates process transitions only (config/override), not custody', () => {
    expect(lockMovesFunds()).toBe(false);
    expect(heirProgressAllowedWhileLocked()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Attack scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.J: attack scenarios', () => {
  it('ATK-hijack a compromised key cannot redirect heirs post-veto (config frozen)', () => {
    expect(configChangeAllowed(li())).toEqual({ ok: false, reason: 'CL_Locked' });
  });
  it('ATK-stall a compromised key cannot repeatedly cancel to stall the heirs', () => {
    expect(loneOwnerOverrideAllowed(li()).ok).toBe(false);
    expect(loneKeyCanStall(2)).toBe(false);
  });
  it('ATK-fake-guardian a single attacker cannot fake a guardian quorum', () => {
    const rs = newReclaimState();
    expect(castGuardianReclaimVote(rs, 'attacker', false, li()).ok).toBe(false);
    expect(checkGuardianCorroboratedReclaim(rs, 2, li()).ok).toBe(false);
  });
  it('ATK-legit-owner a real owner with guardian support CAN still reclaim post-veto', () => {
    expect(ownerCanEscapeViaGuardians(2, ['g1', 'g2'])).toBe(true);
  });
  it('ATK-pre-veto-untouched before the veto window closes, the owner has full single-key control', () => {
    expect(isLocked(li({ state: STATE_VETO_PERIOD }))).toBe(false);
    expect(loneOwnerOverrideAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.K: lifecycle narratives', () => {
  it('LIFE-happy claim → veto passes → LOCKED → heirs complete', () => {
    expect(isLocked(li({ state: STATE_VETO_PERIOD }))).toBe(false); // veto: not locked
    expect(isLocked(li({ state: STATE_CLAIM_WINDOW }))).toBe(true); // claim: locked
    expect(heirProgressAllowedWhileLocked()).toBe(true);
    expect(isLocked(li({ state: STATE_CLAIM_WINDOW, distributionFinalized: true }))).toBe(false); // finalized: released
  });
  it('LIFE-owner-returns claim → veto passes → owner returns with guardians → reclaim → unlocked', () => {
    expect(isLocked(li())).toBe(true);
    expect(ownerCanEscapeViaGuardians(2, ['g1', 'g2'])).toBe(true);
    expect(isLocked(li({ ownerReclaimed: true }))).toBe(false); // reclaim releases the lock
  });
  it('LIFE-owner-vetoes-in-time owner vetoes during the window → no lock ever engages', () => {
    expect(isLocked(li({ state: STATE_VETO_PERIOD }))).toBe(false);
  });
  it('LIFE-compromised-key compromised key tries everything post-veto → fails', () => {
    expect(configChangeAllowed(li()).ok).toBe(false);
    expect(loneOwnerOverrideAllowed(li()).ok).toBe(false);
    expect(loneKeyCanStall(2)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Full guard grid (config + override across state × finalized × reclaimed)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.L: full guard grid', () => {
  for (const state of STATES) {
    for (const finalized of [false, true]) {
      for (const reclaimed of [false, true]) {
        const locked = state === STATE_CLAIM_WINDOW && !finalized && !reclaimed;
        const inp = li({ state, distributionFinalized: finalized, ownerReclaimed: reclaimed });
        it(`GG-cfg-${NAME[state]}-f${finalized ? 1 : 0}-r${reclaimed ? 1 : 0} config ${locked ? 'blocked' : 'allowed'}`, () => {
          expect(configChangeAllowed(inp).ok).toBe(!locked);
        });
        it(`GG-ovr-${NAME[state]}-f${finalized ? 1 : 0}-r${reclaimed ? 1 : 0} override ${locked ? 'blocked' : 'allowed'}`, () => {
          expect(loneOwnerOverrideAllowed(inp).ok).toBe(!locked);
        });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Quorum sweeps (vote-by-vote accumulation toward threshold)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.M: vote accumulation', () => {
  for (const threshold of [2, 3, 4]) {
    it(`ACC-t${threshold} reclaim flips from blocked to allowed exactly at ${threshold} votes`, () => {
      const rs = newReclaimState();
      for (let v = 0; v < threshold + 2; v++) {
        const before = checkGuardianCorroboratedReclaim(rs, threshold, li()).ok;
        expect(before).toBe(rs.votes.size >= threshold);
        castGuardianReclaimVote(rs, `g${v}`, true, li());
      }
    });
  }
  it('ACC-mixed non-guardian votes do not count toward quorum', () => {
    const rs = newReclaimState();
    castGuardianReclaimVote(rs, 'g1', true, li());
    castGuardianReclaimVote(rs, 'attacker1', false, li()); // rejected
    castGuardianReclaimVote(rs, 'attacker2', false, li()); // rejected
    expect(rs.votes.size).toBe(1);
    expect(checkGuardianCorroboratedReclaim(rs, 2, li()).ok).toBe(false);
  });
  it('ACC-dup duplicate guardian votes do not double-count', () => {
    const rs = newReclaimState();
    castGuardianReclaimVote(rs, 'g1', true, li());
    castGuardianReclaimVote(rs, 'g1', true, li()); // rejected
    expect(rs.votes.size).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Reclaim gating by lock state (votes only while locked)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.N: reclaim gating', () => {
  for (const state of STATES) {
    const locked = state === STATE_CLAIM_WINDOW;
    it(`RG-vote-${NAME[state]} guardian vote ${locked ? 'allowed' : 'rejected'}`, () => {
      expect(castGuardianReclaimVote(newReclaimState(), 'g1', true, li({ state })).ok).toBe(locked);
    });
    it(`RG-check-${NAME[state]} reclaim check ${locked ? 'evaluable' : 'rejected (not locked)'}`, () => {
      const rs = newReclaimState();
      if (locked) ['g1', 'g2'].forEach((g) => castGuardianReclaimVote(rs, g, true, li({ state })));
      const res = checkGuardianCorroboratedReclaim(rs, 2, li({ state }));
      expect(res.ok).toBe(locked); // when not locked → CL_NotLocked; when locked with 2 votes & t=2 → ok
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Closing whole-feature invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 12.O: closing invariants', () => {
  it('CLOSE-01 the lock locks PROCESS, not FUNDS', () => {
    expect(lockMovesFunds()).toBe(false);
    expect(lockSeizesFunds()).toBe(false);
    expect(heirProgressAllowedWhileLocked()).toBe(true);
  });
  it('CLOSE-02 the owner is fully protected DURING the veto window', () => {
    expect(lockEngagesDuringVeto()).toBe(false);
    expect(loneOwnerOverrideAllowed(li({ state: STATE_VETO_PERIOD })).ok).toBe(true);
  });
  it('CLOSE-03 after veto, a compromised key can neither hijack nor stall', () => {
    expect(configFrozenWhenLocked()).toBe(true);
    expect(loneKeyCanStall(2)).toBe(false);
  });
  it('CLOSE-04 after veto, a real owner + guardian quorum can still reclaim', () => {
    expect(ownerCanEscapeViaGuardians(2, ['g1', 'g2'])).toBe(true);
  });
  it('CLOSE-05 the lock releases on finalize or on owner reclaim', () => {
    expect(isLocked(li({ distributionFinalized: true }))).toBe(false);
    expect(isLocked(li({ ownerReclaimed: true }))).toBe(false);
  });
});
