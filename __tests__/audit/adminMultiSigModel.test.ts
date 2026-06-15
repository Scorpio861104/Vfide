import { describe, expect, it } from '@jest/globals';
import {
  authorizeCreateProposal, requiredApprovals, isApproved, delayHours,
  authorizeExecute, authorizeCommunityVeto, authorizeParamSetter, authorizeCouncilUpdate,
  holdsUserFunds, canFreezeOrSeizeUserFunds,
  REQUIRED_APPROVALS, EMERGENCY_APPROVALS, VETO_MIN_SCORE, PROPOSAL_EXPIRY_DAYS, VETO_WINDOW_H,
  CONFIG_DELAY_H, CRITICAL_DELAY_H, EMERGENCY_DELAY_H,
  type ProposalType,
} from '@/lib/audit/adminMultiSigModel';

// ════════════════════════════════════════════════════════════════════════
// ADMIN MULTISIG — 3/5 council, allowlisted calls, timelock, community veto, self-governance
//   The contract makes a low-level target.call — this matrix proves that call is BOUNDED on every axis and that
//   the multisig is non-custodial.
// ════════════════════════════════════════════════════════════════════════

const okCreate = {
  isCouncil: true, targetAllowed: true, selectorAllowed: true,
  hasTarget: true, hasData: true, hasDescription: true,
};

describe('AdminMultiSig · A. Proposal creation — council-only + (target, selector) allowlist', () => {
  it('A1 a non-council caller cannot create a proposal', () => {
    expect(authorizeCreateProposal({ ...okCreate, isCouncil: false }))
      .toEqual({ ok: false, reason: 'NOT_COUNCIL' });
  });
  it('A2 a non-allowlisted TARGET is rejected (cannot point the multisig at an arbitrary contract)', () => {
    expect(authorizeCreateProposal({ ...okCreate, targetAllowed: false }))
      .toEqual({ ok: false, reason: 'TARGET_NOT_ALLOWED' });
  });
  it('A3 a non-allowlisted SELECTOR is rejected (cannot call an arbitrary function on an allowed target)', () => {
    expect(authorizeCreateProposal({ ...okCreate, selectorAllowed: false }))
      .toEqual({ ok: false, reason: 'SELECTOR_NOT_ALLOWED' });
  });
  it('A4 a fully-allowlisted council proposal is accepted', () => {
    expect(authorizeCreateProposal(okCreate)).toEqual({ ok: true });
  });
});

describe('AdminMultiSig · B. Approval threshold', () => {
  it('B1 CONFIG/CRITICAL require 3 approvals; EMERGENCY requires 4', () => {
    expect(requiredApprovals('CONFIG')).toBe(REQUIRED_APPROVALS);
    expect(requiredApprovals('CRITICAL')).toBe(REQUIRED_APPROVALS);
    expect(requiredApprovals('EMERGENCY')).toBe(EMERGENCY_APPROVALS);
  });
  it('B2 below-threshold approvals do NOT approve (a lone or pair of members cannot pass a proposal)', () => {
    expect(isApproved('CONFIG', 1)).toBe(false);
    expect(isApproved('CONFIG', 2)).toBe(false);
    expect(isApproved('CONFIG', 3)).toBe(true);
  });
  it('B3 EMERGENCY needs the full 4 — 3 is not enough', () => {
    expect(isApproved('EMERGENCY', 3)).toBe(false);
    expect(isApproved('EMERGENCY', 4)).toBe(true);
  });
});

describe('AdminMultiSig · C. Type-based timelock', () => {
  it('C1 delays: CONFIG 24h, CRITICAL 48h, EMERGENCY 1h', () => {
    expect(delayHours('CONFIG')).toBe(CONFIG_DELAY_H);
    expect(delayHours('CRITICAL')).toBe(CRITICAL_DELAY_H);
    expect(delayHours('EMERGENCY')).toBe(EMERGENCY_DELAY_H);
  });
});

const okExec = {
  isCouncil: true, type: 'CONFIG' as ProposalType, approvalCount: 3,
  nowH: 30, executionTimeH: 24, createdAtH: 0,
  vetoCount: 0, vetoThreshold: 100, targetStillAllowed: true,
};

describe('AdminMultiSig · D. Execution gates — every protection fires before the call', () => {
  it('D1 a non-approved proposal cannot execute', () => {
    expect(authorizeExecute({ ...okExec, approvalCount: 2 })).toEqual({ ok: false, reason: 'NOT_APPROVED' });
  });
  it('D2 execution before the timelock elapses is rejected', () => {
    expect(authorizeExecute({ ...okExec, nowH: 10 })).toEqual({ ok: false, reason: 'TOO_EARLY' });
  });
  it('D3 a community-vetoed proposal (vetoCount ≥ threshold) cannot execute', () => {
    expect(authorizeExecute({ ...okExec, vetoCount: 100 })).toEqual({ ok: false, reason: 'VETOED' });
  });
  it('D4 a non-emergency proposal past its veto window cannot execute', () => {
    expect(authorizeExecute({ ...okExec, nowH: 24 + VETO_WINDOW_H + 1 }))
      .toEqual({ ok: false, reason: 'VETO_WINDOW_EXPIRED' });
  });
  it('D5 an EMERGENCY proposal has no veto-window cap (executes past 24h+ window, within expiry)', () => {
    // 200h is well past a non-emergency veto window (25h) but within the 30-day (720h) expiry — proving the
    // veto-window cap does not apply to EMERGENCY, while expiry still does (covered by D6).
    expect(authorizeExecute({ ...okExec, type: 'EMERGENCY', approvalCount: 4, executionTimeH: 1, nowH: 200 }))
      .toEqual({ ok: true });
  });
  it('D6 a proposal past the 30-day expiry cannot execute', () => {
    expect(authorizeExecute({ ...okExec, nowH: PROPOSAL_EXPIRY_DAYS * 24 + 1 }))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });
  it('D7 #406: a target de-allowlisted between propose and execute cannot be called', () => {
    expect(authorizeExecute({ ...okExec, targetStillAllowed: false }))
      .toEqual({ ok: false, reason: 'TARGET_NO_LONGER_ALLOWED' });
  });
  it('D8 a fully-satisfied proposal executes', () => {
    expect(authorizeExecute(okExec)).toEqual({ ok: true });
  });
  it('D9 a non-council caller cannot execute', () => {
    expect(authorizeExecute({ ...okExec, isCouncil: false })).toEqual({ ok: false, reason: 'NOT_COUNCIL' });
  });
});

describe('AdminMultiSig · E. Community veto eligibility — sybil-resistant, un-buyable', () => {
  it('E1 a fresh default-score vault (score < 5000) cannot veto, even with stake', () => {
    expect(authorizeCommunityVeto({ seerSet: true, vfideSet: true, vetoMinStake: 10_000, callerScore: 4999, callerStake: 1_000_000 }))
      .toEqual({ ok: false, reason: 'SCORE_TOO_LOW' });
  });
  it('E2 a high-score but under-staked caller cannot veto in production (score AND stake required)', () => {
    expect(authorizeCommunityVeto({ seerSet: true, vfideSet: true, vetoMinStake: 10_000, callerScore: 8000, callerStake: 9_999 }))
      .toEqual({ ok: false, reason: 'STAKE_TOO_LOW' });
  });
  it('E3 a high-score, sufficiently-staked caller may veto', () => {
    expect(authorizeCommunityVeto({ seerSet: true, vfideSet: true, vetoMinStake: 10_000, callerScore: VETO_MIN_SCORE, callerStake: 10_000 }))
      .toEqual({ ok: true });
  });
  it('E4 H-10: veto is blocked entirely when no gate is configured (no permissionless bootstrap veto)', () => {
    expect(authorizeCommunityVeto({ seerSet: false, vfideSet: false, vetoMinStake: 0, callerScore: 9000, callerStake: 0 }))
      .toEqual({ ok: false, reason: 'GATE_UNSET' });
  });
  it('E5 fallback (seer unset): a sufficiently-staked caller may veto via the token gate', () => {
    expect(authorizeCommunityVeto({ seerSet: false, vfideSet: true, vetoMinStake: 10_000, callerScore: 0, callerStake: 10_000 }))
      .toEqual({ ok: true });
  });
});

describe('AdminMultiSig · F. Self-governance — no lone member can change anything', () => {
  it('F1 parameter setters require the proposal-execution context (msg.sender == this + active proposal)', () => {
    expect(authorizeParamSetter(true)).toBe(true);
    expect(authorizeParamSetter(false)).toBe(false); // a direct call by a council member is rejected
  });
  it('F2 council replacement requires an EMERGENCY (4/5) execution — a minority cannot swap seats', () => {
    expect(authorizeCouncilUpdate({ viaEmergencyExecution: false, indexInRange: true, newMemberNonZero: true, newMemberIsDuplicate: false })).toBe(false);
    expect(authorizeCouncilUpdate({ viaEmergencyExecution: true, indexInRange: true, newMemberNonZero: true, newMemberIsDuplicate: false })).toBe(true);
  });
  it('F3 council replacement rejects zero address, out-of-range index, or a duplicate member', () => {
    expect(authorizeCouncilUpdate({ viaEmergencyExecution: true, indexInRange: false, newMemberNonZero: true, newMemberIsDuplicate: false })).toBe(false);
    expect(authorizeCouncilUpdate({ viaEmergencyExecution: true, indexInRange: true, newMemberNonZero: false, newMemberIsDuplicate: false })).toBe(false);
    expect(authorizeCouncilUpdate({ viaEmergencyExecution: true, indexInRange: true, newMemberNonZero: true, newMemberIsDuplicate: true })).toBe(false);
  });
});

describe('AdminMultiSig · G. Non-custodial', () => {
  it('G1 holds no user funds and exposes no freeze/seize over user vaults', () => {
    expect(holdsUserFunds()).toBe(false);
    expect(canFreezeOrSeizeUserFunds()).toBe(false);
  });
});
