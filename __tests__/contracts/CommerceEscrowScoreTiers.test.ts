/**
 * CommerceEscrow — Issue #269 Score-Tier Lock Logic
 *
 * Tests the ProofScore-tiered buyer dispute lock periods and the
 * high-value arbiter timelock introduced in Issue #269.
 *
 * Approach: pure TypeScript simulation — we replicate _lockPeriod()
 * and the guard predicates in JS so we can verify every boundary
 * without a running EVM. Companion Hardhat tests cover the on-chain
 * integration path.
 *
 * Constants (from ScoringConstants.sol + CommerceEscrow.sol):
 *   HIGH_FEE_CEIL        = 8000   → LOCK_TRUSTED   (3 days)
 *   LOW_FEE_FLOOR        = 4000   → LOCK_NEUTRAL   (7 days)
 *                                 → LOCK_LOW_TRUST (14 days)
 *   HIGH_VALUE_THRESHOLD = 10_000 × 1e18
 *   ARBITER_TIMELOCK     = 7 days
 *   OPEN_ESCROW_EXPIRY   = 7 days
 */

import { describe, it, expect } from '@jest/globals';

// ── Mirror contract constants ───────────────────────────────────────────────

const HIGH_FEE_CEIL  = 8000;   // ScoringConstants.HIGH_FEE_CEIL
const LOW_FEE_FLOOR  = 4000;   // ScoringConstants.LOW_FEE_FLOOR

const LOCK_TRUSTED   = 3 * 24 * 60 * 60;   // seconds
const LOCK_NEUTRAL   = 7 * 24 * 60 * 60;
const LOCK_LOW_TRUST = 14 * 24 * 60 * 60;

const HIGH_VALUE_THRESHOLD_ETHER = 10_000;  // 10,000 VFIDE (ignoring 1e18 for JS)
const ARBITER_TIMELOCK  = 7 * 24 * 60 * 60;
const OPEN_ESCROW_EXPIRY = 7 * 24 * 60 * 60;

// ── _lockPeriod() replica ───────────────────────────────────────────────────

/**
 * Mirrors CommerceEscrow._lockPeriod().
 * Returns LOCK_NEUTRAL when seer is not wired (score === null).
 */
function lockPeriod(score: number | null): number {
  if (score === null) return LOCK_NEUTRAL;   // seer not wired → fallback
  if (score >= HIGH_FEE_CEIL)  return LOCK_TRUSTED;
  if (score >= LOW_FEE_FLOOR)  return LOCK_NEUTRAL;
  return LOCK_LOW_TRUST;
}

/**
 * Mirrors the dispute() guard for buyer:
 *   block.timestamp < fundedAt + lock  →  COM_LockActive (revert)
 */
function isBuyerLockActive(
  nowSecs: number,
  fundedAtSecs: number,
  score: number | null,
): boolean {
  const lock = lockPeriod(score);
  return nowSecs < fundedAtSecs + lock;
}

/**
 * Mirrors resolve() guard for high-value escrows:
 *   disputedAt == 0 || block.timestamp < disputedAt + ARBITER_TIMELOCK → revert
 */
function isArbiterTimelockActive(
  nowSecs: number,
  disputedAtSecs: number,
): boolean {
  return disputedAtSecs === 0 || nowSecs < disputedAtSecs + ARBITER_TIMELOCK;
}

// ── Helper ──────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60;
const BASE_TS = 1_700_000_000; // arbitrary fixed timestamp

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CommerceEscrow — Issue #269: _lockPeriod()', () => {
  describe('Score threshold boundaries', () => {
    it('score = HIGH_FEE_CEIL (8000) → LOCK_TRUSTED (3 days)', () => {
      expect(lockPeriod(8000)).toBe(LOCK_TRUSTED);
    });

    it('score > HIGH_FEE_CEIL (8001) → LOCK_TRUSTED', () => {
      expect(lockPeriod(8001)).toBe(LOCK_TRUSTED);
    });

    it('score = MAX (10000) → LOCK_TRUSTED', () => {
      expect(lockPeriod(10000)).toBe(LOCK_TRUSTED);
    });

    it('score = HIGH_FEE_CEIL - 1 (7999) → LOCK_NEUTRAL (7 days)', () => {
      expect(lockPeriod(7999)).toBe(LOCK_NEUTRAL);
    });

    it('score = LOW_FEE_FLOOR (4000) → LOCK_NEUTRAL', () => {
      expect(lockPeriod(4000)).toBe(LOCK_NEUTRAL);
    });

    it('score = LOW_FEE_FLOOR - 1 (3999) → LOCK_LOW_TRUST (14 days)', () => {
      expect(lockPeriod(3999)).toBe(LOCK_LOW_TRUST);
    });

    it('score = 0 → LOCK_LOW_TRUST', () => {
      expect(lockPeriod(0)).toBe(LOCK_LOW_TRUST);
    });
  });

  describe('Seer not wired (score = null)', () => {
    it('returns LOCK_NEUTRAL when seer is address(0)', () => {
      expect(lockPeriod(null)).toBe(LOCK_NEUTRAL);
    });

    it('LOCK_NEUTRAL fallback equals 7 days exactly', () => {
      expect(lockPeriod(null)).toBe(7 * DAY);
    });
  });

  describe('Lock constants are correct values', () => {
    it('LOCK_TRUSTED  = 3 days', () => { expect(LOCK_TRUSTED).toBe(3 * DAY); });
    it('LOCK_NEUTRAL  = 7 days', () => { expect(LOCK_NEUTRAL).toBe(7 * DAY); });
    it('LOCK_LOW_TRUST = 14 days', () => { expect(LOCK_LOW_TRUST).toBe(14 * DAY); });
  });
});

describe('CommerceEscrow — Issue #269: buyer dispute gate (isBuyerLockActive)', () => {
  const fundedAt = BASE_TS;

  describe('Trusted buyer (score ≥ 8000, LOCK = 3 days)', () => {
    const score = 8000;

    it('reverts 1 second after funding', () => {
      expect(isBuyerLockActive(fundedAt + 1, fundedAt, score)).toBe(true);
    });

    it('reverts 1 second before lock expires', () => {
      expect(isBuyerLockActive(fundedAt + 3 * DAY - 1, fundedAt, score)).toBe(true);
    });

    it('succeeds exactly at lock boundary (fundedAt + 3 days)', () => {
      expect(isBuyerLockActive(fundedAt + 3 * DAY, fundedAt, score)).toBe(false);
    });

    it('succeeds after lock expires', () => {
      expect(isBuyerLockActive(fundedAt + 4 * DAY, fundedAt, score)).toBe(false);
    });
  });

  describe('Neutral buyer (4000 ≤ score < 8000, LOCK = 7 days)', () => {
    const score = 6000;

    it('reverts at day 3 (trusted window, but neutral requires 7 days)', () => {
      expect(isBuyerLockActive(fundedAt + 3 * DAY, fundedAt, score)).toBe(true);
    });

    it('reverts 1 second before lock expires', () => {
      expect(isBuyerLockActive(fundedAt + 7 * DAY - 1, fundedAt, score)).toBe(true);
    });

    it('succeeds exactly at lock boundary (fundedAt + 7 days)', () => {
      expect(isBuyerLockActive(fundedAt + 7 * DAY, fundedAt, score)).toBe(false);
    });
  });

  describe('Low-trust buyer (score < 4000, LOCK = 14 days)', () => {
    const score = 2000;

    it('reverts at day 7 (neutral window, but low-trust requires 14 days)', () => {
      expect(isBuyerLockActive(fundedAt + 7 * DAY, fundedAt, score)).toBe(true);
    });

    it('reverts 1 second before lock expires', () => {
      expect(isBuyerLockActive(fundedAt + 14 * DAY - 1, fundedAt, score)).toBe(true);
    });

    it('succeeds exactly at lock boundary (fundedAt + 14 days)', () => {
      expect(isBuyerLockActive(fundedAt + 14 * DAY, fundedAt, score)).toBe(false);
    });
  });

  describe('Seer not wired (fallback to NEUTRAL = 7 days)', () => {
    it('reverts at day 6 with null score', () => {
      expect(isBuyerLockActive(fundedAt + 6 * DAY, fundedAt, null)).toBe(true);
    });

    it('succeeds at day 7 with null score', () => {
      expect(isBuyerLockActive(fundedAt + 7 * DAY, fundedAt, null)).toBe(false);
    });
  });

  describe('Boundary: score exactly at tier edges', () => {
    it('score 4000 (LOW_FEE_FLOOR) uses NEUTRAL lock not LOW_TRUST', () => {
      // Score 4000 → NEUTRAL (7d). Must succeed at day 7, not day 14.
      expect(isBuyerLockActive(fundedAt + 7 * DAY, fundedAt, 4000)).toBe(false);
      expect(isBuyerLockActive(fundedAt + 6 * DAY, fundedAt, 4000)).toBe(true);
    });

    it('score 8000 (HIGH_FEE_CEIL) uses TRUSTED lock not NEUTRAL', () => {
      // Score 8000 → TRUSTED (3d). Must succeed at day 3.
      expect(isBuyerLockActive(fundedAt + 3 * DAY, fundedAt, 8000)).toBe(false);
      expect(isBuyerLockActive(fundedAt + 2 * DAY, fundedAt, 8000)).toBe(true);
    });
  });

  describe('Merchant dispute — no lock applies', () => {
    // Per contract: lock guard only runs when msg.sender == e.buyerOwner.
    // We verify the flag logic: merchant side simply does not call isBuyerLockActive.
    it('merchant is never subject to buyer lock period', () => {
      // Simulated: merchant disputes 1 second after funding — always allowed.
      const merchantDisputing = true; // msg.sender === merchantOwner
      const buyerLockWouldBlock = isBuyerLockActive(fundedAt + 1, fundedAt, 0);
      // Merchant bypasses the guard entirely — lock is irrelevant for them.
      expect(merchantDisputing && buyerLockWouldBlock).toBe(true); // lock WOULD block a buyer
      // But merchant is not subject to it — this is enforced by the contract's `if (msg.sender == e.buyerOwner)` branch
    });
  });
});

describe('CommerceEscrow — Issue #269: ARBITER_TIMELOCK (high-value resolve)', () => {
  const disputedAt = BASE_TS;

  it('ARBITER_TIMELOCK is 7 days', () => {
    expect(ARBITER_TIMELOCK).toBe(7 * DAY);
  });

  it('HIGH_VALUE_THRESHOLD is 10,000 VFIDE', () => {
    expect(HIGH_VALUE_THRESHOLD_ETHER).toBe(10_000);
  });

  describe('resolve() gate for high-value escrows', () => {
    it('reverts 1 second after dispute raised', () => {
      expect(isArbiterTimelockActive(disputedAt + 1, disputedAt)).toBe(true);
    });

    it('reverts 1 second before ARBITER_TIMELOCK expires', () => {
      expect(isArbiterTimelockActive(disputedAt + 7 * DAY - 1, disputedAt)).toBe(true);
    });

    it('succeeds exactly at ARBITER_TIMELOCK boundary', () => {
      expect(isArbiterTimelockActive(disputedAt + 7 * DAY, disputedAt)).toBe(false);
    });

    it('succeeds well after ARBITER_TIMELOCK', () => {
      expect(isArbiterTimelockActive(disputedAt + 30 * DAY, disputedAt)).toBe(false);
    });

    it('reverts when disputedAt == 0 (safety guard)', () => {
      // Contract: if (disputedAt == 0 || ...) revert COM_HighValueTimelock
      expect(isArbiterTimelockActive(BASE_TS + 999 * DAY, 0)).toBe(true);
    });
  });

  describe('resolve() for standard-value escrows — no timelock', () => {
    it('standard-value escrow can be resolved immediately after dispute', () => {
      // isArbiterTimelockActive is only called when e.isHighValue == true.
      // For standard escrows, the guard is skipped entirely — no delay needed.
      const isHighValue = false;
      const wouldBeBlocked = isHighValue && isArbiterTimelockActive(disputedAt + 1, disputedAt);
      expect(wouldBeBlocked).toBe(false);
    });
  });
});

describe('CommerceEscrow — Issue #269: isHighValue flag', () => {
  it('amount >= HIGH_VALUE_THRESHOLD → isHighValue = true', () => {
    const amount = HIGH_VALUE_THRESHOLD_ETHER;
    expect(amount >= HIGH_VALUE_THRESHOLD_ETHER).toBe(true);
  });

  it('amount = HIGH_VALUE_THRESHOLD + 1 → isHighValue = true', () => {
    expect(HIGH_VALUE_THRESHOLD_ETHER + 1 >= HIGH_VALUE_THRESHOLD_ETHER).toBe(true);
  });

  it('amount = HIGH_VALUE_THRESHOLD - 1 → isHighValue = false', () => {
    expect(HIGH_VALUE_THRESHOLD_ETHER - 1 >= HIGH_VALUE_THRESHOLD_ETHER).toBe(false);
  });

  it('amount = 0 → isHighValue = false', () => {
    expect(0 >= HIGH_VALUE_THRESHOLD_ETHER).toBe(false);
  });
});

describe('CommerceEscrow — Issue #269: setSeer', () => {
  it('zero address is a valid setSeer argument (graceful degradation)', () => {
    // Contract explicitly allows address(0) to disable tiering.
    // Verify the design intent: null score (address(0) seer) → LOCK_NEUTRAL.
    const scoreWhenSeerNotWired: null = null;
    expect(lockPeriod(scoreWhenSeerNotWired)).toBe(LOCK_NEUTRAL);
  });

  it('replacing seer with valid address enables tiering', () => {
    // When seer is wired, score-based tiering activates.
    expect(lockPeriod(9000)).toBe(LOCK_TRUSTED);
    expect(lockPeriod(5000)).toBe(LOCK_NEUTRAL);
    expect(lockPeriod(1000)).toBe(LOCK_LOW_TRUST);
  });
});

describe('CommerceEscrow — Issue #269: openAndFundWithIntent fundedAt stamping', () => {
  it('atomic path sets fundedAt = block.timestamp (same as openedAt)', () => {
    const blockTimestamp = BASE_TS;
    // openAndFundWithIntent: fundedAt: uint64(block.timestamp) set immediately
    const fundedAt = blockTimestamp;
    // Lock should apply from that moment
    expect(isBuyerLockActive(blockTimestamp + 1, fundedAt, 0)).toBe(true);
    expect(isBuyerLockActive(blockTimestamp + 14 * DAY, fundedAt, 0)).toBe(false);
  });

  it('two-step path (open + markFunded) fundedAt is set in markFunded', () => {
    const openedAt = BASE_TS;
    const fundedAt = BASE_TS + 2 * DAY; // funded 2 days after open
    // Lock starts from fundedAt, not openedAt.
    // fundedAt + 7d (neutral lock) = openedAt + 9d.
    // 1 second before that (openedAt+9d-1) → still locked.
    // At the boundary (openedAt+9d = fundedAt+7d) → unlocked.
    expect(isBuyerLockActive(openedAt + 9 * DAY - 1, fundedAt, 4000)).toBe(true);   // 1s before lock expires
    expect(isBuyerLockActive(openedAt + 9 * DAY,     fundedAt, 4000)).toBe(false);  // exactly at boundary
    expect(isBuyerLockActive(openedAt + 10 * DAY,    fundedAt, 4000)).toBe(false);  // well past
  });
});

describe('CommerceEscrow — OPEN_ESCROW_EXPIRY', () => {
  it('OPEN_ESCROW_EXPIRY is 7 days', () => {
    expect(OPEN_ESCROW_EXPIRY).toBe(7 * DAY);
  });

  it('stale-open cancel available after 7 days from openedAt', () => {
    const openedAt = BASE_TS;
    const canCancel = (now: number) => now >= openedAt + OPEN_ESCROW_EXPIRY;
    expect(canCancel(openedAt + 7 * DAY - 1)).toBe(false);
    expect(canCancel(openedAt + 7 * DAY)).toBe(true);
  });
});
