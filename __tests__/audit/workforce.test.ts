/**
 * Workforce — adversarial + edge scenario matrix (Backend Completion Campaign 5).
 *
 * Certifies the PayrollManager streaming system: create validation, access control per role, wage-preservation on
 * cancel/reclaim, bounded pause, payee-change + emergency-withdraw timelocks, stream caps, and the off-chain↔on-chain
 * boundary (self-funded streams, no shared pool, no ghost-employee / manager-self-pay vector). Findings WF-1
 * (staff↔payroll not integrated). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  attempt, cancelPreservesAccruedWages, employerCanClawBackEarnedWages, payerCanFreezeWagesIndefinitely,
  streamsSelfFunded, sharedPoolEmbezzlementPossible, offchainRoleCanCreateStream, managerCanSelfPayWithoutEmployerKey,
  staffAndPayrollIntegrated, daoPayrollIsGovernedPayer,
  PAYEE_UPDATE_DELAY_H, EMERGENCY_WITHDRAW_DELAY_D, MAX_PAUSE_DURATION_D, MIN_RATE, STREAM_CAP,
  type StreamState, type Role, type Action, type Ctx,
} from '@/lib/audit/workforceModel';

const ROLES: Role[] = ['payer', 'payee', 'dao', 'thirdParty'];
const STATES: StreamState[] = ['active', 'paused', 'cancelled', 'expired'];

const ctx = (o: Partial<Ctx> = {}): Ctx => ({
  state: 'active', supportedToken: true, rate: MIN_RATE, deposit: 1000,
  payerStreamCount: 0, payeeStreamCount: 0, hoursSincePayeeUpdateRequested: 99,
  daysSinceEmergencyRequested: 99, daysSincePaused: 99, validPayee: true, ...o,
});

// ═════════════════════════════════════════════════════════════════════════════
// A. createStream validation
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.A: createStream validation', () => {
  it('CREATE-01 valid stream accepted', () => expect(attempt('createStream', 'payer', ctx()).ok).toBe(true));
  it('CREATE-02 zero payee rejected', () => expect(attempt('createStream', 'payer', ctx({ validPayee: false }))).toEqual({ ok: false, reason: 'PM_InvalidPayee' }));
  it('CREATE-03 unsupported token rejected', () => expect(attempt('createStream', 'payer', ctx({ supportedToken: false }))).toEqual({ ok: false, reason: 'unsupported token' }));
  it('CREATE-04 zero rate rejected', () => expect(attempt('createStream', 'payer', ctx({ rate: 0 }))).toEqual({ ok: false, reason: 'PM_InvalidRate' }));
  it('CREATE-05 below-min rate rejected', () => expect(attempt('createStream', 'payer', ctx({ rate: MIN_RATE - 1 }))).toEqual({ ok: false, reason: 'rate too low' }));
  it('CREATE-06 zero deposit rejected', () => expect(attempt('createStream', 'payer', ctx({ deposit: 0 }))).toEqual({ ok: false, reason: 'PM_InvalidDeposit' }));
  it('CREATE-07 payer at stream cap rejected', () => expect(attempt('createStream', 'payer', ctx({ payerStreamCount: STREAM_CAP }))).toEqual({ ok: false, reason: 'payer stream cap' }));
  it('CREATE-08 payee at stream cap rejected (anti-griefing)', () => expect(attempt('createStream', 'payer', ctx({ payeeStreamCount: STREAM_CAP }))).toEqual({ ok: false, reason: 'payee stream cap' }));
  it('CREATE-09 payer just below cap accepted', () => expect(attempt('createStream', 'payer', ctx({ payerStreamCount: STREAM_CAP - 1 })).ok).toBe(true));
  it('CREATE-10 min rate exactly accepted', () => expect(attempt('createStream', 'payer', ctx({ rate: MIN_RATE })).ok).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Access control per action × role
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.B: access control', () => {
  it('AC-withdraw only payee', () => {
    for (const r of ROLES) expect(attempt('withdraw', r, ctx()).ok).toBe(r === 'payee');
  });
  it('AC-pause payer or DAO', () => {
    for (const r of ROLES) expect(attempt('pause', r, ctx({ state: 'active' })).ok).toBe(r === 'payer' || r === 'dao');
  });
  it('AC-updatePayee only payer', () => {
    for (const r of ROLES) expect(attempt('updatePayee', r, ctx()).ok).toBe(r === 'payer');
  });
  it('AC-cancel payer or payee', () => {
    for (const r of ROLES) expect(attempt('cancel', r, ctx()).ok).toBe(r === 'payer' || r === 'payee');
  });
  it('AC-emergencyWithdraw only DAO', () => {
    for (const r of ROLES) expect(attempt('emergencyWithdraw', r, ctx()).ok).toBe(r === 'dao');
  });
  it('AC-reclaimAfterExpiry payer or payee only (L-3, no permissionless griefing)', () => {
    for (const r of ROLES) expect(attempt('reclaimAfterExpiry', r, ctx({ state: 'expired' })).ok).toBe(r === 'payer' || r === 'payee');
  });
  it('AC-addFunds permissionless (only adds funds)', () => {
    for (const r of ROLES) expect(attempt('addFunds', r, ctx()).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Wage preservation — employer cannot claw back earned wages
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.C: wage preservation', () => {
  it('WAGE-01 cancel pays payee accrued first, remainder to payer', () => expect(cancelPreservesAccruedWages()).toBe(true));
  it('WAGE-02 employer cannot claw back already-earned wages by any path', () => expect(employerCanClawBackEarnedWages()).toBe(false));
  it('WAGE-03 a payer cancelling does not forfeit the payee\'s earned wages', () => {
    expect(attempt('cancel', 'payer', ctx()).ok).toBe(true); // allowed, but contract pays payee first
    expect(cancelPreservesAccruedWages()).toBe(true);
  });
  it('WAGE-04 reclaim after expiry still preserves the payee\'s claimable wages', () => {
    expect(attempt('reclaimAfterExpiry', 'payer', ctx({ state: 'expired' })).ok).toBe(true);
    expect(employerCanClawBackEarnedWages()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Bounded pause — payee force-resume after MAX_PAUSE_DURATION
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.D: bounded pause', () => {
  it('PAUSE-01 payer can pause an active stream', () => expect(attempt('pause', 'payer', ctx({ state: 'active' })).ok).toBe(true));
  it('PAUSE-02 payer/DAO can resume anytime', () => {
    expect(attempt('resume', 'payer', ctx({ state: 'paused', daysSincePaused: 0 })).ok).toBe(true);
    expect(attempt('resume', 'dao', ctx({ state: 'paused', daysSincePaused: 0 })).ok).toBe(true);
  });
  it('PAUSE-03 payee CANNOT resume before MAX_PAUSE_DURATION', () => {
    expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: MAX_PAUSE_DURATION_D - 1 }))).toEqual({ ok: false, reason: 'pause not elapsed' });
  });
  it('PAUSE-04 payee CAN force-resume at MAX_PAUSE_DURATION', () => {
    expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: MAX_PAUSE_DURATION_D })).ok).toBe(true);
  });
  it('PAUSE-05 employer cannot freeze wages indefinitely', () => expect(payerCanFreezeWagesIndefinitely()).toBe(false));
  it('PAUSE-06 a third party cannot pause or resume', () => {
    expect(attempt('pause', 'thirdParty', ctx({ state: 'active' })).ok).toBe(false);
    expect(attempt('resume', 'thirdParty', ctx({ state: 'paused' })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Payee-change timelock (48h)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.E: payee-change timelock', () => {
  it('PAYEE-01 only payer requests a payee change', () => {
    expect(attempt('updatePayee', 'payer', ctx()).ok).toBe(true);
    expect(attempt('updatePayee', 'payee', ctx()).ok).toBe(false);
  });
  it('PAYEE-02 apply blocked before 48h (old payee can withdraw first)', () => {
    expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: PAYEE_UPDATE_DELAY_H - 1 }))).toEqual({ ok: false, reason: 'payee timelock' });
  });
  it('PAYEE-03 apply allowed at 48h', () => {
    expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: PAYEE_UPDATE_DELAY_H })).ok).toBe(true);
  });
  it('PAYEE-04 a few hours after request still blocked', () => {
    expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: 5 })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Emergency-withdraw DAO-only + 7d timelock
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.F: emergency withdraw', () => {
  it('EMER-01 only DAO can request', () => {
    for (const r of ROLES) expect(attempt('emergencyWithdraw', r, ctx()).ok).toBe(r === 'dao');
  });
  it('EMER-02 apply blocked before 7d', () => {
    expect(attempt('applyEmergencyWithdraw', 'dao', ctx({ daysSinceEmergencyRequested: EMERGENCY_WITHDRAW_DELAY_D - 1 }))).toEqual({ ok: false, reason: 'emergency timelock' });
  });
  it('EMER-03 apply allowed at 7d', () => {
    expect(attempt('applyEmergencyWithdraw', 'dao', ctx({ daysSinceEmergencyRequested: EMERGENCY_WITHDRAW_DELAY_D })).ok).toBe(true);
  });
  it('EMER-04 a payer cannot use emergency withdraw to claw back wages', () => {
    expect(attempt('emergencyWithdraw', 'payer', ctx()).ok).toBe(false);
    expect(attempt('applyEmergencyWithdraw', 'payer', ctx({ daysSinceEmergencyRequested: 99 })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Off-chain ↔ on-chain boundary (ghost-employee / self-pay surface)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.G: payment boundary', () => {
  it('BND-01 streams are self-funded (payer = funder)', () => expect(streamsSelfFunded()).toBe(true));
  it('BND-02 no shared pool exists to embezzle via a ghost employee', () => expect(sharedPoolEmbezzlementPossible()).toBe(false));
  it('BND-03 no off-chain staff role can create an on-chain stream from employer funds', () => {
    for (const r of ['admin', 'manager', 'cashier'] as const) expect(offchainRoleCanCreateStream(r)).toBe(false);
  });
  it('BND-04 a manager cannot self-pay without the employer\'s signing key', () => {
    expect(managerCanSelfPayWithoutEmployerKey()).toBe(false);
  });
  it('BND-05 because streams are self-funded, a "ghost employee" only pays the creator\'s own money (not theft)', () => {
    expect(streamsSelfFunded()).toBe(true);
    expect(sharedPoolEmbezzlementPossible()).toBe(false);
  });
  it('BND-06 DAO payroll, where present, is a governed DAO-as-payer flow (no single-key embezzlement)', () => {
    expect(daoPayrollIsGovernedPayer()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. State-machine guards per action × state
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.H: state-machine guards', () => {
  it('SM-pause-only-active pause rejected unless active', () => {
    for (const s of STATES) expect(attempt('pause', 'payer', ctx({ state: s })).ok).toBe(s === 'active');
  });
  it('SM-resume-only-paused resume rejected unless paused', () => {
    for (const s of STATES) expect(attempt('resume', 'payer', ctx({ state: s })).ok).toBe(s === 'paused');
  });
  it('SM-withdraw-not-cancelled payee withdraw rejected on a cancelled stream', () => {
    expect(attempt('withdraw', 'payee', ctx({ state: 'cancelled' })).ok).toBe(false);
  });
  it('SM-cancel-not-twice cancel rejected on an already-cancelled stream', () => {
    expect(attempt('cancel', 'payer', ctx({ state: 'cancelled' })).ok).toBe(false);
  });
  it('SM-reclaim-only-expired reclaim rejected unless expired', () => {
    for (const s of STATES) expect(attempt('reclaimAfterExpiry', 'payer', ctx({ state: s })).ok).toBe(s === 'expired');
  });
  it('SM-addFunds-active-or-paused addFunds rejected on cancelled/expired', () => {
    expect(attempt('addFunds', 'payer', ctx({ state: 'active' })).ok).toBe(true);
    expect(attempt('addFunds', 'payer', ctx({ state: 'paused' })).ok).toBe(true);
    expect(attempt('addFunds', 'payer', ctx({ state: 'cancelled' })).ok).toBe(false);
    expect(attempt('addFunds', 'payer', ctx({ state: 'expired' })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.I: findings', () => {
  it('FIND-WF1 off-chain staff roles and on-chain PayrollManager are NOT integrated', () => {
    expect(staffAndPayrollIntegrated()).toBe(false);
  });
  it('FIND-WF1-safe the separation is SAFE — no off-chain→on-chain payment bridge exists', () => {
    for (const r of ['admin', 'manager', 'cashier'] as const) expect(offchainRoleCanCreateStream(r)).toBe(false);
    expect(managerCanSelfPayWithoutEmployerKey()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Full action × role authorization matrix
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.J: action × role matrix', () => {
  const M: Array<{ action: Action; authorized: Role[]; over: Partial<Ctx> }> = [
    { action: 'createStream', authorized: ['payer', 'payee', 'dao', 'thirdParty'], over: {} },
    { action: 'addFunds', authorized: ['payer', 'payee', 'dao', 'thirdParty'], over: {} },
    { action: 'withdraw', authorized: ['payee'], over: {} },
    { action: 'pause', authorized: ['payer', 'dao'], over: { state: 'active' } },
    { action: 'resume', authorized: ['payer', 'dao', 'payee'], over: { state: 'paused', daysSincePaused: 99 } },
    { action: 'updatePayee', authorized: ['payer'], over: {} },
    { action: 'applyPayeeUpdate', authorized: ['payer', 'payee', 'dao', 'thirdParty'], over: { hoursSincePayeeUpdateRequested: 99 } },
    { action: 'cancel', authorized: ['payer', 'payee'], over: {} },
    { action: 'emergencyWithdraw', authorized: ['dao'], over: {} },
    { action: 'applyEmergencyWithdraw', authorized: ['dao'], over: { daysSinceEmergencyRequested: 99 } },
    { action: 'reclaimAfterExpiry', authorized: ['payer', 'payee'], over: { state: 'expired' } },
  ];
  for (const { action, authorized, over } of M) {
    for (const role of ROLES) {
      it(`AXR-${action}-${role} → ${authorized.includes(role) ? 'allow' : 'deny'}`, () => {
        expect(attempt(action, role, ctx(over)).ok).toBe(authorized.includes(role));
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Action × state validity (state-dependent actions)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.K: action × state matrix', () => {
  const M: Array<{ action: Action; role: Role; valid: StreamState[] }> = [
    { action: 'addFunds', role: 'payer', valid: ['active', 'paused'] },
    { action: 'withdraw', role: 'payee', valid: ['active', 'paused', 'expired'] },
    { action: 'pause', role: 'payer', valid: ['active'] },
    { action: 'resume', role: 'payer', valid: ['paused'] },
    { action: 'cancel', role: 'payer', valid: ['active', 'paused', 'expired'] },
    { action: 'reclaimAfterExpiry', role: 'payer', valid: ['expired'] },
  ];
  for (const { action, role, valid } of M) {
    for (const state of STATES) {
      it(`AXS-${action}-${state} → ${valid.includes(state) ? 'valid' : 'invalid'}`, () => {
        expect(attempt(action, role, ctx({ state, daysSincePaused: 99 })).ok).toBe(valid.includes(state));
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.L: lifecycle narratives', () => {
  it('LIFE-hire create → employee withdraws accrued → payer cancels (payee keeps earned)', () => {
    expect(attempt('createStream', 'payer', ctx()).ok).toBe(true);
    expect(attempt('withdraw', 'payee', ctx()).ok).toBe(true);
    expect(attempt('cancel', 'payer', ctx()).ok).toBe(true);
    expect(employerCanClawBackEarnedWages()).toBe(false);
  });
  it('LIFE-pause-abuse payer pauses → payee force-resumes after 30d', () => {
    expect(attempt('pause', 'payer', ctx({ state: 'active' })).ok).toBe(true);
    expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: 29 })).ok).toBe(false);
    expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: 30 })).ok).toBe(true);
  });
  it('LIFE-payee-change payer requests change → waits 48h → applies (old payee withdrew in window)', () => {
    expect(attempt('updatePayee', 'payer', ctx()).ok).toBe(true);
    expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: 47 })).ok).toBe(false);
    expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: 48 })).ok).toBe(true);
  });
  it('LIFE-employee-quits payee cancels their own stream (allowed)', () => {
    expect(attempt('cancel', 'payee', ctx()).ok).toBe(true);
  });
  it('LIFE-dao-rescue DAO emergency-withdraws a stuck stream after 7d', () => {
    expect(attempt('emergencyWithdraw', 'dao', ctx()).ok).toBe(true);
    expect(attempt('applyEmergencyWithdraw', 'dao', ctx({ daysSinceEmergencyRequested: 7 })).ok).toBe(true);
  });
  it('LIFE-expiry stream expires → payer/payee reclaim (payee claimable preserved)', () => {
    expect(attempt('reclaimAfterExpiry', 'payer', ctx({ state: 'expired' })).ok).toBe(true);
    expect(attempt('reclaimAfterExpiry', 'payee', ctx({ state: 'expired' })).ok).toBe(true);
  });
  it('LIFE-topup anyone can add funds to keep a stream solvent', () => {
    expect(attempt('addFunds', 'thirdParty', ctx()).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Timelock granular sweeps
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.M: timelock sweeps', () => {
  [0, 24, 47].forEach((h) => it(`PAYEE-TL-${h}h blocked before 48h`, () => expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: h })).ok).toBe(false)));
  [48, 72].forEach((h) => it(`PAYEE-TL-${h}h-ok allowed from 48h`, () => expect(attempt('applyPayeeUpdate', 'payer', ctx({ hoursSincePayeeUpdateRequested: h })).ok).toBe(true)));
  [0, 3, 6].forEach((d) => it(`EMER-TL-${d}d blocked before 7d`, () => expect(attempt('applyEmergencyWithdraw', 'dao', ctx({ daysSinceEmergencyRequested: d })).ok).toBe(false)));
  [7, 14].forEach((d) => it(`EMER-TL-${d}d-ok allowed from 7d`, () => expect(attempt('applyEmergencyWithdraw', 'dao', ctx({ daysSinceEmergencyRequested: d })).ok).toBe(true)));
  [0, 15, 29].forEach((d) => it(`PAUSE-TL-${d}d payee blocked before 30d`, () => expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: d })).ok).toBe(false)));
  [30, 45].forEach((d) => it(`PAUSE-TL-${d}d-ok payee allowed from 30d`, () => expect(attempt('resume', 'payee', ctx({ state: 'paused', daysSincePaused: d })).ok).toBe(true)));
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Additional boundary + create-validation combos
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.N: additional edges', () => {
  it('EDGE-01 a manager/cashier path never reaches stream creation', () => {
    expect(offchainRoleCanCreateStream('manager')).toBe(false);
    expect(offchainRoleCanCreateStream('cashier')).toBe(false);
    expect(offchainRoleCanCreateStream('admin')).toBe(false);
  });
  it('EDGE-02 create with both bad rate and bad deposit reports rate first', () => {
    expect(attempt('createStream', 'payer', ctx({ rate: 0, deposit: 0 }))).toEqual({ ok: false, reason: 'PM_InvalidRate' });
  });
  it('EDGE-03 create with unsupported token and bad payee reports payee first', () => {
    expect(attempt('createStream', 'payer', ctx({ supportedToken: false, validPayee: false }))).toEqual({ ok: false, reason: 'PM_InvalidPayee' });
  });
  it('EDGE-04 both caps full → payer cap reported first', () => {
    expect(attempt('createStream', 'payer', ctx({ payerStreamCount: STREAM_CAP, payeeStreamCount: STREAM_CAP }))).toEqual({ ok: false, reason: 'payer stream cap' });
  });
  it('EDGE-05 a third party cannot withdraw another employee\'s wages', () => {
    expect(attempt('withdraw', 'thirdParty', ctx()).ok).toBe(false);
    expect(attempt('withdraw', 'payer', ctx()).ok).toBe(false);
  });
  it('EDGE-06 wage preservation holds whether payer or payee cancels', () => {
    expect(attempt('cancel', 'payer', ctx()).ok).toBe(true);
    expect(attempt('cancel', 'payee', ctx()).ok).toBe(true);
    expect(cancelPreservesAccruedWages()).toBe(true);
  });
  it('EDGE-07 DAO can pause (operator) but still cannot claw wages on cancel', () => {
    expect(attempt('pause', 'dao', ctx({ state: 'active' })).ok).toBe(true);
    expect(employerCanClawBackEarnedWages()).toBe(false);
  });
  it('EDGE-08 self-funded means a "ghost employee" spends only the creator\'s own money', () => {
    expect(streamsSelfFunded()).toBe(true);
    expect(sharedPoolEmbezzlementPossible()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 5.O: closing invariants', () => {
  it('CLOSE-01 every wage-claw-back path is closed (cancel, reclaim, emergency, pause)', () => {
    expect(employerCanClawBackEarnedWages()).toBe(false);
    expect(payerCanFreezeWagesIndefinitely()).toBe(false);
    expect(attempt('emergencyWithdraw', 'payer', ctx()).ok).toBe(false); // employer can't use the DAO escape hatch
  });
  it('CLOSE-02 the off-chain→on-chain payment bridge is fully closed across all staff roles', () => {
    for (const r of ['admin', 'manager', 'cashier'] as const) expect(offchainRoleCanCreateStream(r)).toBe(false);
    expect(managerCanSelfPayWithoutEmployerKey()).toBe(false);
  });
  it('CLOSE-03 the only embezzlement precondition (a shared pool) does not exist', () => {
    expect(sharedPoolEmbezzlementPossible()).toBe(false);
    expect(streamsSelfFunded()).toBe(true);
  });
  it('CLOSE-04 WF-1 is a completeness gap (not integrated), not a safety hole', () => {
    expect(staffAndPayrollIntegrated()).toBe(false); // the gap
    expect(managerCanSelfPayWithoutEmployerKey()).toBe(false); // but safe
  });
});
