/**
 * Family / Institutional Continuity — scenario matrix (Backend Completion Campaign 11, Wave E).
 *
 * Certifies the individual + MULTI-HEIR inheritance that IS built (commit-reveal shares, share cap, veto/claim/
 * finalize windows, R-3 DAO-veto-not-initiate, double-claim prevention, non-custodial) AND documents the
 * institutional gaps that are NOT (FC-1 joint/couple, FC-2 business, FC-3 trust/executor, FC-4 multi-generation).
 * Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  heirCommitment, verifyHeirClaim, configValid, sharesWithinCap, canInitiateClaim, daoCanVeto, daoCanInitiate,
  ownerCanVetoDuring, claimAllowed, finalizeAllowed, claimRejectedIfAlreadyClaimed, inheritanceGivesThirdPartyCustody,
  jointVaultExists, spousalSurvivorshipExists, coupleServedByMultiHeirWorkaround, survivingSpouseSkipsClaimFlow,
  corporateVaultExists, organizationalSuccessionExists, businessAssetsRouteThroughPersonalInheritance,
  trustStructureExists, estateExecutorRoleExists, stagedOrConditionalDistributionExists,
  multiGenerationCascadeExists, chainOfReturnBuilt, eachGenerationConfiguresOwn,
  VETO_PERIOD_DAYS, CLAIM_WINDOW_DAYS, CLAIM_FINALIZE_FLOOR_DAYS, MEMORIAL_PERIOD_DAYS, CONFIG_COOLDOWN_DAYS,
  TOTAL_BASIS_POINTS, type InhState,
} from '@/lib/audit/familyContinuityModel';

// ═════════════════════════════════════════════════════════════════════════════
// A. Multi-heir commitment + verification (commit-reveal)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.A: heir commitment', () => {
  it('COMMIT-01 a correct reveal verifies', () => {
    const c = heirCommitment('0xHeirA', 5000, 'secretA');
    expect(verifyHeirClaim('0xHeirA', 5000, 'secretA', c)).toBe(true);
  });
  it('COMMIT-02 a wrong secret fails', () => {
    const c = heirCommitment('0xHeirA', 5000, 'secretA');
    expect(verifyHeirClaim('0xHeirA', 5000, 'wrong', c)).toBe(false);
  });
  it('COMMIT-03 an inflated basisPoints fails (share is bound in the commitment)', () => {
    const c = heirCommitment('0xHeirA', 5000, 'secretA');
    expect(verifyHeirClaim('0xHeirA', 9999, 'secretA', c)).toBe(false);
  });
  it('COMMIT-04 a different heir address fails', () => {
    const c = heirCommitment('0xHeirA', 5000, 'secretA');
    expect(verifyHeirClaim('0xHeirB', 5000, 'secretA', c)).toBe(false);
  });
  it('COMMIT-05 commitments are deterministic', () => {
    expect(heirCommitment('0xHeirA', 3000, 's')).toBe(heirCommitment('0xHeirA', 3000, 's'));
  });
  it('COMMIT-06 distinct shares yield distinct commitments', () => {
    expect(heirCommitment('0xHeirA', 3000, 's')).not.toBe(heirCommitment('0xHeirA', 4000, 's'));
  });
  // parametric reveal sweep
  const heirs = ['0xA', '0xB', '0xC'];
  const shares = [1000, 2500, 5000];
  for (const h of heirs) for (const s of shares) {
    it(`COMMIT-sweep-${h}-${s} correct reveal verifies, wrong share fails`, () => {
      const c = heirCommitment(h, s, 'sec');
      expect(verifyHeirClaim(h, s, 'sec', c)).toBe(true);
      expect(verifyHeirClaim(h, s + 1, 'sec', c)).toBe(false);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Config validity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.B: config validity', () => {
  const c1 = heirCommitment('0xA', 5000, 's1');
  const c2 = heirCommitment('0xB', 5000, 's2');
  it('CFG-01 matched guardians+commitments accepted', () => expect(configValid(['0xA', '0xB'], [c1, c2]).ok).toBe(true));
  it('CFG-02 length mismatch rejected', () => expect(configValid(['0xA', '0xB'], [c1])).toEqual({ ok: false, reason: 'INH_InvalidCommitment' }));
  it('CFG-03 empty config rejected', () => expect(configValid([], [])).toEqual({ ok: false, reason: 'INH_NoHeirs' }));
  it('CFG-04 zero commitment rejected', () => expect(configValid(['0xA'], ['0x0']).ok).toBe(false));
  it('CFG-05 empty-string commitment rejected', () => expect(configValid(['0xA'], ['']).ok).toBe(false));
  it('CFG-06 single heir accepted', () => expect(configValid(['0xA'], [c1]).ok).toBe(true));
  it('CFG-07 five heirs accepted', () => {
    const gs = ['0xA', '0xB', '0xC', '0xD', '0xE'];
    const cs = gs.map((g, i) => heirCommitment(g, 2000, `s${i}`));
    expect(configValid(gs, cs).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Share sum cap (≤100%)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.C: share cap', () => {
  it('CAP-01 shares summing to 100% accepted', () => expect(sharesWithinCap([5000, 5000])).toBe(true));
  it('CAP-02 shares under 100% accepted (remainder stays in estate)', () => expect(sharesWithinCap([3000, 3000])).toBe(true));
  it('CAP-03 shares over 100% rejected', () => expect(sharesWithinCap([6000, 5000])).toBe(false));
  it('CAP-04 single 100% heir accepted', () => expect(sharesWithinCap([TOTAL_BASIS_POINTS])).toBe(true));
  it('CAP-05 many small shares within cap', () => expect(sharesWithinCap([2000, 2000, 2000, 2000, 2000])).toBe(true));
  it('CAP-06 many shares just over cap rejected', () => expect(sharesWithinCap([2000, 2000, 2000, 2000, 2001])).toBe(false));
  // sweep
  const combos: Array<[number[], boolean]> = [
    [[10000], true], [[5000, 4000], true], [[5000, 5000], true], [[5000, 5001], false],
    [[3333, 3333, 3334], true], [[3334, 3333, 3334], false], [[1, 9999], true], [[10001], false],
  ];
  combos.forEach(([list, ok], i) => it(`CAP-sweep-${i} [${list}] → ${ok}`, () => expect(sharesWithinCap(list)).toBe(ok)));
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Claim window state machine (VETO → CLAIM → finalize)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.D: claim windows', () => {
  it('WIN-01 the windows match the certified values', () => {
    expect(VETO_PERIOD_DAYS).toBe(30);
    expect(CLAIM_WINDOW_DAYS).toBe(90);
    expect(CLAIM_FINALIZE_FLOOR_DAYS).toBe(14);
    expect(MEMORIAL_PERIOD_DAYS).toBe(365);
    expect(CONFIG_COOLDOWN_DAYS).toBe(30);
  });
  it('WIN-02 claim blocked during the veto period', () => expect(claimAllowed(VETO_PERIOD_DAYS - 1)).toEqual({ ok: false, reason: 'veto period not elapsed' }));
  it('WIN-03 claim allowed right after the veto period', () => expect(claimAllowed(VETO_PERIOD_DAYS).ok).toBe(true));
  it('WIN-04 claim allowed within the claim window', () => expect(claimAllowed(VETO_PERIOD_DAYS + 45).ok).toBe(true));
  it('WIN-05 claim blocked after the claim window closes', () => expect(claimAllowed(VETO_PERIOD_DAYS + CLAIM_WINDOW_DAYS + 1).ok).toBe(false));
  it('WIN-06 finalize blocked before the floor', () => expect(finalizeAllowed(CLAIM_FINALIZE_FLOOR_DAYS - 1)).toBe(false));
  it('WIN-07 finalize allowed at the floor', () => expect(finalizeAllowed(CLAIM_FINALIZE_FLOOR_DAYS)).toBe(true));
  it('WIN-08 owner can veto (return) during the veto period', () => {
    expect(ownerCanVetoDuring('VETO', 10)).toBe(true);
    expect(ownerCanVetoDuring('VETO', VETO_PERIOD_DAYS + 1)).toBe(false);
  });
  it('WIN-09 owner cannot "veto" once in the CLAIM state', () => expect(ownerCanVetoDuring('CLAIM', 5)).toBe(false));
  // timing sweep
  const days = [0, 10, 29, 30, 60, 90, 120, 121];
  for (const d of days) {
    const allowed = d >= VETO_PERIOD_DAYS && d <= VETO_PERIOD_DAYS + CLAIM_WINDOW_DAYS;
    it(`WIN-sweep-${d}d claim → ${allowed ? 'allowed' : 'blocked'}`, () => expect(claimAllowed(d).ok).toBe(allowed));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// E. DAO can veto, not initiate (R-3)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.E: R-3 DAO veto-not-initiate', () => {
  it('R3-01 a non-DAO guardian can initiate a claim', () => expect(canInitiateClaim('guardian')).toBe(true));
  it('R3-02 the DAO cannot initiate a claim', () => {
    expect(canInitiateClaim('dao')).toBe(false);
    expect(daoCanInitiate()).toBe(false);
  });
  it('R3-03 a stranger cannot initiate a claim', () => expect(canInitiateClaim('stranger')).toBe(false));
  it('R3-04 the DAO CAN veto (block) a claim', () => expect(daoCanVeto()).toBe(true));
  it('R3-05 the DAO is a brake, never an initiator (anti-seizure)', () => {
    expect(daoCanInitiate()).toBe(false);
    expect(daoCanVeto()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Double-claim prevention
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.F: double-claim prevention', () => {
  it('DBL-01 a fresh claim hash is not yet claimed', () => expect(claimRejectedIfAlreadyClaimed(new Set(), 'h1')).toBe(false));
  it('DBL-02 a re-used claim hash is rejected', () => {
    const seen = new Set(['h1']);
    expect(claimRejectedIfAlreadyClaimed(seen, 'h1')).toBe(true);
  });
  it('DBL-03 distinct heirs\' hashes are independent', () => {
    const seen = new Set(['h1']);
    expect(claimRejectedIfAlreadyClaimed(seen, 'h2')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Non-custodial inheritance
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.G: non-custodial', () => {
  it('NC-01 inheritance never gives a third party custody', () => expect(inheritanceGivesThirdPartyCustody()).toBe(false));
  it('NC-02 the DAO cannot seize via the claim path (veto only, no initiate)', () => {
    expect(daoCanInitiate()).toBe(false);
    expect(inheritanceGivesThirdPartyCustody()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Full lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.H: lifecycle narratives', () => {
  it('LIFE-happy guardian initiates → veto elapses → heirs claim shares → finalize', () => {
    expect(canInitiateClaim('guardian')).toBe(true);
    expect(claimAllowed(VETO_PERIOD_DAYS).ok).toBe(true);
    const c = heirCommitment('0xHeir', 6000, 'sec');
    expect(verifyHeirClaim('0xHeir', 6000, 'sec', c)).toBe(true);
    expect(finalizeAllowed(CLAIM_FINALIZE_FLOOR_DAYS)).toBe(true);
  });
  it('LIFE-owner-returns guardian initiates → owner returns during veto → claim cancelled', () => {
    expect(ownerCanVetoDuring('VETO', 5)).toBe(true);
    expect(claimAllowed(5).ok).toBe(false); // heirs cannot claim during veto
  });
  it('LIFE-two-heirs 60/40 split, both within cap, both verify their own commitments', () => {
    expect(sharesWithinCap([6000, 4000])).toBe(true);
    const a = heirCommitment('0xA', 6000, 'sa');
    const b = heirCommitment('0xB', 4000, 'sb');
    expect(verifyHeirClaim('0xA', 6000, 'sa', a)).toBe(true);
    expect(verifyHeirClaim('0xB', 4000, 'sb', b)).toBe(true);
  });
  it('LIFE-window-expired heirs miss the claim window → claim blocked', () => {
    expect(claimAllowed(VETO_PERIOD_DAYS + CLAIM_WINDOW_DAYS + 5).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. FC-1 — joint/couple gap
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.I: FC-1 joint/couple gap', () => {
  it('FC1-01 no joint/co-owned vault exists', () => expect(jointVaultExists()).toBe(false));
  it('FC1-02 no automatic spousal survivorship exists', () => expect(spousalSurvivorshipExists()).toBe(false));
  it('FC1-03 a couple IS served by the multi-heir workaround (each names the other)', () => expect(coupleServedByMultiHeirWorkaround()).toBe(true));
  it('FC1-04 but a surviving spouse still goes through the veto/claim flow (no instant survivorship)', () => {
    expect(survivingSpouseSkipsClaimFlow()).toBe(false);
    expect(claimAllowed(VETO_PERIOD_DAYS - 1).ok).toBe(false); // still must wait out the veto period
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. FC-2 — business/corporate gap
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.J: FC-2 business gap', () => {
  it('FC2-01 no corporate/org vault exists', () => expect(corporateVaultExists()).toBe(false));
  it('FC2-02 no organizational succession exists', () => expect(organizationalSuccessionExists()).toBe(false));
  it('FC2-03 business assets route through an individual\'s PERSONAL inheritance', () => expect(businessAssetsRouteThroughPersonalInheritance()).toBe(true));
  it('FC2-04 a business has no role-based succession to officers/successors', () => {
    expect(organizationalSuccessionExists()).toBe(false);
    expect(corporateVaultExists()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. FC-3 — trust/executor gap
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.K: FC-3 trust/executor gap', () => {
  it('FC3-01 no trust structure exists', () => expect(trustStructureExists()).toBe(false));
  it('FC3-02 no distinct estate-executor role exists', () => expect(estateExecutorRoleExists()).toBe(false));
  it('FC3-03 no staged/conditional distribution (e.g., hold for a minor until 18)', () => expect(stagedOrConditionalDistributionExists()).toBe(false));
  it('FC3-04 inheritance is a one-time guardian-gated payout, not ongoing trustee management', () => {
    expect(trustStructureExists()).toBe(false);
    expect(stagedOrConditionalDistributionExists()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. FC-4 — multi-generation gap
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.L: FC-4 multi-generation gap', () => {
  it('FC4-01 no automatic multi-generation cascade exists', () => expect(multiGenerationCascadeExists()).toBe(false));
  it('FC4-02 Chain of Return is not built (PLANNED/no-code)', () => expect(chainOfReturnBuilt()).toBe(false));
  it('FC4-03 each generation configures its own inheritance independently', () => expect(eachGenerationConfiguresOwn()).toBe(true));
  it('FC4-04 there is no "to my kids, then their kids" cascading config', () => {
    expect(multiGenerationCascadeExists()).toBe(false);
    expect(chainOfReturnBuilt()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Findings summary
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.M: findings summary', () => {
  it('FIND-built the individual + multi-heir path is fully built and certified', () => {
    expect(verifyHeirClaim('0xH', 5000, 's', heirCommitment('0xH', 5000, 's'))).toBe(true);
    expect(sharesWithinCap([5000, 5000])).toBe(true);
    expect(daoCanInitiate()).toBe(false);
    expect(inheritanceGivesThirdPartyCustody()).toBe(false);
  });
  it('FIND-FC1 joint/couple survivorship is a gap (multi-heir workaround exists)', () => {
    expect(jointVaultExists()).toBe(false);
    expect(coupleServedByMultiHeirWorkaround()).toBe(true);
  });
  it('FIND-FC2 business/corporate succession is a gap (the largest)', () => {
    expect(corporateVaultExists()).toBe(false);
    expect(businessAssetsRouteThroughPersonalInheritance()).toBe(true);
  });
  it('FIND-FC3 trust/executor structures are a gap', () => {
    expect(trustStructureExists()).toBe(false);
    expect(estateExecutorRoleExists()).toBe(false);
  });
  it('FIND-FC4 multi-generation cascade is a gap (Chain of Return planned)', () => {
    expect(multiGenerationCascadeExists()).toBe(false);
    expect(chainOfReturnBuilt()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Commitment verification grid (heir × share, wrong-input rejection)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.N: commitment grid', () => {
  const heirs = ['0xAlice', '0xBob', '0xCarol', '0xDave'];
  const shares = [1000, 2500, 5000, 7500];
  for (const h of heirs) {
    for (const s of shares) {
      it(`NGRID-${h}-${s} correct verifies`, () => {
        const c = heirCommitment(h, s, 'secret');
        expect(verifyHeirClaim(h, s, 'secret', c)).toBe(true);
      });
    }
  }
  // wrong-secret rejection across heirs
  for (const h of heirs) {
    it(`NWRONG-secret-${h} wrong secret rejected`, () => {
      const c = heirCommitment(h, 5000, 'right');
      expect(verifyHeirClaim(h, 5000, 'wrong', c)).toBe(false);
    });
  }
  // cross-heir commitment confusion rejected
  it('NCROSS-01 heir A cannot claim with heir B\'s commitment', () => {
    const cB = heirCommitment('0xBob', 5000, 'sB');
    expect(verifyHeirClaim('0xAlice', 5000, 'sB', cB)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Multi-heir split scenarios (explicit family distributions)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.O: family distributions', () => {
  const splits: Array<[string, number[], boolean]> = [
    ['spouse-only-100', [10000], true],
    ['two-kids-50-50', [5000, 5000], true],
    ['spouse-60-kid-40', [6000, 4000], true],
    ['three-kids-thirds', [3333, 3333, 3334], true],
    ['four-kids-quarters', [2500, 2500, 2500, 2500], true],
    ['spouse-50-three-kids', [5000, 1666, 1667, 1667], true],
    ['partial-80-charity-remainder', [8000], true],
    ['over-100-rejected', [6000, 5000], false],
    ['five-heirs-even', [2000, 2000, 2000, 2000, 2000], true],
    ['five-heirs-over', [2001, 2000, 2000, 2000, 2000], false],
  ];
  splits.forEach(([name, list, ok]) => {
    it(`SPLIT-${name} → ${ok ? 'valid' : 'rejected'}`, () => expect(sharesWithinCap(list)).toBe(ok));
  });
  // each heir in a valid split verifies their own committed share
  it('SPLIT-verify-each three-kid split: each kid verifies their own share', () => {
    const kids: Array<[string, number]> = [['0xK1', 3333], ['0xK2', 3333], ['0xK3', 3334]];
    for (const [k, bp] of kids) expect(verifyHeirClaim(k, bp, `s_${k}`, heirCommitment(k, bp, `s_${k}`))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Window timing finer sweep
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.P: window timing finer', () => {
  const claimDays = [0, 15, 28, 29, 30, 31, 60, 90, 119, 120, 121, 150];
  for (const d of claimDays) {
    const allowed = d >= VETO_PERIOD_DAYS && d <= VETO_PERIOD_DAYS + CLAIM_WINDOW_DAYS;
    it(`PWIN-${d}d claim → ${allowed ? 'allow' : 'block'}`, () => expect(claimAllowed(d).ok).toBe(allowed));
  }
  const finalizeDays = [0, 7, 13, 14, 15, 30];
  for (const d of finalizeDays) {
    it(`PFIN-${d}d finalize → ${d >= CLAIM_FINALIZE_FLOOR_DAYS}`, () => expect(finalizeAllowed(d)).toBe(d >= CLAIM_FINALIZE_FLOOR_DAYS));
  }
  const vetoDays = [0, 10, 29, 30, 31];
  for (const d of vetoDays) {
    it(`PVETO-${d}d owner-return → ${d <= VETO_PERIOD_DAYS}`, () => expect(ownerCanVetoDuring('VETO', d)).toBe(d <= VETO_PERIOD_DAYS));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Q. Institutional-gap detail + workaround consequences
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.Q: institutional-gap detail', () => {
  it('QFC1-workaround-cost a surviving spouse waits ≥30d (veto) even with the multi-heir workaround', () => {
    expect(coupleServedByMultiHeirWorkaround()).toBe(true);
    expect(claimAllowed(VETO_PERIOD_DAYS - 1).ok).toBe(false);
    expect(claimAllowed(VETO_PERIOD_DAYS).ok).toBe(true);
  });
  it('QFC2-business a sole-proprietor\'s business assets follow personal inheritance to personal heirs', () => {
    expect(businessAssetsRouteThroughPersonalInheritance()).toBe(true);
    expect(corporateVaultExists()).toBe(false);
  });
  it('QFC2-no-roles no role-based corporate control (CFO/COO succession) exists', () => {
    expect(organizationalSuccessionExists()).toBe(false);
  });
  it('QFC3-minor no staged distribution to hold a minor heir\'s share until adulthood', () => {
    expect(stagedOrConditionalDistributionExists()).toBe(false);
  });
  it('QFC3-no-executor no neutral estate-executor distinct from the guardian set', () => {
    expect(estateExecutorRoleExists()).toBe(false);
  });
  it('QFC4-grandchildren no automatic cascade to grandchildren if a child predeceases', () => {
    expect(multiGenerationCascadeExists()).toBe(false);
    expect(eachGenerationConfiguresOwn()).toBe(true);
  });
  it('QFC-summary all four institutional dimensions are unbuilt gaps', () => {
    expect(jointVaultExists()).toBe(false);
    expect(corporateVaultExists()).toBe(false);
    expect(trustStructureExists()).toBe(false);
    expect(multiGenerationCascadeExists()).toBe(false);
  });
  it('QFC-individual-strong yet the individual + multi-heir core is robust', () => {
    expect(verifyHeirClaim('0xH', 5000, 's', heirCommitment('0xH', 5000, 's'))).toBe(true);
    expect(daoCanInitiate()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// R. Closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 11.R: closing invariants', () => {
  it('CLOSE-01 a heir cannot inflate their share (commitment binds basisPoints)', () => {
    const c = heirCommitment('0xH', 4000, 's');
    expect(verifyHeirClaim('0xH', 8000, 's', c)).toBe(false);
  });
  it('CLOSE-02 total shares can never exceed 100%', () => {
    expect(sharesWithinCap([10001])).toBe(false);
    expect(sharesWithinCap([10000])).toBe(true);
  });
  it('CLOSE-03 the DAO is a brake (veto), never an initiator or custodian', () => {
    expect(daoCanInitiate()).toBe(false);
    expect(daoCanVeto()).toBe(true);
    expect(inheritanceGivesThirdPartyCustody()).toBe(false);
  });
  it('CLOSE-04 a live owner can always return during the 30d veto window', () => {
    expect(ownerCanVetoDuring('VETO', 0)).toBe(true);
    expect(ownerCanVetoDuring('VETO', VETO_PERIOD_DAYS)).toBe(true);
  });
  it('CLOSE-05 the institutional gaps (FC-1..4) are completeness gaps, not fund-safety holes', () => {
    // none of the gaps create a custody/seizure path; they are unbuilt capabilities
    expect(inheritanceGivesThirdPartyCustody()).toBe(false);
    expect(jointVaultExists()).toBe(false);
    expect(corporateVaultExists()).toBe(false);
    expect(trustStructureExists()).toBe(false);
    expect(multiGenerationCascadeExists()).toBe(false);
  });
});
