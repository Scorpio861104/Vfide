/**
 * Chain of Return — adversarial + edge scenario matrix (Backend Completion Campaign 13, Wave E — BUILT).
 *
 * Certifies the multi-generation cascade: merkle-set succession (multiple children per node), path verification
 * (depth bound, genuine-non-claim trigger, commitment binding), product-share conservation, full distribution
 * resolution, and the non-custodial / anti-reroute invariants. Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  hashPair, merkleRoot, merkleProof, merkleVerify, nodeLeaf, leafOf, verifyReturnPath,
  computeCascadedBasisPoints, cascadeMonotonic, resolveDistribution, resolveEstate, distributionConserves,
  cascadeMovesFunds, cascadeSeizesFunds, shareCanReachArbitraryParty, cascadeHonoredWithoutGenuineNonClaim,
  MAX_RETURN_DEPTH, TOTAL_BASIS_POINTS,
  type PathLink, type ReturnNode,
} from '@/lib/audit/chainOfReturnModel';

// ── Succession-tree fixtures ─────────────────────────────────────────────────
interface TNode { bp: number; secret: string; children: TNode[] }
const leafT = (n: TNode): string => nodeLeaf(n.bp, n.secret, rootT(n));
const rootT = (n: TNode): string => (n.children.length ? merkleRoot(n.children.map(leafT)) : '');
function buildPath(heir: TNode, indices: number[]): PathLink[] {
  const path: PathLink[] = [];
  let parent = heir;
  for (const idx of indices) {
    const sib = parent.children;
    const node = sib[idx]!;
    path.push({ basisPoints: node.bp, secret: node.secret, successorsRoot: rootT(node), proof: merkleProof(sib.map(leafT), idx) });
    parent = node;
  }
  return path;
}
const allClosed = (n: number): boolean[] => Array.from({ length: n }, () => true);
const noneClaimed = (n: number): boolean[] => Array.from({ length: n }, () => false);

// A heir H with two children C1, C2; C1 has two children G1, G2.
const G1: TNode = { bp: 6000, secret: 'g1', children: [] };
const G2: TNode = { bp: 4000, secret: 'g2', children: [] };
const C1: TNode = { bp: 5000, secret: 'c1', children: [G1, G2] };
const C2: TNode = { bp: 5000, secret: 'c2', children: [] };
const HEIR: TNode = { bp: 10000, secret: 'h', children: [C1, C2] };
const HEIR_ROOT = rootT(HEIR);

// ═════════════════════════════════════════════════════════════════════════════
// A. Merkle helpers
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.A: merkle helpers', () => {
  const leaves = ['a', 'b', 'c', 'd'].map((x) => nodeLeaf(1, x, ''));
  it('MK-01 root is deterministic', () => expect(merkleRoot(leaves)).toBe(merkleRoot(leaves)));
  it('MK-02 a member verifies with its proof', () => expect(merkleVerify(leaves[0]!, merkleProof(leaves, 0), merkleRoot(leaves))).toBe(true));
  it('MK-03 every member verifies', () => {
    for (let i = 0; i < leaves.length; i++) expect(merkleVerify(leaves[i]!, merkleProof(leaves, i), merkleRoot(leaves))).toBe(true);
  });
  it('MK-04 a non-member fails', () => expect(merkleVerify(nodeLeaf(1, 'z', ''), merkleProof(leaves, 0), merkleRoot(leaves))).toBe(false));
  it('MK-05 a tampered proof fails', () => {
    const proof = merkleProof(leaves, 0); const bad = [...proof]; bad[0] = nodeLeaf(9, 'x', '');
    expect(merkleVerify(leaves[0]!, bad, merkleRoot(leaves))).toBe(false);
  });
  it('MK-06 hashPair is order-independent (sorted)', () => expect(hashPair('a', 'b')).toBe(hashPair('b', 'a')));
  // odd-sized trees
  for (const size of [1, 2, 3, 5, 7, 8]) {
    const ls = Array.from({ length: size }, (_, i) => nodeLeaf(1, `n${i}`, ''));
    it(`MK-size-${size} all members verify in a ${size}-leaf tree`, () => {
      const root = merkleRoot(ls);
      for (let i = 0; i < size; i++) expect(merkleVerify(ls[i]!, merkleProof(ls, i), root)).toBe(true);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Node commitment binding
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.B: commitment binding', () => {
  it('CMT-01 nodeLeaf is deterministic', () => expect(nodeLeaf(5000, 's', '')).toBe(nodeLeaf(5000, 's', '')));
  it('CMT-02 different basisPoints → different leaf', () => expect(nodeLeaf(5000, 's', '')).not.toBe(nodeLeaf(5001, 's', '')));
  it('CMT-03 different secret → different leaf', () => expect(nodeLeaf(5000, 's', '')).not.toBe(nodeLeaf(5000, 't', '')));
  it('CMT-04 different successorsRoot → different leaf', () => expect(nodeLeaf(5000, 's', '')).not.toBe(nodeLeaf(5000, 's', 'root')));
  it('CMT-05 leafOf matches nodeLeaf', () => {
    const link: PathLink = { basisPoints: 5000, secret: 's', successorsRoot: '', proof: [] };
    expect(leafOf(link)).toBe(nodeLeaf(5000, 's', ''));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Path verification — valid paths
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.C: valid paths', () => {
  it('VP-01 a 1-level path (heir → child C1) verifies', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(true);
  });
  it('VP-02 the other child C2 verifies', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [1]), noneClaimed(1), allClosed(1)).ok).toBe(true);
  });
  it('VP-03 a 2-level path (heir → C1 → G1) verifies', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(2), allClosed(2)).ok).toBe(true);
  });
  it('VP-04 a 2-level path to G2 verifies', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 1]), noneClaimed(2), allClosed(2)).ok).toBe(true);
  });
  it('VP-05 "to my children" — BOTH children are reachable (multi-successor)', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(true);
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [1]), noneClaimed(1), allClosed(1)).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Depth bound
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.D: depth bound', () => {
  // build a 4-deep lineage to exceed MAX_RETURN_DEPTH=3
  const L4: TNode = { bp: 10000, secret: 'l4', children: [] };
  const L3: TNode = { bp: 10000, secret: 'l3', children: [L4] };
  const L2: TNode = { bp: 10000, secret: 'l2', children: [L3] };
  const L1: TNode = { bp: 10000, secret: 'l1', children: [L2] };
  const ROOT4: TNode = { bp: 10000, secret: 'r', children: [L1] };
  it('DEPTH-01 a depth-3 path verifies', () => {
    expect(verifyReturnPath(rootT(ROOT4), buildPath(ROOT4, [0, 0, 0]), noneClaimed(3), allClosed(3)).ok).toBe(true);
  });
  it('DEPTH-02 a depth-4 path is rejected (exceeds MAX_RETURN_DEPTH)', () => {
    expect(verifyReturnPath(rootT(ROOT4), buildPath(ROOT4, [0, 0, 0, 0]), noneClaimed(4), allClosed(4))).toEqual({ ok: false, reason: 'COR_DepthExceeded' });
  });
  it('DEPTH-03 MAX_RETURN_DEPTH is 3', () => expect(MAX_RETURN_DEPTH).toBe(3));
  it('DEPTH-04 an empty path is rejected', () => expect(verifyReturnPath(HEIR_ROOT, [], [], [])).toEqual({ ok: false, reason: 'COR_EmptyPath' }));
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Window-open rejection (genuine-non-claim trigger)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.E: window-open rejection', () => {
  it('WIN-01 a path is rejected if the ancestor window is still open', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), [false])).toEqual({ ok: false, reason: 'COR_AncestorWindowOpen' });
  });
  it('WIN-02 a 2-level path is rejected if ANY ancestor window is open', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(2), [true, false]).ok).toBe(false);
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(2), [false, true]).ok).toBe(false);
  });
  it('WIN-03 a path is accepted only when all windows are closed', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(2), [true, true]).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Ancestor-claimed rejection
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.F: ancestor-claimed rejection', () => {
  it('CLM-01 a path is rejected if the ancestor actually claimed', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), [true], allClosed(1))).toEqual({ ok: false, reason: 'COR_AncestorClaimed' });
  });
  it('CLM-02 a 2-level path is rejected if any ancestor claimed', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), [true, false], allClosed(2)).ok).toBe(false);
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), [false, true], allClosed(2)).ok).toBe(false);
  });
  it('CLM-03 a path is accepted only when no ancestor claimed', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), [false, false], allClosed(2)).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Bad proof / tampering rejection
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.G: tampering rejection', () => {
  it('BAD-01 an inflated basisPoints breaks the commitment', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, basisPoints: 9999 };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('BAD-02 a wrong secret breaks the commitment', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, secret: 'forged' };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('BAD-03 a tampered proof fails', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, proof: [nodeLeaf(1, 'junk', '')] };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('BAD-04 a zero basisPoints is rejected', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, basisPoints: 0 };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('BAD-05 a basisPoints above 10000 is rejected', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, basisPoints: 10001 };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('BAD-06 a mismatched array length is rejected', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(1), allClosed(2)).ok).toBe(false);
  });
  it('BAD-07 a wrong heir root is rejected', () => {
    expect(verifyReturnPath(nodeLeaf(1, 'wrong', ''), buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Cascaded share (product + monotonicity)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.H: cascaded share', () => {
  it('SH-01 heir → C1 (50%) gives 5000 bps', () => expect(computeCascadedBasisPoints(buildPath(HEIR, [0]))).toBe(5000));
  it('SH-02 heir → C1 (50%) → G1 (60%) gives 3000 bps', () => expect(computeCascadedBasisPoints(buildPath(HEIR, [0, 0]))).toBe(3000));
  it('SH-03 heir → C1 (50%) → G2 (40%) gives 2000 bps', () => expect(computeCascadedBasisPoints(buildPath(HEIR, [0, 1]))).toBe(2000));
  it('SH-04 the cascade is monotonically non-increasing', () => {
    expect(cascadeMonotonic(buildPath(HEIR, [0, 0]))).toBe(true);
    expect(cascadeMonotonic(buildPath(HEIR, [0, 1]))).toBe(true);
  });
  // product sweep
  const cases: Array<[number[], number]> = [
    [[10000], 10000], [[5000], 5000], [[2500], 2500], [[10000, 10000], 10000], [[5000, 5000], 2500], [[5000, 2000], 1000],
  ];
  cases.forEach(([bps, expected], i) => it(`SH-prod-${i} product of ${bps} = ${expected}`, () => {
    const path: PathLink[] = bps.map((b) => ({ basisPoints: b, secret: 's', successorsRoot: '', proof: [] }));
    expect(computeCascadedBasisPoints(path)).toBe(expected);
  }));
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Full distribution resolution
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.I: distribution resolution', () => {
  const tree = (claims: Record<string, boolean>): ReturnNode[] => [
    { id: 'C1', basisPoints: 5000, claimed: claims.C1 ?? false, successors: [
      { id: 'G1', basisPoints: 6000, claimed: claims.G1 ?? false, successors: [] },
      { id: 'G2', basisPoints: 4000, claimed: claims.G2 ?? false, successors: [] },
    ] },
    { id: 'C2', basisPoints: 5000, claimed: claims.C2 ?? false, successors: [] },
  ];
  it('DIST-01 all heirs claim → each gets their share', () => {
    expect(resolveEstate(tree({ C1: true, C2: true }))).toEqual({ C1: 5000, C2: 5000 });
  });
  it('DIST-02 C1 predeceases → C1 share cascades to G1+G2', () => {
    expect(resolveEstate(tree({ C1: false, C2: true, G1: true, G2: true }))).toEqual({ G1: 3000, G2: 2000, C2: 5000 });
  });
  it('DIST-03 C1 and G1 predecease, G2 claims → only G2 gets C1 subtree', () => {
    expect(resolveEstate(tree({ C1: false, C2: true, G1: false, G2: true }))).toEqual({ G2: 2000, C2: 5000 });
  });
  it('DIST-04 dead-end: C2 predeceases with no successors → C2 share is residual (not distributed)', () => {
    const d = resolveEstate(tree({ C1: true, C2: false }));
    expect(d).toEqual({ C1: 5000 }); // C2's 5000 stays residual, never invented or seized
  });
  it('DIST-05 nobody claims → empty distribution (all residual)', () => {
    expect(resolveEstate(tree({}))).toEqual({});
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Conservation
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.J: conservation', () => {
  const trees: Array<Record<string, boolean>> = [
    { C1: true, C2: true }, { C1: false, C2: true, G1: true, G2: true }, { C1: false, G1: true }, {},
    { C1: true, C2: false }, { C1: false, C2: false, G1: true, G2: true },
  ];
  const mk = (claims: Record<string, boolean>): ReturnNode[] => [
    { id: 'C1', basisPoints: 5000, claimed: claims.C1 ?? false, successors: [
      { id: 'G1', basisPoints: 6000, claimed: claims.G1 ?? false, successors: [] },
      { id: 'G2', basisPoints: 4000, claimed: claims.G2 ?? false, successors: [] },
    ] },
    { id: 'C2', basisPoints: 5000, claimed: claims.C2 ?? false, successors: [] },
  ];
  trees.forEach((c, i) => it(`CONS-${i} distribution never exceeds the estate`, () => expect(distributionConserves(mk(c))).toBe(true)));
  it('CONS-sum a fully-claimed estate sums to exactly 10000', () => {
    const total = Object.values(resolveEstate(mk({ C1: true, C2: true }))).reduce((a, b) => a + b, 0);
    expect(total).toBe(10000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Non-custodial + anti-abuse
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.K: non-custodial & anti-abuse', () => {
  it('NC-01 the cascade never moves funds', () => expect(cascadeMovesFunds()).toBe(false));
  it('NC-02 the cascade never seizes funds', () => expect(cascadeSeizesFunds()).toBe(false));
  it('NC-03 a share can never reach an arbitrary party', () => expect(shareCanReachArbitraryParty()).toBe(false));
  it('ABUSE-01 a cascade is rejected without a genuine non-claim (window open OR ancestor claimed)', () => {
    expect(cascadeHonoredWithoutGenuineNonClaim(HEIR_ROOT, buildPath(HEIR, [0]))).toBe(false);
  });
  it('ABUSE-02 an outsider cannot insert themselves (no valid proof in the heir set)', () => {
    const outsider: PathLink = { basisPoints: 10000, secret: 'outsider', successorsRoot: '', proof: [] };
    expect(verifyReturnPath(HEIR_ROOT, [outsider], noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('ABUSE-03 a successor cannot claim a sibling subtree they were not committed into', () => {
    // try to use C1's proof but G's body — mismatched
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, secret: 'g1' };
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.L: lifecycle narratives', () => {
  it('LIFE-01 "to my two children" — both reachable, each 50%', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(true);
    expect(computeCascadedBasisPoints(buildPath(HEIR, [0]))).toBe(5000);
    expect(computeCascadedBasisPoints(buildPath(HEIR, [1]))).toBe(5000);
  });
  it('LIFE-02 "if a child predeceases, to their children" — C1 gone, G1+G2 inherit C1 share', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), noneClaimed(2), allClosed(2)).ok).toBe(true);
    expect(computeCascadedBasisPoints(buildPath(HEIR, [0, 0]))).toBe(3000); // 50% * 60%
  });
  it('LIFE-03 a living child blocks the cascade past itself', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), [true, false], allClosed(2)).ok).toBe(false);
  });
  it('LIFE-04 the estate is conserved across the generations', () => {
    expect(distributionConserves([
      { id: 'C1', basisPoints: 5000, claimed: false, successors: [
        { id: 'G1', basisPoints: 6000, claimed: true, successors: [] },
        { id: 'G2', basisPoints: 4000, claimed: true, successors: [] },
      ] },
      { id: 'C2', basisPoints: 5000, claimed: true, successors: [] },
    ])).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Merkle membership sweep (larger successor sets — "to my N children")
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.M: large successor sets', () => {
  for (const n of [2, 3, 4, 6, 8, 10]) {
    const children: TNode[] = Array.from({ length: n }, (_, i) => ({ bp: Math.floor(10000 / n), secret: `c${i}`, children: [] }));
    const parent: TNode = { bp: 10000, secret: 'p', children };
    const root = rootT(parent);
    it(`SET-${n} all ${n} children verify against the parent root`, () => {
      for (let i = 0; i < n; i++) {
        expect(verifyReturnPath(root, buildPath(parent, [i]), noneClaimed(1), allClosed(1)).ok).toBe(true);
      }
    });
    it(`SET-${n}-outsider an outsider cannot verify against a ${n}-child set`, () => {
      const outsider: PathLink = { basisPoints: 5000, secret: 'intruder', successorsRoot: '', proof: merkleProof(children.map(leafT), 0) };
      expect(verifyReturnPath(root, [outsider], noneClaimed(1), allClosed(1)).ok).toBe(false);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Window × claim grid for a 2-level path
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.N: window × claim grid', () => {
  for (const w0 of [false, true]) for (const w1 of [false, true]) for (const c0 of [false, true]) for (const c1 of [false, true]) {
    const valid = w0 && w1 && !c0 && !c1; // both windows closed AND neither ancestor claimed
    it(`GRID-w${w0 ? 1 : 0}${w1 ? 1 : 0}-c${c0 ? 1 : 0}${c1 ? 1 : 0} → ${valid ? 'valid' : 'rejected'}`, () => {
      expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0, 0]), [c0, c1], [w0, w1]).ok).toBe(valid);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// O. Cascaded-share product sweep
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.O: product sweep', () => {
  const sweeps: number[][] = [
    [10000], [7500], [5000], [2500], [1000],
    [10000, 5000], [5000, 5000], [8000, 5000], [5000, 2000], [3000, 3000],
    [10000, 10000, 10000], [5000, 5000, 5000], [8000, 5000, 5000], [10000, 5000, 2000],
  ];
  sweeps.forEach((bps, i) => {
    const expected = bps.reduce((acc, b) => Math.floor((acc * b) / TOTAL_BASIS_POINTS), TOTAL_BASIS_POINTS);
    it(`PROD-${i} ${bps.join('×')} → ${expected} bps`, () => {
      const path: PathLink[] = bps.map((b) => ({ basisPoints: b, secret: 's', successorsRoot: '', proof: [] }));
      expect(computeCascadedBasisPoints(path)).toBe(expected);
      expect(cascadeMonotonic(path)).toBe(true);
      expect(expected).toBeLessThanOrEqual(TOTAL_BASIS_POINTS);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P. Distribution resolution sweep (various claim patterns)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.P: distribution sweep', () => {
  const mk = (claims: Record<string, boolean>): ReturnNode[] => [
    { id: 'C1', basisPoints: 6000, claimed: claims.C1 ?? false, successors: [
      { id: 'G1', basisPoints: 5000, claimed: claims.G1 ?? false, successors: [] },
      { id: 'G2', basisPoints: 5000, claimed: claims.G2 ?? false, successors: [] },
    ] },
    { id: 'C2', basisPoints: 4000, claimed: claims.C2 ?? false, successors: [
      { id: 'G3', basisPoints: 10000, claimed: claims.G3 ?? false, successors: [] },
    ] },
  ];
  const patterns: Array<[Record<string, boolean>, Record<string, number>]> = [
    [{ C1: true, C2: true }, { C1: 6000, C2: 4000 }],
    [{ C1: false, C2: true, G1: true, G2: true }, { G1: 3000, G2: 3000, C2: 4000 }],
    [{ C1: true, C2: false, G3: true }, { C1: 6000, G3: 4000 }],
    [{ C1: false, C2: false, G1: true, G2: true, G3: true }, { G1: 3000, G2: 3000, G3: 4000 }],
    [{ C1: false, C2: true, G1: true }, { G1: 3000, C2: 4000 }],
  ];
  patterns.forEach(([claims, expected], i) => it(`PD-${i} resolves correctly`, () => expect(resolveEstate(mk(claims))).toEqual(expected)));
  patterns.forEach(([claims], i) => it(`PD-cons-${i} conserves`, () => expect(distributionConserves(mk(claims))).toBe(true)));
});

// ═════════════════════════════════════════════════════════════════════════════
// Q. Closing whole-feature invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.Q: closing invariants', () => {
  it('CLOSE-01 the cascade resolves WHO claims; it never moves or seizes funds', () => {
    expect(cascadeMovesFunds()).toBe(false);
    expect(cascadeSeizesFunds()).toBe(false);
  });
  it('CLOSE-02 multi-successor succession works ("to my children")', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(true);
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [1]), noneClaimed(1), allClosed(1)).ok).toBe(true);
  });
  it('CLOSE-03 cascade requires a genuine non-claim and bounded depth', () => {
    expect(cascadeHonoredWithoutGenuineNonClaim(HEIR_ROOT, buildPath(HEIR, [0]))).toBe(false);
    expect(MAX_RETURN_DEPTH).toBe(3);
  });
  it('CLOSE-04 a share can only reach the heir or the heir’s own committed descendants', () => {
    expect(shareCanReachArbitraryParty()).toBe(false);
    const outsider: PathLink = { basisPoints: 10000, secret: 'x', successorsRoot: '', proof: [] };
    expect(verifyReturnPath(HEIR_ROOT, [outsider], noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('CLOSE-05 conservation holds and shares are monotonic down the path', () => {
    expect(cascadeMonotonic(buildPath(HEIR, [0, 0]))).toBe(true);
    expect(computeCascadedBasisPoints(buildPath(HEIR, [0, 0]))).toBeLessThanOrEqual(computeCascadedBasisPoints(buildPath(HEIR, [0])));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// R. 3-level lineage distribution + conservation
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.R: 3-level lineage', () => {
  // C1 (50%) → G1 (50%) → GG1 (100%) ; C2 (50%)
  const mk = (claims: Record<string, boolean>): ReturnNode[] => [
    { id: 'C1', basisPoints: 5000, claimed: claims.C1 ?? false, successors: [
      { id: 'G1', basisPoints: 5000, claimed: claims.G1 ?? false, successors: [
        { id: 'GG1', basisPoints: 10000, claimed: claims.GG1 ?? false, successors: [] },
      ] },
      { id: 'G2', basisPoints: 5000, claimed: claims.G2 ?? false, successors: [] },
    ] },
    { id: 'C2', basisPoints: 5000, claimed: claims.C2 ?? false, successors: [] },
  ];
  const cases: Array<[Record<string, boolean>, Record<string, number>]> = [
    [{ C1: true, C2: true }, { C1: 5000, C2: 5000 }],
    [{ C2: true, G1: true, G2: true }, { G1: 2500, G2: 2500, C2: 5000 }],         // C1 gone → G1,G2 split C1's 5000
    [{ C2: true, G2: true, GG1: true }, { GG1: 2500, G2: 2500, C2: 5000 }],       // C1,G1 gone → GG1 takes G1's 1250
    [{ C2: true, G2: true }, { G2: 2500, C2: 5000 }],                              // C1,G1 gone, GG1 also gone → residual
  ];
  cases.forEach(([claims, expected], i) => it(`R3-${i} resolves`, () => expect(resolveEstate(mk(claims))).toEqual(expected)));
  cases.forEach(([claims], i) => it(`R3-cons-${i} conserves`, () => expect(distributionConserves(mk(claims))).toBe(true)));
  it('R3-depth-cap a 4th generation would exceed the cap (depth>3 returns residual)', () => {
    const deep: ReturnNode = { id: 'C1', basisPoints: 10000, claimed: false, successors: [
      { id: 'G1', basisPoints: 10000, claimed: false, successors: [
        { id: 'GG1', basisPoints: 10000, claimed: false, successors: [
          { id: 'GGG1', basisPoints: 10000, claimed: true, successors: [] }, // depth 4 → not distributed
        ] },
      ] },
    ] };
    expect(resolveEstate([deep])).toEqual({}); // GGG1 at depth 4 is beyond MAX_RETURN_DEPTH → residual
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// S. Deeper merkle proof integrity (mixed tree shapes)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.S: merkle integrity at scale', () => {
  for (const n of [3, 5, 9, 12, 16]) {
    const leaves = Array.from({ length: n }, (_, i) => nodeLeaf(i + 1, `s${i}`, ''));
    const root = merkleRoot(leaves);
    it(`MI-${n} every leaf of a ${n}-leaf tree verifies; a forged leaf does not`, () => {
      for (let i = 0; i < n; i++) expect(merkleVerify(leaves[i]!, merkleProof(leaves, i), root)).toBe(true);
      expect(merkleVerify(nodeLeaf(999, 'forged', ''), merkleProof(leaves, 0), root)).toBe(false);
    });
  }
  it('MI-empty an empty successor set has an empty root (a true leaf node)', () => expect(merkleRoot([])).toBe(''));
});

// ═════════════════════════════════════════════════════════════════════════════
// T. Additional anti-abuse edges
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.T: anti-abuse edges', () => {
  it('AAE-01 swapping a valid proof onto a different (uncommitted) body fails', () => {
    const p = buildPath(HEIR, [0]); p[0] = { ...p[0]!, basisPoints: 7000 }; // C1 was 5000
    expect(verifyReturnPath(HEIR_ROOT, p, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('AAE-02 claiming a grandchild directly against the heir root (skipping the parent) fails', () => {
    // try G1's link but prove against HEIR_ROOT at level 0
    const g1path = buildPath(HEIR, [0, 0]); // [C1, G1]
    const skip: PathLink[] = [g1path[1]!]; // just G1, proof is within C1's set, not heir's
    expect(verifyReturnPath(HEIR_ROOT, skip, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('AAE-03 reusing C1 proof for the C2 slot fails', () => {
    const p = buildPath(HEIR, [0]); // C1 with C1 proof
    const c2body = buildPath(HEIR, [1])[0]!; // C2 body
    const mixed: PathLink[] = [{ ...c2body, proof: p[0]!.proof }]; // C2 body + C1 proof
    expect(verifyReturnPath(HEIR_ROOT, mixed, noneClaimed(1), allClosed(1)).ok).toBe(false);
  });
  it('AAE-04 a genuine claim still works after all the abuse checks', () => {
    expect(verifyReturnPath(HEIR_ROOT, buildPath(HEIR, [0]), noneClaimed(1), allClosed(1)).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// U. Additional share-conservation & boundary scenarios
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 13.U: additional boundaries', () => {
  it('UB-01 a single 100% heir who predeceases cascades the whole estate to one child', () => {
    const t: ReturnNode[] = [{ id: 'C1', basisPoints: 10000, claimed: false, successors: [
      { id: 'G1', basisPoints: 10000, claimed: true, successors: [] },
    ] }];
    expect(resolveEstate(t)).toEqual({ G1: 10000 });
  });
  it('UB-02 a 100% heir who predeceases with two equal children splits the estate', () => {
    const t: ReturnNode[] = [{ id: 'C1', basisPoints: 10000, claimed: false, successors: [
      { id: 'G1', basisPoints: 5000, claimed: true, successors: [] },
      { id: 'G2', basisPoints: 5000, claimed: true, successors: [] },
    ] }];
    expect(resolveEstate(t)).toEqual({ G1: 5000, G2: 5000 });
  });
  it('UB-03 partial cascade: one child claims, one child predeceases without successors', () => {
    const t: ReturnNode[] = [{ id: 'C1', basisPoints: 10000, claimed: false, successors: [
      { id: 'G1', basisPoints: 5000, claimed: true, successors: [] },
      { id: 'G2', basisPoints: 5000, claimed: false, successors: [] },
    ] }];
    expect(resolveEstate(t)).toEqual({ G1: 5000 }); // G2's 5000 stays residual
    expect(distributionConserves(t)).toBe(true);
  });
  it('UB-04 deepest valid path (depth 3) computes the product correctly', () => {
    const path: PathLink[] = [
      { basisPoints: 5000, secret: 'a', successorsRoot: '', proof: [] },
      { basisPoints: 5000, secret: 'b', successorsRoot: '', proof: [] },
      { basisPoints: 4000, secret: 'c', successorsRoot: '', proof: [] },
    ];
    expect(computeCascadedBasisPoints(path)).toBe(1000); // 50% * 50% * 40% = 10%
  });
  it('UB-05 a fully-cascaded estate (all heirs predecease, all grandchildren claim) conserves', () => {
    const t: ReturnNode[] = [
      { id: 'C1', basisPoints: 5000, claimed: false, successors: [{ id: 'G1', basisPoints: 10000, claimed: true, successors: [] }] },
      { id: 'C2', basisPoints: 5000, claimed: false, successors: [{ id: 'G2', basisPoints: 10000, claimed: true, successors: [] }] },
    ];
    expect(resolveEstate(t)).toEqual({ G1: 5000, G2: 5000 });
    expect(distributionConserves(t)).toBe(true);
  });
  it('UB-06 claimCascade-style uniqueness: the same leaf is computed deterministically', () => {
    const link: PathLink = { basisPoints: 5000, secret: 's', successorsRoot: '', proof: [] };
    expect(leafOf(link)).toBe(leafOf({ ...link }));
  });
});
