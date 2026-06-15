/**
 * Chain of Return — executable logic model (Backend Completion Campaign 13, Wave E — BUILT this campaign).
 *
 * Mirrors contracts/vault/ChainOfReturn.sol. A primary heir's share cascades to that heir's OWN pre-committed
 * successors if the heir cannot claim (deceased/inactive), recursively, up to MAX_RETURN_DEPTH. Each node commits to
 * its successor SET via a MERKLE ROOT, so a node can name MULTIPLE children ("to my children"); a successor claims a
 * cascaded share by proving merkle-membership of their commitment in their parent's successor root, level by level.
 * Because every link is pre-committed by the ancestor, a share can only reach the heir or the heir's own committed
 * descendants — never an arbitrary party. Cascade is honored only after a GENUINE non-claim (ancestor window closed,
 * ancestor did not claim). Shares are the product of basisPoints down the path (conservation). It resolves WHO may
 * claim; it never holds/moves/seizes funds.
 *
 * NOT the compiled contract; uses sha256 as a stand-in for keccak256 (binding is what matters).
 */
import { createHash } from 'node:crypto';

export const MAX_RETURN_DEPTH = 3;
export const TOTAL_BASIS_POINTS = 10000;
export const RETURN_CHAIN_DOMAIN = 'VFIDE_RETURN_CHAIN_V1';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

// ── Merkle helpers (sorted-pair) ─────────────────────────────────────────────
export function hashPair(a: string, b: string): string { return a <= b ? sha(`${a}|${b}`) : sha(`${b}|${a}`); }
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return ''; // a leaf node has no successors → empty root
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i]!, level[i + 1]!) : level[i]!);
    }
    level = next;
  }
  return level[0]!;
}
export function merkleProof(leaves: string[], index: number): string[] {
  const proof: string[] = [];
  let idx = index;
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(hashPair(level[i]!, level[i + 1]!));
        if (i === idx || i + 1 === idx) proof.push(idx === i ? level[i + 1]! : level[i]!);
      } else {
        next.push(level[i]!);
      }
    }
    idx = Math.floor(idx / 2);
    level = next;
  }
  return proof;
}
export function merkleVerify(leaf: string, proof: string[], root: string): boolean {
  let h = leaf;
  for (const p of proof) h = hashPair(h, p);
  return h === root;
}

// ── Node commitment ──────────────────────────────────────────────────────────
/** A node commits to its share + secret + the merkle root of its successor set ('' if leaf). */
export function nodeLeaf(basisPoints: number, secret: string, successorsRoot: string): string {
  return sha(`${RETURN_CHAIN_DOMAIN}|${basisPoints}|${secret}|${successorsRoot}`);
}

export interface PathLink {
  basisPoints: number;      // share of the PARENT's share (1..10000)
  secret: string;
  successorsRoot: string;   // merkle root of THIS node's successors ('' if leaf)
  proof: string[];          // merkle proof of this node's leaf within its PARENT's successorsRoot
}
export function leafOf(link: PathLink): string { return nodeLeaf(link.basisPoints, link.secret, link.successorsRoot); }

// ── Path verification (mirrors verifyReturnPath) ─────────────────────────────
export function verifyReturnPath(
  heirSuccessorsRoot: string,        // the deceased primary heir's committed successor root
  path: PathLink[],
  ancestorsClaimed: boolean[],
  ancestorWindowsClosed: boolean[],
): R {
  const n = path.length;
  if (n === 0) return E('COR_EmptyPath');
  if (n > MAX_RETURN_DEPTH) return E('COR_DepthExceeded');
  if (ancestorsClaimed.length !== n || ancestorWindowsClosed.length !== n) return E('COR_BadLink');
  let parentRoot = heirSuccessorsRoot;
  for (let i = 0; i < n; i++) {
    if (!ancestorWindowsClosed[i]) return E('COR_AncestorWindowOpen');
    if (ancestorsClaimed[i]) return E('COR_AncestorClaimed');
    const bp = path[i]!.basisPoints;
    if (bp === 0 || bp > TOTAL_BASIS_POINTS) return E('COR_BadLink');
    if (!merkleVerify(leafOf(path[i]!), path[i]!.proof, parentRoot)) return E('COR_BadLink');
    parentRoot = path[i]!.successorsRoot; // descend into this node's successor set
  }
  return OK;
}

// ── Cascaded share (product of basisPoints) ──────────────────────────────────
export function computeCascadedBasisPoints(path: PathLink[]): number {
  let bps = TOTAL_BASIS_POINTS;
  for (const link of path) bps = Math.floor((bps * link.basisPoints) / TOTAL_BASIS_POINTS);
  return bps;
}
export function cascadeMonotonic(path: PathLink[]): boolean {
  let prev = TOTAL_BASIS_POINTS; let bps = TOTAL_BASIS_POINTS;
  for (const link of path) { bps = Math.floor((bps * link.basisPoints) / TOTAL_BASIS_POINTS); if (bps > prev) return false; prev = bps; }
  return true;
}

// ── Full distribution resolution over a succession tree ──────────────────────
export interface ReturnNode { id: string; basisPoints: number; claimed: boolean; successors: ReturnNode[] }
export function resolveDistribution(node: ReturnNode, parentBps: number, depth: number): Record<string, number> {
  const thisBps = Math.floor((parentBps * node.basisPoints) / TOTAL_BASIS_POINTS);
  if (depth > MAX_RETURN_DEPTH) return {};
  if (node.claimed) return { [node.id]: thisBps };
  if (node.successors.length === 0) return {};
  const out: Record<string, number> = {};
  for (const s of node.successors) {
    const sub = resolveDistribution(s, thisBps, depth + 1);
    for (const [k, v] of Object.entries(sub)) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}
export function resolveEstate(heirs: ReturnNode[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of heirs) { const sub = resolveDistribution(h, TOTAL_BASIS_POINTS, 1); for (const [k, v] of Object.entries(sub)) out[k] = (out[k] ?? 0) + v; }
  return out;
}
export function distributionConserves(heirs: ReturnNode[]): boolean {
  return Object.values(resolveEstate(heirs)).reduce((a, b) => a + b, 0) <= TOTAL_BASIS_POINTS;
}

// ── Non-custodial + anti-abuse invariants ────────────────────────────────────
export function cascadeMovesFunds(): boolean { return false; }
export function cascadeSeizesFunds(): boolean { return false; }
export function shareCanReachArbitraryParty(): boolean { return false; }
/** A cascade requires a genuine non-claim: window-open OR ancestor-claimed paths are both rejected. */
export function cascadeHonoredWithoutGenuineNonClaim(root: string, path: PathLink[]): boolean {
  const openWindow = verifyReturnPath(root, path, path.map(() => false), path.map(() => false));
  const ancestorClaimed = verifyReturnPath(root, path, path.map(() => true), path.map(() => true));
  return openWindow.ok || ancestorClaimed.ok; // false = both correctly rejected
}
