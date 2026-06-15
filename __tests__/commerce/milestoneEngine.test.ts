import { describe, expect, it } from '@jest/globals';
import {
  canTransition, canFund, canSubmit, decideAccept, decideReject, acceptanceDeadline,
  autoAcceptIfElapsed, engagementComplete,
  type MilestoneView, type MilestoneStatus,
} from '@/lib/commerce/milestoneEngine';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;
const M = (o: Partial<MilestoneView> = {}): MilestoneView => ({ status: 'funded', escrow_id: 1, acceptance_deadline: null, ...o });

// ════════════════════════════════════════════════════════
// PROFESSIONAL SERVICES PHASE 2 — MILESTONE ACCEPTANCE SCENARIO MATRIX
//   A. State transitions   B. Funding gate   C. Submission gate   D. Accept decision
//   E. Reject (reasoned)   F. Silence = acceptance (auto-release)   G. Completion   H. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 2 · A. State transitions', () => {
  it('A1 defined→funded valid', () => expect(canTransition('defined', 'funded')).toBe(true));
  it('A2 funded→submitted valid', () => expect(canTransition('funded', 'submitted')).toBe(true));
  it('A3 submitted→accepted valid', () => expect(canTransition('submitted', 'accepted')).toBe(true));
  it('A4 submitted→in_dispute valid (reject)', () => expect(canTransition('submitted', 'in_dispute')).toBe(true));
  it('A5 accepted→released valid', () => expect(canTransition('accepted', 'released')).toBe(true));
  it('A6 released is terminal', () => expect(canTransition('released', 'accepted')).toBe(false));
  it('A7 cannot skip funded (defined→submitted invalid)', () => expect(canTransition('defined', 'submitted')).toBe(false));
  it('A8 in_dispute can resolve to released or refunded', () => {
    expect(canTransition('in_dispute', 'released')).toBe(true);
    expect(canTransition('in_dispute', 'refunded')).toBe(true);
  });
});

describe('Phase 2 · B. Funding gate', () => {
  it('B1 a defined milestone with no escrow can be funded', () => expect(canFund(M({ status: 'defined', escrow_id: null })).ok).toBe(true));
  it('B2 cannot fund a non-defined milestone', () => expect(canFund(M({ status: 'funded', escrow_id: null })).ok).toBe(false));
  it('B3 cannot double-fund (escrow already linked)', () => expect(canFund(M({ status: 'defined', escrow_id: 5 }))).toEqual({ ok: false, reason: 'ALREADY_DECIDED' }));
});

describe('Phase 2 · C. Submission gate', () => {
  it('C1 funded milestone can be submitted', () => expect(canSubmit(M({ status: 'funded', escrow_id: 1 })).ok).toBe(true));
  it('C2 cannot submit without an escrow (unfunded)', () => expect(canSubmit(M({ status: 'funded', escrow_id: null }))).toEqual({ ok: false, reason: 'NO_ESCROW' }));
  it('C3 cannot submit a draft/defined milestone', () => expect(canSubmit(M({ status: 'defined', escrow_id: null })).ok).toBe(false));
  it('C4 resubmission allowed while still submitted', () => expect(canSubmit(M({ status: 'submitted', escrow_id: 1 })).ok).toBe(true));
});

describe('Phase 2 · D. Accept decision', () => {
  it('D1 accepting a submitted milestone yields release action', () => {
    expect(decideAccept(M({ status: 'submitted', escrow_id: 9 }))).toEqual({ ok: true, next: 'accepted', escrow_action: 'release' });
  });
  it('D2 cannot accept a non-submitted milestone', () => expect(decideAccept(M({ status: 'funded' }))).toEqual({ ok: false, reason: 'NOT_SUBMITTED' }));
  it('D3 cannot accept without an escrow', () => expect(decideAccept(M({ status: 'submitted', escrow_id: null }))).toEqual({ ok: false, reason: 'NO_ESCROW' }));
});

describe('Phase 2 · E. Reject (reasoned)', () => {
  it('E1 rejecting with a reason opens a dispute', () => {
    expect(decideReject(M({ status: 'submitted', escrow_id: 3 }), 'incomplete work')).toEqual({ ok: true, next: 'in_dispute', escrow_action: 'dispute' });
  });
  it('E2 rejecting WITHOUT a reason is invalid (reasoned-reject required)', () => {
    expect(decideReject(M({ status: 'submitted', escrow_id: 3 }), '   ').ok).toBe(false);
  });
  it('E3 cannot reject a non-submitted milestone', () => expect(decideReject(M({ status: 'accepted' }), 'x')).toEqual({ ok: false, reason: 'NOT_SUBMITTED' }));
});

describe('Phase 2 · F. Silence = acceptance (auto-release)', () => {
  it('F1 deadline is submission + window', () => {
    expect(acceptanceDeadline(NOW, 7 * 86400)).toBe(NOW + 7 * DAY);
  });
  it('F2 NOT auto-accepted before the window elapses', () => {
    expect(autoAcceptIfElapsed(M({ status: 'submitted', escrow_id: 2, acceptance_deadline: new Date(NOW + DAY).toISOString() }), NOW)).toBeNull();
  });
  it('F3 auto-accepted once the window has elapsed (silence = yes)', () => {
    expect(autoAcceptIfElapsed(M({ status: 'submitted', escrow_id: 2, acceptance_deadline: new Date(NOW - 1).toISOString() }), NOW)).toEqual({ next: 'accepted', escrow_action: 'release', auto: true });
  });
  it('F4 exactly at the deadline auto-accepts (<=)', () => {
    expect(autoAcceptIfElapsed(M({ status: 'submitted', escrow_id: 2, acceptance_deadline: new Date(NOW).toISOString() }), NOW)?.auto).toBe(true);
  });
  it('F5 a non-submitted milestone is never auto-accepted', () => {
    expect(autoAcceptIfElapsed(M({ status: 'accepted', escrow_id: 2, acceptance_deadline: new Date(NOW - DAY).toISOString() }), NOW)).toBeNull();
  });
  it('F6 a submitted milestone with no deadline is not auto-accepted (safety)', () => {
    expect(autoAcceptIfElapsed(M({ status: 'submitted', escrow_id: 2, acceptance_deadline: null }), NOW)).toBeNull();
  });
  it('F7 a submitted milestone with no escrow is not auto-accepted', () => {
    expect(autoAcceptIfElapsed(M({ status: 'submitted', escrow_id: null, acceptance_deadline: new Date(NOW - DAY).toISOString() }), NOW)).toBeNull();
  });
});

describe('Phase 2 · G. Engagement completion', () => {
  const S = (...s: MilestoneStatus[]) => s;
  it('G1 all milestones released → complete', () => expect(engagementComplete(S('released', 'released'))).toBe(true));
  it('G2 one still in flight → not complete', () => expect(engagementComplete(S('released', 'submitted'))).toBe(false));
  it('G3 cancelled milestones are ignored', () => expect(engagementComplete(S('released', 'cancelled'))).toBe(true));
  it('G4 all cancelled → not complete (nothing delivered)', () => expect(engagementComplete(S('cancelled', 'cancelled'))).toBe(false));
  it('G5 empty → not complete', () => expect(engagementComplete([])).toBe(false));
  it('G6 a refunded milestone blocks completion', () => expect(engagementComplete(S('released', 'refunded'))).toBe(false));
});

describe('Phase 2 · H. Adversarial', () => {
  it('H1 provider cannot get release without submission (accept blocked pre-submit)', () => {
    expect(decideAccept(M({ status: 'funded', escrow_id: 1 })).ok).toBe(false);
  });
  it('H2 client cannot reject after already accepting (not submitted anymore)', () => {
    expect(decideReject(M({ status: 'accepted', escrow_id: 1 }), 'changed my mind').ok).toBe(false);
  });
  it('H3 auto-release cannot fire twice (accepted is not submitted)', () => {
    expect(autoAcceptIfElapsed(M({ status: 'accepted', escrow_id: 1, acceptance_deadline: new Date(NOW - DAY).toISOString() }), NOW)).toBeNull();
  });
  it('H4 cannot fund an already-funded milestone to create a second escrow', () => {
    expect(canFund(M({ status: 'funded', escrow_id: 7 })).ok).toBe(false);
  });
  it('H5 a milestone in dispute cannot be plain-accepted (must resolve)', () => {
    expect(decideAccept(M({ status: 'in_dispute', escrow_id: 1 })).ok).toBe(false);
  });
  it('H6 released milestone cannot transition anywhere', () => {
    expect(canTransition('released', 'in_dispute')).toBe(false);
    expect(canTransition('released', 'refunded')).toBe(false);
  });
});
