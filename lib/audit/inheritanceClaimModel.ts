/**
 * Inheritance Claims — executable logic model (ACTIVE path audit, Continuity Audit 3).
 *
 * Mirrors the commit-reveal heir claim + proportional distribution in `CardBoundVaultInheritanceManager.sol`:
 * `claimHeirShare` (commitment binding, replay protection) and `finalizeInheritanceDistribution` (proportional
 * split, over/under-subscription, rounding, the zero-weight guard added in Audit 3). NOT the compiled contract.
 *
 * Modeled invariants (asserted by the matrix):
 *  • basisPoints is BOUND in the commitment hash — an heir cannot reveal more (or different) than the owner
 *    committed; a wrong basisPoints / secret / actor / config does not match.
 *  • Replay protection: an heir cannot reveal twice (per-nonce), and a commitment cannot be claimed twice ever.
 *  • Distribution is PROPORTIONAL to totalRevealed → sum of payouts == vault balance (no over-payment even when
 *    the owner over-subscribed commitments > 10000); the last revealer absorbs rounding dust (no wei lost).
 *  • Under-subscription redistributes to revealers (documented policy, not a bug).
 *  • Zero-weight reveal set (all revealers committed 0 bps) finalizes with NO distribution → memorial
 *    (Audit-3 fix: no division by zero).
 *  • Only a configured heir can reveal; a non-heir is rejected.
 */

export const TOTAL_BASIS_POINTS = 10000;

export interface Commitment {
  heir: string;
  basisPoints: number; // committed share (hidden in the hash on-chain)
  secret: string;
}

export interface ClaimState {
  configVersion: number;
  commitments: Map<string, Commitment>; // heir -> commitment (set by owner)
  vaultBalance: number;
  // reveal bookkeeping (per current nonce)
  revealed: Map<string, number>; // heir -> revealed basisPoints
  revealOrder: string[];
  claimedHashes: Set<string>; // global, across nonces (commitment hash uniqueness)
  totalRevealed: number;
  finalized: boolean;
  memorial: boolean;
  payout: Map<string, number>; // heir -> final payout
}

export function freshClaim(commitments: Commitment[], vaultBalance: number, configVersion = 1): ClaimState {
  return {
    configVersion,
    commitments: new Map(commitments.map((c) => [c.heir, c])),
    vaultBalance,
    revealed: new Map(),
    revealOrder: [],
    claimedHashes: new Set(),
    totalRevealed: 0,
    finalized: false,
    memorial: false,
    payout: new Map(),
  };
}

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

/** Mirrors keccak256(domain, chainid, vault, configVersion, actor, basisPoints, heirSecret). */
function commitmentHash(s: ClaimState, heir: string, basisPoints: number, secret: string): string {
  return `H(${s.configVersion}|${heir}|${basisPoints}|${secret})`;
}

/**
 * claimHeirShare: reveal a committed share. The hash must match the owner-set commitment, binding basisPoints +
 * actor + secret + config. Replay-protected per-nonce and globally by claimed hash.
 */
export function claimHeirShare(s: ClaimState, heir: string, basisPoints: number, secret: string): R {
  if (s.finalized) return E('already-finalized');
  if (s.revealed.has(heir)) return E('already-revealed');

  const expected = commitmentHash(s, heir, basisPoints, secret);
  const committed = s.commitments.get(heir);
  // commitment must exist and match EXACTLY (so wrong bps / secret / non-heir all fail)
  if (!committed || commitmentHash(s, heir, committed.basisPoints, committed.secret) !== expected) {
    return E('invalid-secret');
  }
  if (s.claimedHashes.has(expected)) return E('hash-already-claimed');

  s.revealed.set(heir, basisPoints);
  s.revealOrder.push(heir);
  s.claimedHashes.add(expected);
  s.totalRevealed += basisPoints;
  return OK;
}

/**
 * finalizeInheritanceDistribution (computation part): proportional split. Returns the payout map.
 * Zero-weight guard (Audit 3): totalRevealed == 0 → no distribution, memorial.
 */
export function finalize(s: ClaimState): R {
  if (s.finalized) return E('already-finalized');
  const revealedCount = s.revealOrder.length;

  if (revealedCount === 0) {
    s.finalized = true;
    s.memorial = true;
    return OK;
  }

  const totalRevealed = s.totalRevealed;
  // Audit-3 fix: zero-weight reveal set finalizes with no distribution (no division by zero).
  if (totalRevealed === 0) {
    s.finalized = true;
    s.memorial = true;
    return OK;
  }

  let runningPaid = 0;
  let runningBps = 0;
  for (let i = 0; i < revealedCount; i++) {
    const heir = s.revealOrder[i] ?? '';
    const revealedBps = s.revealed.get(heir) ?? 0;
    let pay: number;
    if (i === revealedCount - 1) {
      pay = s.vaultBalance - runningPaid; // last absorbs rounding dust
    } else {
      pay = Math.floor((s.vaultBalance * revealedBps) / totalRevealed);
      runningPaid += pay;
      runningBps += Math.floor((TOTAL_BASIS_POINTS * revealedBps) / totalRevealed);
    }
    s.payout.set(heir, pay);
  }
  s.finalized = true;
  return OK;
}

/** Sum of all payouts — must equal vault balance exactly (no over-payment, no dust loss). */
export function totalPaid(s: ClaimState): number {
  let sum = 0;
  for (const v of s.payout.values()) sum += v;
  return sum;
}
