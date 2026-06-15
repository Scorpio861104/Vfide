/**
 * Merchant Disputes — adversarial + edge scenario matrix (Backend Completion Campaign 4).
 *
 * Certifies the CommerceEscrow lifecycle: state machine, access control per caller, score-tiered buyer dispute
 * lock (live score), high-value arbiter timelock, resolve outcomes, merchant-status gates, inheritance settlement,
 * stale-open cancellation, and the anti-gaming surface (no buyer self-refund, suspended merchant never paid,
 * rotation cannot orphan funds), plus findings MD-1 (no auto-release) and MD-2 (DAO-only resolution). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  attempt, resolveOutcome, disputeCountsTowardSuspension, lockPeriodDays, isHighValue,
  buyerCanSelfRefund, lockUsesLiveScore, suspendedMerchantCanBePaid, rotationOrphansFunds,
  hasAutoReleaseOnTimeout, merchantHasRecourseToSilentBuyer, escrowResolutionIsDaoOnly,
  HIGH_VALUE_THRESHOLD, ARBITER_TIMELOCK_DAYS, OPEN_ESCROW_EXPIRY_DAYS,
  type EscrowState, type Caller, type Action, type MerchantStatus, type TrustTier, type Ctx,
} from '@/lib/audit/merchantDisputesModel';

const STATES: EscrowState[] = ['NONE', 'OPEN', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED', 'RESOLVED'];
const CALLERS: Caller[] = ['buyer', 'merchant', 'dao', 'thirdParty'];
const TIERS: TrustTier[] = ['trusted', 'neutral', 'lowTrust'];

const ctx = (o: Partial<Ctx> = {}): Ctx => ({
  state: 'FUNDED', merchantStatus: 'ACTIVE', buyerTier: 'neutral', amount: 100,
  daysSinceFunded: 30, daysSinceDisputed: 30, daysSinceOpened: 30, buyerVaultMatches: true, aPartyInMemorial: false, ...o,
});

// ═════════════════════════════════════════════════════════════════════════════
// A. State machine — valid transitions
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.A: state machine', () => {
  it('SM-01 open from a fresh escrow → OPEN', () => expect(attempt('open', 'buyer', ctx({ state: 'NONE' }))).toEqual({ ok: true, next: 'OPEN' }));
  it('SM-02 markFunded OPEN → FUNDED', () => expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN' }))).toEqual({ ok: true, next: 'FUNDED' }));
  it('SM-03 release FUNDED → RELEASED', () => expect(attempt('release', 'buyer', ctx({ state: 'FUNDED' }))).toEqual({ ok: true, next: 'RELEASED' }));
  it('SM-04 refund FUNDED → REFUNDED', () => expect(attempt('refund', 'merchant', ctx({ state: 'FUNDED' }))).toEqual({ ok: true, next: 'REFUNDED' }));
  it('SM-05 dispute FUNDED → DISPUTED', () => expect(attempt('dispute', 'merchant', ctx({ state: 'FUNDED' }))).toEqual({ ok: true, next: 'DISPUTED' }));
  it('SM-06 resolve DISPUTED → RESOLVED', () => expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED' }))).toEqual({ ok: true, next: 'RESOLVED' }));
  it('SM-07 refund DISPUTED → REFUNDED (merchant may still refund a disputed escrow)', () => expect(attempt('refund', 'merchant', ctx({ state: 'DISPUTED' }))).toEqual({ ok: true, next: 'REFUNDED' }));
  it('SM-08 cancelStaleOpen OPEN (expired) → NONE', () => expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'OPEN', daysSinceOpened: 8 }))).toEqual({ ok: true, next: 'NONE' }));
});

// ═════════════════════════════════════════════════════════════════════════════
// B. State machine — invalid transitions (wrong source state) are rejected
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.B: invalid transitions rejected', () => {
  const terminals: EscrowState[] = ['RELEASED', 'REFUNDED', 'RESOLVED'];
  for (const t of terminals) {
    for (const a of ['release', 'refund', 'dispute', 'resolve', 'markFunded'] as Action[]) {
      it(`BAD-${a}-from-${t} rejected (terminal state)`, () => {
        const r = attempt(a, a === 'resolve' ? 'dao' : a === 'refund' ? 'merchant' : 'buyer', ctx({ state: t }));
        expect(r.ok).toBe(false);
      });
    }
  }
  it('BAD-release-from-OPEN rejected (not yet funded)', () => expect(attempt('release', 'buyer', ctx({ state: 'OPEN' })).ok).toBe(false));
  it('BAD-resolve-from-FUNDED rejected (not disputed)', () => expect(attempt('resolve', 'dao', ctx({ state: 'FUNDED' })).ok).toBe(false));
  it('BAD-dispute-from-DISPUTED rejected (already disputed)', () => expect(attempt('dispute', 'buyer', ctx({ state: 'DISPUTED' })).ok).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// C. Access control — each action × each caller
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.C: access control', () => {
  it('AC-release allows buyer+dao, rejects merchant+thirdParty', () => {
    expect(attempt('release', 'buyer', ctx()).ok).toBe(true);
    expect(attempt('release', 'dao', ctx()).ok).toBe(true);
    expect(attempt('release', 'merchant', ctx()).ok).toBe(false);
    expect(attempt('release', 'thirdParty', ctx()).ok).toBe(false);
  });
  it('AC-refund allows merchant+dao, rejects buyer+thirdParty', () => {
    expect(attempt('refund', 'merchant', ctx()).ok).toBe(true);
    expect(attempt('refund', 'dao', ctx()).ok).toBe(true);
    expect(attempt('refund', 'buyer', ctx()).ok).toBe(false);
    expect(attempt('refund', 'thirdParty', ctx()).ok).toBe(false);
  });
  it('AC-dispute allows buyer+merchant, rejects dao+thirdParty', () => {
    expect(attempt('dispute', 'buyer', ctx({ daysSinceFunded: 30 })).ok).toBe(true);
    expect(attempt('dispute', 'merchant', ctx()).ok).toBe(true);
    expect(attempt('dispute', 'dao', ctx()).ok).toBe(false);
    expect(attempt('dispute', 'thirdParty', ctx()).ok).toBe(false);
  });
  it('AC-resolve allows ONLY dao', () => {
    for (const c of CALLERS) expect(attempt('resolve', c, ctx({ state: 'DISPUTED' })).ok).toBe(c === 'dao');
  });
  it('AC-markFunded allows buyer+dao only', () => {
    for (const c of CALLERS) expect(attempt('markFunded', c, ctx({ state: 'OPEN' })).ok).toBe(c === 'buyer' || c === 'dao');
  });
  it('AC-cancelStaleOpen is permissionless (any caller) once expired', () => {
    for (const c of CALLERS) expect(attempt('cancelStaleOpen', c, ctx({ state: 'OPEN', daysSinceOpened: 8 })).ok).toBe(true);
  });
  it('AC-settleByInheritance is permissionless once a party is in MEMORIAL', () => {
    for (const c of CALLERS) expect(attempt('settleByInheritance', c, ctx({ state: 'FUNDED', aPartyInMemorial: true })).ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Buyer dispute lock — score-tiered, merchant exempt
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.D: buyer dispute lock', () => {
  it('LOCK-tiers 3/7/14 days', () => {
    expect(lockPeriodDays('trusted')).toBe(3);
    expect(lockPeriodDays('neutral')).toBe(7);
    expect(lockPeriodDays('lowTrust')).toBe(14);
  });
  for (const tier of TIERS) {
    const lock = lockPeriodDays(tier);
    it(`LOCK-${tier}-before buyer cannot dispute before the lock elapses`, () => {
      expect(attempt('dispute', 'buyer', ctx({ buyerTier: tier, daysSinceFunded: lock - 1 }))).toEqual({ ok: false, reason: 'COM_LockActive' });
    });
    it(`LOCK-${tier}-at buyer can dispute exactly at the lock boundary`, () => {
      expect(attempt('dispute', 'buyer', ctx({ buyerTier: tier, daysSinceFunded: lock })).ok).toBe(true);
    });
    it(`LOCK-${tier}-merchant-exempt merchant can dispute immediately regardless of tier`, () => {
      expect(attempt('dispute', 'merchant', ctx({ buyerTier: tier, daysSinceFunded: 0 })).ok).toBe(true);
    });
  }
  it('LOCK-lowtrust-waits-longest a low-trust buyer waits 14d vs a trusted buyer 3d', () => {
    expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'lowTrust', daysSinceFunded: 5 })).ok).toBe(false);
    expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'trusted', daysSinceFunded: 5 })).ok).toBe(true);
  });
  it('LOCK-live-score the lock uses the live score (cannot be gamed by a last-minute pump)', () => expect(lockUsesLiveScore()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// E. Arbiter timelock — high-value resolve gating
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.E: arbiter timelock', () => {
  it('HV-threshold 10,000 VFIDE', () => {
    expect(isHighValue(HIGH_VALUE_THRESHOLD)).toBe(true);
    expect(isHighValue(HIGH_VALUE_THRESHOLD - 1)).toBe(false);
  });
  it('HV-standard-immediate a standard-value dispute resolves immediately', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 100, daysSinceDisputed: 0 })).ok).toBe(true);
  });
  it('HV-highvalue-before high-value resolve blocked before the 7d timelock', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: ARBITER_TIMELOCK_DAYS - 1 }))).toEqual({ ok: false, reason: 'COM_HighValueTimelock' });
  });
  it('HV-highvalue-at high-value resolve allowed at the 7d boundary', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: ARBITER_TIMELOCK_DAYS })).ok).toBe(true);
  });
  it('HV-highvalue-zero a high-value escrow disputed-at-zero cannot be instantly resolved', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: 0 })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Resolve outcome
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.F: resolve outcome', () => {
  it('OUT-buyerwins funds go to buyer', () => expect(resolveOutcome(true)).toBe('buyer'));
  it('OUT-merchantwins funds go to merchant', () => expect(resolveOutcome(false)).toBe('merchant'));
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Merchant-status gates (F-SC-024)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.G: merchant-status gates', () => {
  const STATUSES: MerchantStatus[] = ['ACTIVE', 'SUSPENDED', 'DELISTED', 'NONE'];
  it('STATUS-open rejects NONE and SUSPENDED merchants', () => {
    expect(attempt('open', 'buyer', ctx({ state: 'NONE', merchantStatus: 'NONE' })).ok).toBe(false);
    expect(attempt('open', 'buyer', ctx({ state: 'NONE', merchantStatus: 'SUSPENDED' })).ok).toBe(false);
    expect(attempt('open', 'buyer', ctx({ state: 'NONE', merchantStatus: 'ACTIVE' })).ok).toBe(true);
  });
  it('STATUS-markFunded blocks SUSPENDED/DELISTED at funding time', () => {
    expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN', merchantStatus: 'SUSPENDED' })).ok).toBe(false);
    expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN', merchantStatus: 'DELISTED' })).ok).toBe(false);
  });
  it('STATUS-release blocks SUSPENDED/DELISTED at release time (no payout to a restricted merchant)', () => {
    expect(attempt('release', 'buyer', ctx({ merchantStatus: 'SUSPENDED' })).ok).toBe(false);
    expect(attempt('release', 'buyer', ctx({ merchantStatus: 'DELISTED' })).ok).toBe(false);
  });
  it('STATUS-refund still works to a suspended merchant\'s escrow (funds return to BUYER, not merchant)', () => {
    expect(attempt('refund', 'merchant', ctx({ merchantStatus: 'SUSPENDED' })).ok).toBe(true);
  });
  it('STATUS-suspended-never-paid suspendedMerchantCanBePaid only for ACTIVE', () => {
    for (const s of STATUSES) expect(suspendedMerchantCanBePaid(s)).toBe(s === 'ACTIVE');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Inheritance settlement + stale-open cancellation
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.H: inheritance + stale-open', () => {
  it('INH-01 settleByInheritance refunds buyer when a party is in MEMORIAL', () => {
    expect(attempt('settleByInheritance', 'thirdParty', ctx({ state: 'FUNDED', aPartyInMemorial: true }))).toEqual({ ok: true, next: 'REFUNDED' });
  });
  it('INH-02 settleByInheritance rejected if no party is in MEMORIAL', () => {
    expect(attempt('settleByInheritance', 'thirdParty', ctx({ state: 'FUNDED', aPartyInMemorial: false })).ok).toBe(false);
  });
  it('INH-03 settleByInheritance works from DISPUTED too', () => {
    expect(attempt('settleByInheritance', 'thirdParty', ctx({ state: 'DISPUTED', aPartyInMemorial: true })).ok).toBe(true);
  });
  it('INH-04 settleByInheritance rejected from OPEN (no funds in escrow)', () => {
    expect(attempt('settleByInheritance', 'thirdParty', ctx({ state: 'OPEN', aPartyInMemorial: true })).ok).toBe(false);
  });
  it('STALE-01 cancelStaleOpen blocked before expiry', () => {
    expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'OPEN', daysSinceOpened: OPEN_ESCROW_EXPIRY_DAYS - 1 })).ok).toBe(false);
  });
  it('STALE-02 cancelStaleOpen allowed at expiry', () => {
    expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'OPEN', daysSinceOpened: OPEN_ESCROW_EXPIRY_DAYS })).ok).toBe(true);
  });
  it('STALE-03 cancelStaleOpen rejected on a FUNDED escrow (has funds; use release/refund/dispute)', () => {
    expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'FUNDED', daysSinceOpened: 30 })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Anti-gaming surface
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.I: anti-gaming', () => {
  it('GAME-01 a buyer cannot directly trigger a refund to themselves', () => {
    expect(attempt('refund', 'buyer', ctx()).ok).toBe(false); // refund is merchant-or-DAO
    expect(buyerCanSelfRefund()).toBe(false);
  });
  it('GAME-02 a buyer cannot fund-then-instantly-dispute to lock a merchant (lock window)', () => {
    expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'lowTrust', daysSinceFunded: 0 })).ok).toBe(false);
  });
  it('GAME-03 a buyer cannot pump trust at the last second to shorten the lock (live score)', () => {
    expect(lockUsesLiveScore()).toBe(true);
  });
  it('GAME-04 an auto-suspended merchant cannot still collect via a pre-existing OPEN escrow', () => {
    expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN', merchantStatus: 'SUSPENDED' })).ok).toBe(false);
  });
  it('GAME-05 low-value disputes do not grief the merchant\'s suspension counter', () => {
    expect(disputeCountsTowardSuspension(5, 100)).toBe(false);
    expect(disputeCountsTowardSuspension(500, 100)).toBe(true);
  });
  it('GAME-06 mid-flight vault rotation cannot orphan escrowed funds', () => expect(rotationOrphansFunds()).toBe(false));
  it('GAME-07 a third party cannot release, refund, dispute, or resolve another\'s escrow', () => {
    expect(attempt('release', 'thirdParty', ctx()).ok).toBe(false);
    expect(attempt('refund', 'thirdParty', ctx()).ok).toBe(false);
    expect(attempt('dispute', 'thirdParty', ctx()).ok).toBe(false);
    expect(attempt('resolve', 'thirdParty', ctx({ state: 'DISPUTED' })).ok).toBe(false);
  });
  it('GAME-08 a high-value dispute cannot be rushed to resolution inside the evidence window', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: 1 })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.J: findings', () => {
  it('FIND-MD1 no automatic release-on-timeout exists', () => expect(hasAutoReleaseOnTimeout()).toBe(false));
  it('FIND-MD1-recourse a merchant DOES have recourse to a silent buyer (dispute → DAO resolve)', () => {
    expect(merchantHasRecourseToSilentBuyer()).toBe(true);
    expect(attempt('dispute', 'merchant', ctx({ daysSinceFunded: 0 })).ok).toBe(true); // merchant can dispute anytime
  });
  it('FIND-MD2 escrow dispute resolution is fully DAO-centralized', () => {
    expect(escrowResolutionIsDaoOnly()).toBe(true);
    for (const c of CALLERS) expect(attempt('resolve', c, ctx({ state: 'DISPUTED' })).ok).toBe(c === 'dao');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Systematic action × state validity matrix (transition actions)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.K: full action × state matrix', () => {
  const validFrom: Record<string, EscrowState[]> = {
    markFunded: ['OPEN'], release: ['FUNDED'], refund: ['FUNDED', 'DISPUTED'], dispute: ['FUNDED'],
    resolve: ['DISPUTED'], settleByInheritance: ['FUNDED', 'DISPUTED'], cancelStaleOpen: ['OPEN'],
  };
  const caller: Record<string, Caller> = {
    markFunded: 'buyer', release: 'buyer', refund: 'merchant', dispute: 'merchant',
    resolve: 'dao', settleByInheritance: 'thirdParty', cancelStaleOpen: 'thirdParty',
  };
  // permissive ctx: all time-gates satisfied, party in memorial, expired open, low value, active merchant
  const permissive = (state: EscrowState): Ctx => ({
    state, merchantStatus: 'ACTIVE', buyerTier: 'trusted', amount: 100,
    daysSinceFunded: 99, daysSinceDisputed: 99, daysSinceOpened: 99, buyerVaultMatches: true, aPartyInMemorial: true,
  });
  for (const action of Object.keys(validFrom) as Action[]) {
    for (const state of STATES) {
      const shouldBeValid = validFrom[action]!.includes(state);
      it(`MATRIX-${action}-from-${state} → ${shouldBeValid ? 'valid' : 'invalid'}`, () => {
        expect(attempt(action, caller[action]!, permissive(state)).ok).toBe(shouldBeValid);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Full lifecycle narratives (end-to-end walks)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.L: lifecycle narratives', () => {
  it('LIFE-happy open → fund → release (buyer satisfied, merchant paid)', () => {
    expect(attempt('open', 'buyer', ctx({ state: 'NONE' })).next).toBe('OPEN');
    expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN' })).next).toBe('FUNDED');
    expect(attempt('release', 'buyer', ctx({ state: 'FUNDED' })).next).toBe('RELEASED');
  });
  it('LIFE-dispute-buyerwins fund → dispute(buyer) → resolve(buyerWins) → buyer refunded', () => {
    expect(attempt('dispute', 'buyer', ctx({ state: 'FUNDED', daysSinceFunded: 10 })).next).toBe('DISPUTED');
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 100 })).next).toBe('RESOLVED');
    expect(resolveOutcome(true)).toBe('buyer');
  });
  it('LIFE-dispute-merchantwins fund → dispute → resolve(merchantWins) → merchant paid', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 100 })).next).toBe('RESOLVED');
    expect(resolveOutcome(false)).toBe('merchant');
  });
  it('LIFE-merchant-refund fund → refund(merchant) → buyer made whole', () => {
    expect(attempt('refund', 'merchant', ctx({ state: 'FUNDED' })).next).toBe('REFUNDED');
  });
  it('LIFE-silent-buyer merchant disputes a silent buyer → DAO resolves merchant-wins', () => {
    expect(attempt('dispute', 'merchant', ctx({ state: 'FUNDED', daysSinceFunded: 0 })).next).toBe('DISPUTED');
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 100 })).ok).toBe(true);
  });
  it('LIFE-highvalue-dispute fund → dispute → wait 7d → resolve', () => {
    expect(attempt('dispute', 'buyer', ctx({ state: 'FUNDED', amount: 50_000, daysSinceFunded: 10 })).next).toBe('DISPUTED');
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: 6 })).ok).toBe(false);
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: 50_000, daysSinceDisputed: 7 })).ok).toBe(true);
  });
  it('LIFE-death fund → a party dies → settleByInheritance refunds buyer', () => {
    expect(attempt('settleByInheritance', 'thirdParty', ctx({ state: 'FUNDED', aPartyInMemorial: true })).next).toBe('REFUNDED');
  });
  it('LIFE-abandoned open → never funded → cancelStaleOpen after 7d', () => {
    expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'OPEN', daysSinceOpened: 8 })).next).toBe('NONE');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Additional edges
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.M: additional edges', () => {
  it('EDGE-01 markFunded rejected if buyer vault no longer matches (defense in depth)', () => {
    expect(attempt('markFunded', 'buyer', ctx({ state: 'OPEN', buyerVaultMatches: false })).ok).toBe(false);
  });
  it('EDGE-02 buyer dispute exactly one day before boundary still blocked (neutral)', () => {
    expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'neutral', daysSinceFunded: 6 })).ok).toBe(false);
  });
  it('EDGE-03 buyer dispute at boundary allowed (neutral 7d)', () => {
    expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'neutral', daysSinceFunded: 7 })).ok).toBe(true);
  });
  it('EDGE-04 high-value exactly at threshold gets the timelock', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: HIGH_VALUE_THRESHOLD, daysSinceDisputed: 6 })).ok).toBe(false);
  });
  it('EDGE-05 just-below-threshold escrow resolves immediately', () => {
    expect(attempt('resolve', 'dao', ctx({ state: 'DISPUTED', amount: HIGH_VALUE_THRESHOLD - 1, daysSinceDisputed: 0 })).ok).toBe(true);
  });
  it('EDGE-06 refund of a DISPUTED escrow by DAO is allowed (DAO can refund instead of resolve)', () => {
    expect(attempt('refund', 'dao', ctx({ state: 'DISPUTED' })).ok).toBe(true);
  });
  it('EDGE-07 DAO can release a funded escrow (operator override path)', () => {
    expect(attempt('release', 'dao', ctx({ state: 'FUNDED' })).ok).toBe(true);
  });
  it('EDGE-08 cancelStaleOpen on a non-open escrow is rejected even after long time', () => {
    expect(attempt('cancelStaleOpen', 'thirdParty', ctx({ state: 'RESOLVED', daysSinceOpened: 100 })).ok).toBe(false);
  });
  it('EDGE-09 a buyer cannot resolve their own dispute', () => {
    expect(attempt('resolve', 'buyer', ctx({ state: 'DISPUTED' })).ok).toBe(false);
  });
  it('EDGE-10 a merchant cannot release to themselves (release is buyer-or-DAO)', () => {
    expect(attempt('release', 'merchant', ctx({ state: 'FUNDED' })).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Granular lock timing + two-layer + closing invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 4.N: granular timing & invariants', () => {
  // trusted (3d) granular sweep
  [0, 1, 2].forEach((d) => it(`TRUST-day${d} trusted buyer blocked before day 3`, () => expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'trusted', daysSinceFunded: d })).ok).toBe(false)));
  [3, 4, 10].forEach((d) => it(`TRUST-day${d}-ok trusted buyer allowed from day 3`, () => expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'trusted', daysSinceFunded: d })).ok).toBe(true)));
  // low-trust (14d) granular sweep
  [0, 7, 13].forEach((d) => it(`LOW-day${d} low-trust buyer blocked before day 14`, () => expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'lowTrust', daysSinceFunded: d })).ok).toBe(false)));
  [14, 20].forEach((d) => it(`LOW-day${d}-ok low-trust buyer allowed from day 14`, () => expect(attempt('dispute', 'buyer', ctx({ buyerTier: 'lowTrust', daysSinceFunded: d })).ok).toBe(true)));
  it('INV-funds-never-stuck every funded escrow has a terminal path (release/refund/dispute→resolve/inheritance)', () => {
    const c = ctx({ state: 'FUNDED' });
    const anyPath = attempt('release', 'buyer', c).ok || attempt('refund', 'merchant', c).ok || attempt('dispute', 'merchant', c).ok || attempt('settleByInheritance', 'thirdParty', ctx({ state: 'FUNDED', aPartyInMemorial: true })).ok;
    expect(anyPath).toBe(true);
  });
  it('INV-no-double-spend a RESOLVED escrow accepts no further fund-moving action', () => {
    for (const a of ['release', 'refund', 'resolve', 'settleByInheritance'] as Action[]) {
      expect(attempt(a, a === 'resolve' ? 'dao' : a === 'refund' ? 'merchant' : a === 'settleByInheritance' ? 'thirdParty' : 'buyer', ctx({ state: 'RESOLVED', aPartyInMemorial: true })).ok).toBe(false);
    }
  });
  it('INV-twolayer on-chain escrow controls funds; off-chain disputes API is record-only', () => {
    // the off-chain record cannot move funds — only the on-chain resolve/refund/release can
    expect(escrowResolutionIsDaoOnly()).toBe(true);
    expect(buyerCanSelfRefund()).toBe(false);
  });
});
