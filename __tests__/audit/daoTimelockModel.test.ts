import { describe, expect, it } from '@jest/globals';
import {
  authorizeQueue, authorizeExecute, authorizeExecuteBySecondary,
  validSetDelay, authorizeEmergencyReduce, authorizeParamSetter, authorizeCancel,
  authorizeRequeue, requeuedEtaH, holdsUserFunds, canFreezeOrSeizeUserFunds,
  ABSOLUTE_MIN_DELAY_H, MAX_DELAY_H, EXPIRY_WINDOW_H, RISK_EXTRA_DELAY_H, SECONDARY_EXECUTOR_DELAY_H,
} from '@/lib/audit/daoTimelockModel';

// ════════════════════════════════════════════════════════════════════════
// DAO TIMELOCK — queue → wait `delay` → execute. The lock cannot be bypassed or collapsed.
// ════════════════════════════════════════════════════════════════════════

const okExec = {
  caller: 'admin' as const, isSelfAdminRotation: false,
  queued: true, done: false, nowH: 100, etaH: 48, globalRisk: false,
};

describe('DAOTimelock · A. Queue gating', () => {
  it('A1 only the admin may queue a transaction', () => {
    expect(authorizeQueue('admin')).toBe(true);
    expect(authorizeQueue('other')).toBe(false);
    expect(authorizeQueue('secondaryExecutor')).toBe(false);
  });
});

describe('DAOTimelock · B. Execute — the core timelock guarantee', () => {
  it('B1 an un-queued op cannot execute', () => {
    expect(authorizeExecute({ ...okExec, queued: false })).toEqual({ ok: false, reason: 'NOT_QUEUED' });
  });
  it('B2 an already-executed op cannot execute again (no double-execution)', () => {
    expect(authorizeExecute({ ...okExec, done: true })).toEqual({ ok: false, reason: 'ALREADY_DONE' });
  });
  it('B3 execution BEFORE the delay elapses is rejected (the core guarantee)', () => {
    expect(authorizeExecute({ ...okExec, nowH: 47, etaH: 48 })).toEqual({ ok: false, reason: 'TOO_EARLY' });
  });
  it('B4 execution exactly at ETA is allowed', () => {
    expect(authorizeExecute({ ...okExec, nowH: 48, etaH: 48 })).toEqual({ ok: true });
  });
  it('B5 execution after the 7-day expiry window is rejected', () => {
    expect(authorizeExecute({ ...okExec, nowH: 48 + EXPIRY_WINDOW_H + 1, etaH: 48 }))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });
  it('B6 under global risk, execution needs an EXTRA 6h — risk LENGTHENS the delay, never shortens it', () => {
    expect(authorizeExecute({ ...okExec, globalRisk: true, nowH: 48 + RISK_EXTRA_DELAY_H - 1, etaH: 48 }))
      .toEqual({ ok: false, reason: 'RISK_DELAY' });
    expect(authorizeExecute({ ...okExec, globalRisk: true, nowH: 48 + RISK_EXTRA_DELAY_H, etaH: 48 }))
      .toEqual({ ok: true });
  });
});

describe('DAOTimelock · C. Execution authorization + tiny permissionless carve-out', () => {
  it('C1 a non-admin cannot execute an ordinary queued op', () => {
    expect(authorizeExecute({ ...okExec, caller: 'other', isSelfAdminRotation: false }))
      .toEqual({ ok: false, reason: 'NOT_AUTHORIZED' });
  });
  it('C2 a non-admin MAY execute ONLY a queued self-setAdmin rotation (deadlock recovery)', () => {
    expect(authorizeExecute({ ...okExec, caller: 'other', isSelfAdminRotation: true }))
      .toEqual({ ok: true });
  });
  it('C3 the admin can execute any ripe queued op', () => {
    expect(authorizeExecute({ ...okExec, caller: 'admin' })).toEqual({ ok: true });
  });
});

describe('DAOTimelock · D. Secondary executor — adds delay, never rushes', () => {
  const base = { caller: 'secondaryExecutor' as const, secondarySet: true, queued: true, done: false, etaH: 48 };
  it('D1 the secondary executor must wait an EXTRA 3 days beyond ETA', () => {
    expect(authorizeExecuteBySecondary({ ...base, nowH: 48 + SECONDARY_EXECUTOR_DELAY_H - 1 }))
      .toEqual({ ok: false, reason: 'TOO_EARLY' });
    expect(authorizeExecuteBySecondary({ ...base, nowH: 48 + SECONDARY_EXECUTOR_DELAY_H }))
      .toEqual({ ok: true });
  });
  it('D2 a non-secondary caller cannot use the secondary path', () => {
    expect(authorizeExecuteBySecondary({ ...base, caller: 'admin', nowH: 1000 }))
      .toEqual({ ok: false, reason: 'NOT_AUTHORIZED' });
  });
  it('D3 the secondary path is still expiry-bounded', () => {
    expect(authorizeExecuteBySecondary({ ...base, nowH: 48 + EXPIRY_WINDOW_H + 1 }))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });
});

describe('DAOTimelock · E. Delay floor — the lock cannot be collapsed', () => {
  it('E1 setDelay must be within [24h, 30d]', () => {
    expect(validSetDelay(ABSOLUTE_MIN_DELAY_H)).toBe(true);
    expect(validSetDelay(MAX_DELAY_H)).toBe(true);
    expect(validSetDelay(ABSOLUTE_MIN_DELAY_H - 1)).toBe(false); // below absolute min
    expect(validSetDelay(MAX_DELAY_H + 1)).toBe(false);          // above max
  });

  const okReduce = { currentDelayH: 48, newDelayH: 24, alreadyUsed: false, resetElapsed: false, cooldownElapsed: true };
  it('E2 emergencyReduceDelay can halve the delay (48h→24h) when fresh + cooldown elapsed', () => {
    expect(authorizeEmergencyReduce(okReduce)).toEqual({ ok: true });
  });
  it('E3 cannot reduce BELOW the 24h absolute minimum', () => {
    expect(authorizeEmergencyReduce({ ...okReduce, currentDelayH: 40, newDelayH: 20 }))
      .toEqual({ ok: false, reason: 'BELOW_ABSOLUTE_MIN' });
  });
  it('E4 cannot reduce by MORE than 50% in one call', () => {
    expect(authorizeEmergencyReduce({ ...okReduce, currentDelayH: 96, newDelayH: 24 }))
      .toEqual({ ok: false, reason: 'OVER_50_PERCENT' }); // 24 < 96/2
  });
  it('E5 cannot "reduce" to an equal or higher value', () => {
    expect(authorizeEmergencyReduce({ ...okReduce, currentDelayH: 48, newDelayH: 48 }))
      .toEqual({ ok: false, reason: 'NOT_A_REDUCTION' });
  });
  it('E6 is rate-limited by a 24h cooldown', () => {
    expect(authorizeEmergencyReduce({ ...okReduce, cooldownElapsed: false }))
      .toEqual({ ok: false, reason: 'COOLDOWN' });
  });
  it('E7 is one-shot until the 30-day reset elapses', () => {
    expect(authorizeEmergencyReduce({ ...okReduce, alreadyUsed: true, resetElapsed: false }))
      .toEqual({ ok: false, reason: 'ALREADY_USED' });
    // after the reset window, it becomes available again
    expect(authorizeEmergencyReduce({ ...okReduce, alreadyUsed: true, resetElapsed: true }))
      .toEqual({ ok: true });
  });
});

describe('DAOTimelock · F. Self-governed parameters + cancel/requeue', () => {
  it('F1 admin/delay/executor/ledger/panicGuard setters require the timelock-self context', () => {
    expect(authorizeParamSetter('timelockSelf')).toBe(true);
    expect(authorizeParamSetter('admin')).toBe(false);  // even the admin cannot set these directly
    expect(authorizeParamSetter('other')).toBe(false);
  });
  it('F2 cancel may be called by admin or the timelock itself (post-rotation DAO-as-admin)', () => {
    expect(authorizeCancel('admin')).toBe(true);
    expect(authorizeCancel('timelockSelf')).toBe(true);
    expect(authorizeCancel('other')).toBe(false);
  });
  it('F3 requeueExpired is admin-only and ONLY on a genuinely expired op', () => {
    expect(authorizeRequeue({ caller: 'admin', queued: true, done: false, expired: true })).toBe(true);
    expect(authorizeRequeue({ caller: 'admin', queued: true, done: false, expired: false })).toBe(false); // not expired
    expect(authorizeRequeue({ caller: 'other', queued: true, done: false, expired: true })).toBe(false);  // not admin
    expect(authorizeRequeue({ caller: 'admin', queued: true, done: true, expired: true })).toBe(false);   // already executed
  });
  it('F4 a re-queued op restarts the FULL delay (an expired action cannot be instantly re-sprung)', () => {
    const now = 1000;
    const delay = 48;
    expect(requeuedEtaH(now, delay)).toBe(now + delay); // fresh ETA = now + full delay
  });
});

describe('DAOTimelock · G. Non-custodial', () => {
  it('G1 holds no user funds and cannot freeze/seize user vault funds', () => {
    expect(holdsUserFunds()).toBe(false);
    expect(canFreezeOrSeizeUserFunds()).toBe(false);
  });
});
