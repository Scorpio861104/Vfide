/**
 * Fraud Registry — adversarial + edge scenario matrix (Backend Completion Campaign 7, closes Wave B).
 *
 * Certifies the non-custodial fraud-flagging system: complaint guards, 3-distinct-reporter threshold, FraudJury
 * confirmation (quorum + 66% commit-reveal supermajority), dual-authority confirmFraud (with pre-jury fallback),
 * the non-custodial invariant (no seizure/hold; escrowTransfer reverts), forgiveness/decay (90d), appeals, and the
 * weaponization-resistance surface. Findings FR-1 (jury-conditional dual authority), FR-2 (vestigial escrow). 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  fileComplaint, reachesFlagThreshold, singleAttackerCanFlag, jurorEligible, juryConfirms, confirmFraud,
  noSingleAuthorityConfirms, daoCanCreateFlagAlone, escrowTransferReverts, requiresEscrow, flagSeizesFunds,
  flagEffectIsReputationAndBanOnly, flagActive, permanentBanAllowed, falseComplaintCost, canSelfFlag,
  dualAuthorityIsUnconditional, vestigialEscrowSurfaceRemoved,
  COMPLAINTS_TO_FLAG, MIN_REPORTER_SCORE, JUROR_MIN_SCORE, JURY_QUORUM, SIGNAL_TTL_DAYS,
  PENDING_REVIEW_APPEAL_WINDOW_H, PERMANENT_BAN_DELAY_DAYS, COMPLAINT_REPORTER_PENALTY,
  type ComplaintCtx, type ConfirmCtx,
} from '@/lib/audit/fraudRegistryModel';

const cctx = (o: Partial<ComplaintCtx> = {}): ComplaintCtx => ({
  target: 'other', reporterScore: MIN_REPORTER_SCORE, alreadyComplainedThisEpoch: false, complaintCount: 0, ...o,
});
const fctx = (o: Partial<ConfirmCtx> = {}): ConfirmCtx => ({
  isPendingReview: true, isFlagged: false, juryWired: true, juryConfirmed: true, appealWindowElapsedH: 99, ...o,
});

// ═════════════════════════════════════════════════════════════════════════════
// A. fileComplaint guards
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.A: fileComplaint guards', () => {
  it('FC-01 valid complaint accepted', () => expect(fileComplaint(cctx()).ok).toBe(true));
  it('FC-02 zero target rejected', () => expect(fileComplaint(cctx({ target: 'zero' }))).toEqual({ ok: false, reason: 'FR_Zero' }));
  it('FC-03 self-complaint rejected (no self-flag gaming)', () => expect(fileComplaint(cctx({ target: 'self' }))).toEqual({ ok: false, reason: 'FR_SelfComplaint' }));
  it('FC-04 duplicate complaint this epoch rejected (one per reporter per epoch)', () => expect(fileComplaint(cctx({ alreadyComplainedThisEpoch: true }))).toEqual({ ok: false, reason: 'FR_AlreadyComplained' }));
  it('FC-05 below-min reporter score rejected', () => expect(fileComplaint(cctx({ reporterScore: MIN_REPORTER_SCORE - 1 }))).toEqual({ ok: false, reason: 'FR_InsufficientScore' }));
  it('FC-06 reporter exactly at min score accepted', () => expect(fileComplaint(cctx({ reporterScore: MIN_REPORTER_SCORE })).ok).toBe(true));
  it('FC-07 complaint limit (100) rejected', () => expect(fileComplaint(cctx({ complaintCount: 100 }))).toEqual({ ok: false, reason: 'FR: complaint limit' }));
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Flag threshold + single-attacker resistance
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.B: flag threshold', () => {
  it('THRESH-01 fewer than 3 distinct reporters does NOT flag', () => {
    expect(reachesFlagThreshold(1)).toBe(false);
    expect(reachesFlagThreshold(2)).toBe(false);
  });
  it('THRESH-02 3 distinct reporters reaches the threshold', () => expect(reachesFlagThreshold(3)).toBe(true));
  it('THRESH-03 more than 3 still reaches it', () => expect(reachesFlagThreshold(5)).toBe(true));
  it('THRESH-04 a single attacker can NEVER flag alone', () => expect(singleAttackerCanFlag()).toBe(false));
  it('THRESH-05 the threshold is exactly 3', () => expect(COMPLAINTS_TO_FLAG).toBe(3));
});

// ═════════════════════════════════════════════════════════════════════════════
// C. FraudJury — eligibility + confirmation (quorum + 66% supermajority)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.C: jury confirmation', () => {
  it('JUR-elig juror must have score ≥7000', () => {
    expect(jurorEligible(JUROR_MIN_SCORE)).toBe(true);
    expect(jurorEligible(JUROR_MIN_SCORE - 1)).toBe(false);
  });
  it('JUR-below-quorum reveals below quorum never confirm', () => {
    expect(juryConfirms(4, 4)).toBe(false); // 4 < 5 quorum
  });
  it('JUR-quorum-unanimous quorum reached + unanimous confirms', () => expect(juryConfirms(5, 5)).toBe(true));
  it('JUR-supermajority-boundary 66% boundary', () => {
    expect(juryConfirms(5, 3)).toBe(false); // 60% < 66%
    expect(juryConfirms(5, 4)).toBe(true);  // 80% ≥ 66%
  });
  it('JUR-large-jury 9 reveals need ≥6 confirms (66%)', () => {
    expect(juryConfirms(9, 5)).toBe(false); // 55%
    expect(juryConfirms(9, 6)).toBe(true);  // 66.7%
  });
  // parametric sweep over (reveals, confirms)
  const sweep: Array<[number, number, boolean]> = [
    [0, 0, false], [3, 3, false], [5, 0, false], [5, 3, false], [5, 4, true], [5, 5, true],
    [6, 4, true], [7, 5, true], [7, 4, false], [10, 6, false], [10, 7, true], [12, 8, true], [12, 7, false],
  ];
  sweep.forEach(([r, c, ok], i) => it(`JUR-sweep-${i} reveals=${r} confirms=${c} → ${ok}`, () => expect(juryConfirms(r, c)).toBe(ok)));
});

// ═════════════════════════════════════════════════════════════════════════════
// D. confirmFraud — dual authority + pre-jury fallback (FR-1)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.D: confirmFraud', () => {
  it('CONF-01 non-DAO caller rejected', () => expect(confirmFraud(false, fctx())).toEqual({ ok: false, reason: 'FR: not DAO' }));
  it('CONF-02 not-pending-review rejected', () => expect(confirmFraud(true, fctx({ isPendingReview: false })).ok).toBe(false));
  it('CONF-03 already-flagged rejected', () => expect(confirmFraud(true, fctx({ isFlagged: true })).ok).toBe(false));
  it('CONF-04 jury-wired requires jury confirmation', () => {
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: false }))).toEqual({ ok: false, reason: 'FR: jury has not confirmed' });
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: true })).ok).toBe(true);
  });
  it('CONF-05 (FR-1) no-jury fallback allows DAO confirm after 48h appeal', () => {
    expect(confirmFraud(true, fctx({ juryWired: false, appealWindowElapsedH: PENDING_REVIEW_APPEAL_WINDOW_H - 1 })).ok).toBe(false);
    expect(confirmFraud(true, fctx({ juryWired: false, appealWindowElapsedH: PENDING_REVIEW_APPEAL_WINDOW_H })).ok).toBe(true);
  });
  it('CONF-06 no-single-authority holds ONLY when jury wired (FR-1)', () => {
    expect(noSingleAuthorityConfirms(true)).toBe(true);
    expect(noSingleAuthorityConfirms(false)).toBe(false);
  });
  it('CONF-07 the DAO can create a flag alone ONLY in the no-jury fallback', () => {
    expect(daoCanCreateFlagAlone(true)).toBe(false);
    expect(daoCanCreateFlagAlone(false)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Non-custodial invariant (the headline)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.E: non-custodial', () => {
  it('NC-01 escrowTransfer reverts (fund holds removed)', () => expect(escrowTransferReverts()).toBe(true));
  it('NC-02 requiresEscrow returns false', () => expect(requiresEscrow()).toBe(false));
  it('NC-03 a flag never seizes the flagged user\'s funds', () => expect(flagSeizesFunds()).toBe(false));
  it('NC-04 a flag\'s effect is reputation + service ban only', () => expect(flagEffectIsReputationAndBanOnly()).toBe(true));
  it('NC-05 even a confirmed flag leaves all vault funds with the user', () => {
    expect(flagSeizesFunds()).toBe(false);
    expect(flagEffectIsReputationAndBanOnly()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Forgiveness / decay (SIGNAL_TTL 90d)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.F: decay', () => {
  it('DECAY-01 a fresh flag is active', () => expect(flagActive(0, true)).toBe(true));
  it('DECAY-02 a flag within 90d is active', () => expect(flagActive(89, true)).toBe(true));
  it('DECAY-03 a flag at exactly 90d is still active', () => expect(flagActive(SIGNAL_TTL_DAYS, true)).toBe(true));
  it('DECAY-04 a flag past 90d has decayed (forgiveness)', () => expect(flagActive(SIGNAL_TTL_DAYS + 1, true)).toBe(false));
  it('DECAY-05 an unflagged user is never "active"', () => expect(flagActive(0, false)).toBe(false));
  // sweep
  [0, 30, 60, 89, 90].forEach((d) => it(`DECAY-active-${d}d active`, () => expect(flagActive(d, true)).toBe(true)));
  [91, 120, 365].forEach((d) => it(`DECAY-expired-${d}d decayed`, () => expect(flagActive(d, true)).toBe(false)));
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Appeals + permanent ban timelock
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.G: appeals & permanent ban', () => {
  it('BAN-01 permanent ban blocked before 7d', () => expect(permanentBanAllowed(PERMANENT_BAN_DELAY_DAYS - 1)).toBe(false));
  it('BAN-02 permanent ban allowed at 7d', () => expect(permanentBanAllowed(PERMANENT_BAN_DELAY_DAYS)).toBe(true));
  it('BAN-03 the 48h appeal window gates the pre-jury fallback', () => {
    expect(confirmFraud(true, fctx({ juryWired: false, appealWindowElapsedH: 24 })).ok).toBe(false);
  });
  [0, 3, 6].forEach((d) => it(`BAN-before-${d}d blocked`, () => expect(permanentBanAllowed(d)).toBe(false)));
  [7, 14, 30].forEach((d) => it(`BAN-after-${d}d allowed`, () => expect(permanentBanAllowed(d)).toBe(true)));
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Weaponization-resistance scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.H: weaponization resistance', () => {
  it('WEAP-01 a single attacker filing repeatedly is blocked after one complaint per epoch', () => {
    expect(fileComplaint(cctx({ alreadyComplainedThisEpoch: true })).ok).toBe(false);
  });
  it('WEAP-02 a low-trust attacker cannot file complaints at all', () => {
    expect(fileComplaint(cctx({ reporterScore: 1000 })).ok).toBe(false);
  });
  it('WEAP-03 filing a false complaint costs the reporter score', () => expect(falseComplaintCost()).toBe(COMPLAINT_REPORTER_PENALTY));
  it('WEAP-04 an attacker cannot self-flag to fake victimhood', () => expect(canSelfFlag()).toBe(false));
  it('WEAP-05 even 3 colluding complaints do not auto-flag — the jury must confirm (jury-wired)', () => {
    expect(reachesFlagThreshold(3)).toBe(true); // pending review only
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: false })).ok).toBe(false); // not yet flagged
  });
  it('WEAP-06 a false jury push below supermajority fails to confirm', () => {
    expect(juryConfirms(5, 3)).toBe(false);
  });
  it('WEAP-07 a successful FALSE flag still seizes NOTHING (non-custodial limits the damage)', () => {
    expect(flagSeizesFunds()).toBe(false);
  });
  it('WEAP-08 a false flag decays after 90d even if not appealed (forgiveness caps the harm)', () => {
    expect(flagActive(91, true)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.I: findings', () => {
  it('FIND-FR1 dual-authority is conditional on the jury being wired', () => {
    expect(dualAuthorityIsUnconditional()).toBe(false);
    expect(noSingleAuthorityConfirms(false)).toBe(false); // pre-jury fallback weakens it
  });
  it('FIND-FR2 vestigial escrow surface is retained (stubs revert/false — safe but present)', () => {
    expect(vestigialEscrowSurfaceRemoved()).toBe(false);
    expect(escrowTransferReverts()).toBe(true); // the stub is safe
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Full fraud-lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.J: lifecycle narratives', () => {
  it('LIFE-honest 3 reporters → pending → jury confirms → DAO finalizes (non-custodial flag)', () => {
    expect(reachesFlagThreshold(3)).toBe(true);
    expect(juryConfirms(5, 5)).toBe(true);
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: true })).ok).toBe(true);
    expect(flagSeizesFunds()).toBe(false);
  });
  it('LIFE-jury-clears 3 reporters → pending → jury does NOT confirm → no flag', () => {
    expect(reachesFlagThreshold(3)).toBe(true);
    expect(juryConfirms(5, 2)).toBe(false);
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: false })).ok).toBe(false);
  });
  it('LIFE-appeal pre-jury → target appeals within 48h → DAO cannot yet confirm', () => {
    expect(confirmFraud(true, fctx({ juryWired: false, appealWindowElapsedH: 24 })).ok).toBe(false);
  });
  it('LIFE-decay confirmed flag → 90d passes → flag decays (forgiveness)', () => {
    expect(flagActive(0, true)).toBe(true);
    expect(flagActive(91, true)).toBe(false);
  });
  it('LIFE-permanent confirmed → permanent ban proposed → 7d timelock → finalized', () => {
    expect(permanentBanAllowed(6)).toBe(false);
    expect(permanentBanAllowed(7)).toBe(true);
  });
  it('LIFE-false-complaint reporter files false complaint → dismissed → reporter penalized', () => {
    expect(falseComplaintCost()).toBe(COMPLAINT_REPORTER_PENALTY);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Finer jury-vote sweep (quorum + 66% supermajority)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.K: finer jury sweep', () => {
  // For each reveal count R≥quorum, min confirms to pass = ceil(R*66/100)
  for (let r = 0; r <= 15; r++) {
    const minConfirm = Math.ceil((r * 66) / 100);
    if (r < JURY_QUORUM) {
      it(`KSWEEP-${r}-belowquorum any confirms below quorum fail`, () => {
        expect(juryConfirms(r, r)).toBe(false);
      });
    } else {
      it(`KSWEEP-${r}-pass exactly min confirms (${minConfirm}) passes`, () => {
        expect(juryConfirms(r, minConfirm)).toBe(true);
      });
      it(`KSWEEP-${r}-fail one below min (${minConfirm - 1}) fails`, () => {
        expect(juryConfirms(r, Math.max(0, minConfirm - 1))).toBe(minConfirm - 1 >= 0 ? (((minConfirm - 1) * 100) >= (r * 66)) : false);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Complaint guard priority + combinations
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.L: complaint guard priority', () => {
  it('GP-01 zero target reported before self', () => expect(fileComplaint(cctx({ target: 'zero' })).ok).toBe(false));
  it('GP-02 self reported before duplicate', () => expect(fileComplaint(cctx({ target: 'self', alreadyComplainedThisEpoch: true }))).toEqual({ ok: false, reason: 'FR_SelfComplaint' }));
  it('GP-03 duplicate reported before low-score', () => expect(fileComplaint(cctx({ alreadyComplainedThisEpoch: true, reporterScore: 0 }))).toEqual({ ok: false, reason: 'FR_AlreadyComplained' }));
  it('GP-04 low-score reported before complaint-limit', () => expect(fileComplaint(cctx({ reporterScore: 0, complaintCount: 100 }))).toEqual({ ok: false, reason: 'FR_InsufficientScore' }));
  it('GP-05 high-trust reporter, fresh epoch, valid target → accepted', () => expect(fileComplaint(cctx({ reporterScore: 9000 })).ok).toBe(true));
  // score boundary sweep
  [0, 3000, 5999].forEach((s) => it(`GP-low-${s} below 6000 rejected`, () => expect(fileComplaint(cctx({ reporterScore: s })).ok).toBe(false)));
  [6000, 7000, 9000, 10000].forEach((s) => it(`GP-ok-${s} at/above 6000 accepted`, () => expect(fileComplaint(cctx({ reporterScore: s })).ok).toBe(true)));
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Multi-step weaponization attack scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.M: multi-step attacks', () => {
  it('ATK-01 attacker with 1 account cannot reach 3-complaint threshold (one per epoch)', () => {
    expect(reachesFlagThreshold(1)).toBe(false);
    expect(fileComplaint(cctx({ alreadyComplainedThisEpoch: true })).ok).toBe(false);
  });
  it('ATK-02 attacker needs 3 distinct high-trust (≥6000) accounts just to reach pending review', () => {
    expect(COMPLAINTS_TO_FLAG).toBe(3);
    expect(MIN_REPORTER_SCORE).toBe(6000);
  });
  it('ATK-03 pending review still requires a jury supermajority to flag (jury-wired)', () => {
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: false })).ok).toBe(false);
  });
  it('ATK-04 the jury (≥7000 jurors, 66% commit-reveal) is harder to capture than the reporters', () => {
    expect(JUROR_MIN_SCORE).toBeGreaterThan(MIN_REPORTER_SCORE);
    expect(juryConfirms(5, 3)).toBe(false);
  });
  it('ATK-05 the DAO can VETO but cannot CREATE a flag (jury-wired)', () => {
    expect(daoCanCreateFlagAlone(true)).toBe(false);
  });
  it('ATK-06 even a fully-successful false flag seizes no funds', () => expect(flagSeizesFunds()).toBe(false));
  it('ATK-07 a false flag self-heals after 90d (bounded harm window)', () => expect(flagActive(91, true)).toBe(false));
  it('ATK-08 a permanent ban gives a 7d appeal window before becoming irreversible', () => {
    expect(permanentBanAllowed(6)).toBe(false);
  });
  it('ATK-09 each false complaint burns reporter score, making sustained attacks costly', () => {
    expect(falseComplaintCost()).toBeGreaterThan(0);
  });
  it('ATK-10 an attacker cannot fabricate self-victimhood (self-complaint blocked)', () => expect(canSelfFlag()).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// N. confirmFraud combination matrix
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.N: confirmFraud combinations', () => {
  const combos: Array<{ dao: boolean; pending: boolean; flagged: boolean; jw: boolean; jc: boolean; appH: number; ok: boolean }> = [
    { dao: true, pending: true, flagged: false, jw: true, jc: true, appH: 99, ok: true },
    { dao: false, pending: true, flagged: false, jw: true, jc: true, appH: 99, ok: false },
    { dao: true, pending: false, flagged: false, jw: true, jc: true, appH: 99, ok: false },
    { dao: true, pending: true, flagged: true, jw: true, jc: true, appH: 99, ok: false },
    { dao: true, pending: true, flagged: false, jw: true, jc: false, appH: 99, ok: false },
    { dao: true, pending: true, flagged: false, jw: false, jc: false, appH: 48, ok: true },
    { dao: true, pending: true, flagged: false, jw: false, jc: false, appH: 47, ok: false },
    { dao: true, pending: true, flagged: false, jw: false, jc: true, appH: 99, ok: true },
  ];
  combos.forEach((c, i) => it(`CONFMTX-${i} dao=${c.dao} pending=${c.pending} flagged=${c.flagged} jw=${c.jw} jc=${c.jc} app=${c.appH} → ${c.ok}`, () => {
    expect(confirmFraud(c.dao, fctx({ isPendingReview: c.pending, isFlagged: c.flagged, juryWired: c.jw, juryConfirmed: c.jc, appealWindowElapsedH: c.appH })).ok).toBe(c.ok);
  }));
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.O: closing invariants', () => {
  it('CLOSE-01 the system never seizes, holds, or delays funds (three checks)', () => {
    expect(flagSeizesFunds()).toBe(false);
    expect(requiresEscrow()).toBe(false);
    expect(escrowTransferReverts()).toBe(true);
  });
  it('CLOSE-02 a flag is purely reputational + a (decaying) service ban', () => {
    expect(flagEffectIsReputationAndBanOnly()).toBe(true);
    expect(flagActive(91, true)).toBe(false);
  });
  it('CLOSE-03 confirmation is multi-party when the jury is wired (3 reporters + jury supermajority + DAO)', () => {
    expect(reachesFlagThreshold(3)).toBe(true);
    expect(juryConfirms(5, 4)).toBe(true);
    expect(noSingleAuthorityConfirms(true)).toBe(true);
  });
  it('CLOSE-04 FR-1 is the one decentralization caveat: jury-conditional dual authority', () => {
    expect(noSingleAuthorityConfirms(false)).toBe(false);
    expect(dualAuthorityIsUnconditional()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Extended decay + jury + threshold coverage
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 7.P: extended coverage', () => {
  // decay finer sweep
  [1, 15, 45, 75, 88].forEach((d) => it(`PDECAY-${d}d active`, () => expect(flagActive(d, true)).toBe(true)));
  [92, 100, 180, 200, 400].forEach((d) => it(`PDECAY-exp-${d}d decayed`, () => expect(flagActive(d, true)).toBe(false)));
  // jury edge: exactly quorum with exactly 66%
  it('PJUR-quorum-66 quorum (5) with 4/5 (80%) confirms', () => expect(juryConfirms(5, 4)).toBe(true));
  it('PJUR-quorum-60 quorum (5) with 3/5 (60%) fails', () => expect(juryConfirms(5, 3)).toBe(false));
  it('PJUR-six-four 6 reveals, 4 confirms (66.7%) passes', () => expect(juryConfirms(6, 4)).toBe(true));
  it('PJUR-eight-five 8 reveals, 5 confirms (62.5%) fails', () => expect(juryConfirms(8, 5)).toBe(false));
  it('PJUR-eight-six 8 reveals, 6 confirms (75%) passes', () => expect(juryConfirms(8, 6)).toBe(true));
  // threshold sweep
  [0, 1, 2].forEach((n) => it(`PTHRESH-${n} ${n} reporters does not flag`, () => expect(reachesFlagThreshold(n)).toBe(false)));
  [3, 4, 10].forEach((n) => it(`PTHRESH-ok-${n} ${n} reporters reaches threshold`, () => expect(reachesFlagThreshold(n)).toBe(true)));
  // non-custodial reiterated under attack
  it('PNC-attack a confirmed false flag still cannot touch the victim\'s vault', () => {
    expect(confirmFraud(true, fctx({ juryWired: true, juryConfirmed: true })).ok).toBe(true);
    expect(flagSeizesFunds()).toBe(false);
  });
});
