import { describe, expect, it } from '@jest/globals';
import {
  authorizeSendVFIDE, authorizeRescueToken,
  validateSplit, distributionAllocation, canExecuteTimelocked, authorizeDistribute,
  validatePayees, splitterAllocation, holdsUserVaultFunds, canReachUserVault,
  MAX_BPS, MAX_SINGLE_BPS, SPLIT_CHANGE_DELAY_H,
} from '@/lib/audit/treasuryModel';

// ════════════════════════════════════════════════════════════════════════
// TREASURY CLUSTER — EcoTreasuryVault / RevenueSplitter / FeeDistributor.
//   These HOLD ecosystem funds (not user funds). Question: no arbitrary drain, bounded splits, authorized + 
//   timelocked changes.
// ════════════════════════════════════════════════════════════════════════

describe('Treasury · A. EcoTreasuryVault — discretionary outflow is DAO-gated, no skim path', () => {
  const ok = { caller: 'dao' as const, to: 'addr' as const, amount: 100, balance: 1000 };
  it('A1 sendVFIDE requires the DAO (routes through the certified DAO → timelock)', () => {
    expect(authorizeSendVFIDE(ok)).toEqual({ ok: true });
    expect(authorizeSendVFIDE({ ...ok, caller: 'admin' })).toEqual({ ok: false, reason: 'NOT_DAO' });
    expect(authorizeSendVFIDE({ ...ok, caller: 'other' })).toEqual({ ok: false, reason: 'NOT_DAO' });
  });
  it('A2 sendVFIDE rejects zero recipient/amount and over-balance', () => {
    expect(authorizeSendVFIDE({ ...ok, to: 'zero' })).toEqual({ ok: false, reason: 'ZERO' });
    expect(authorizeSendVFIDE({ ...ok, amount: 0 })).toEqual({ ok: false, reason: 'ZERO' });
    expect(authorizeSendVFIDE({ ...ok, amount: 2000, balance: 1000 })).toEqual({ ok: false, reason: 'INSUFFICIENT' });
  });
  it('A3 rescueToken CANNOT move the treasury\'s own VFIDE (no skim via rescue)', () => {
    expect(authorizeRescueToken({ caller: 'dao', token: 'vfide', to: 'addr', amount: 100 }))
      .toEqual({ ok: false, reason: 'CANNOT_RESCUE_TREASURY_TOKEN' });
  });
  it('A4 rescueToken works DAO-only for OTHER (accidentally-sent) tokens', () => {
    expect(authorizeRescueToken({ caller: 'dao', token: 'other', to: 'addr', amount: 100 })).toEqual({ ok: true });
    expect(authorizeRescueToken({ caller: 'other', token: 'other', to: 'addr', amount: 100 }))
      .toEqual({ ok: false, reason: 'NOT_DAO' });
  });
});

describe('Treasury · B. FeeDistributor — split must sum to 100%, bounded per sink', () => {
  it('B1 a valid 3-channel split summing to 100% is accepted (e.g. 50/30/20)', () => {
    expect(validateSplit(5000, 3000, 2000)).toEqual({ ok: true });
  });
  it('B2 a split NOT summing to 100% is rejected (cannot under/over-route)', () => {
    expect(validateSplit(5000, 3000, 1000)).toEqual({ ok: false, reason: 'NOT_100_PERCENT' }); // 90%
    expect(validateSplit(5000, 3000, 3000)).toEqual({ ok: false, reason: 'NOT_100_PERCENT' }); // 110%
  });
  it('B3 a single channel over the cap is rejected (cannot route everything to one sink)', () => {
    expect(validateSplit(MAX_SINGLE_BPS + 1, MAX_BPS - MAX_SINGLE_BPS - 1, 0))
      .toEqual({ ok: false, reason: 'SINGLE_TOO_HIGH' });
  });
});

describe('Treasury · C. FeeDistributor — distribution accounts for the FULL balance (nothing skimmable)', () => {
  it('C1 the three allocations always sum to the full balance', () => {
    const a = distributionAllocation(1000, 5000, 3000);
    expect(a.total).toBe(1000);
    expect(a.toDAO).toBe(500);
    expect(a.toMerchants).toBe(300);
    expect(a.toHeadhunters).toBe(200);
  });
  it('C2 rounding remainder goes to the headhunter sink — no dust left behind', () => {
    const a = distributionAllocation(1001, 3333, 3333); // non-even
    expect(a.total).toBe(1001); // full balance still allocated
  });
});

describe('Treasury · D. Timelocked changes (72h) + distribute guards', () => {
  it('D1 a pending split/destination/rescue cannot execute before the 72h delay', () => {
    expect(canExecuteTimelocked({ pending: true, nowH: SPLIT_CHANGE_DELAY_H - 1, effectiveTimeH: SPLIT_CHANGE_DELAY_H })).toBe(false);
  });
  it('D2 it executes once the delay elapses', () => {
    expect(canExecuteTimelocked({ pending: true, nowH: SPLIT_CHANGE_DELAY_H, effectiveTimeH: SPLIT_CHANGE_DELAY_H })).toBe(true);
  });
  it('D3 nothing executes when there is no pending change', () => {
    expect(canExecuteTimelocked({ pending: false, nowH: 1000, effectiveTimeH: 0 })).toBe(false);
  });
  it('D4 distribute is paused-gated, rate-limited, and minimum-gated', () => {
    const ok = { paused: false, nowH: 100, lastDistH: 0, minIntervalH: 24, balance: 1000, minAmount: 100 };
    expect(authorizeDistribute(ok)).toEqual({ ok: true });
    expect(authorizeDistribute({ ...ok, paused: true })).toEqual({ ok: false, reason: 'PAUSED' });
    expect(authorizeDistribute({ ...ok, nowH: 10 })).toEqual({ ok: false, reason: 'TOO_SOON' });
    expect(authorizeDistribute({ ...ok, balance: 50 })).toEqual({ ok: false, reason: 'BELOW_MINIMUM' });
  });
});

describe('Treasury · E. RevenueSplitter — payee shares sum to 100%, no zero-shares, full-balance routing', () => {
  it('E1 payees summing to exactly 100% with no zero-share are valid', () => {
    expect(validatePayees([4000, 3000, 3000])).toEqual({ ok: true });
  });
  it('E2 payees not summing to 100% are rejected', () => {
    expect(validatePayees([4000, 3000, 2000])).toEqual({ ok: false, reason: 'NOT_100_PERCENT' }); // 90%
  });
  it('E3 a zero-share payee is rejected', () => {
    expect(validatePayees([5000, 5000, 0])).toEqual({ ok: false, reason: 'ZERO_SHARE' });
  });
  it('E4 distribution routes the full balance to payees — last payee gets the remainder', () => {
    const alloc = splitterAllocation(1000, [4000, 3000, 3000]);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(1000); // full balance distributed
    expect(alloc[0]).toBe(400);
  });
  it('E5 full-balance routing holds under rounding (last payee absorbs the remainder)', () => {
    const alloc = splitterAllocation(1000, [3333, 3333, 3334]);
    expect(alloc.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe('Treasury · F. Custody boundary — ecosystem funds, not user funds', () => {
  it('F1 the treasury holds ecosystem/protocol funds, NOT user-vault funds', () => {
    expect(holdsUserVaultFunds()).toBe(false);
  });
  it('F2 no treasury path can reach/freeze/seize a user vault', () => {
    expect(canReachUserVault()).toBe(false);
  });
});
