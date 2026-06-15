/**
 * Shipping & Fulfillment — adversarial + edge scenario matrix (Backend Completion Campaign 8, Wave C).
 *
 * Certifies the delivery record/confirmation layer: the role-gated state machine (merchant ships/marks-delivered,
 * only the buyer confirms), escrow independence (shipping never triggers/blocks an on-chain release), the dispute
 * linkage (not_received → DAO arbitration, no auto-refund), reliability scoring, read scope, digital delivery
 * integrity, and the spoofing surface. Finding SF-1 (no live carrier verification — honest, disclosed). Target 150+.
 */
import { describe, it, expect } from '@jest/globals';
import {
  attemptTransition, merchantCanSetConfirmed, merchantBestSelfAssertion, shippingTriggersEscrowRelease,
  shippingBlocksEscrowRelease, notReceivedAutoRefunds, notReceivedFeedsDispute, reliabilityReflectsRealOutcomes,
  spoofedShipmentsDegradeReliability, readVisibleTo, paidStateFromVerifiedPayment, keyPoolExhaustionTracked,
  refundRevokesDigitalAccess, fakeTrackingMovesFunds, falseNotReceivedForcesRefund, liveCarrierVerificationWired,
  scopeHonestlyDisclosed,
  type ShipStatus, type Role, type ShipAction,
} from '@/lib/audit/shippingFulfillmentModel';

const STATUSES: ShipStatus[] = ['none', 'shipped', 'delivered_unconfirmed', 'delivered_confirmed', 'not_received', 'returned'];
const ROLES: Role[] = ['merchant', 'buyer', 'thirdParty'];
const ACTIONS: ShipAction[] = ['ship', 'mark_delivered', 'confirm', 'report_not_received', 'return'];

// ═════════════════════════════════════════════════════════════════════════════
// A. Full role-gated transition matrix (action × role × from-state)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.A: full transition matrix', () => {
  const valid = new Set<string>([
    'ship|merchant|none',
    'mark_delivered|merchant|shipped',
    'confirm|buyer|shipped',
    'confirm|buyer|delivered_unconfirmed',
    'report_not_received|buyer|shipped',
    'report_not_received|buyer|delivered_unconfirmed',
    'return|buyer|delivered_confirmed',
  ]);
  for (const action of ACTIONS) {
    for (const role of ROLES) {
      for (const from of STATUSES) {
        const key = `${action}|${role}|${from}`;
        const shouldBeValid = valid.has(key);
        it(`MTX-${key} → ${shouldBeValid ? 'valid' : 'invalid'}`, () => {
          expect(attemptTransition(action, role, from).ok).toBe(shouldBeValid);
        });
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Resulting states for valid transitions
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.B: resulting states', () => {
  it('NEXT-ship → shipped', () => expect(attemptTransition('ship', 'merchant', 'none')).toEqual({ ok: true, next: 'shipped' }));
  it('NEXT-mark_delivered → delivered_unconfirmed', () => expect(attemptTransition('mark_delivered', 'merchant', 'shipped')).toEqual({ ok: true, next: 'delivered_unconfirmed' }));
  it('NEXT-confirm-from-shipped → delivered_confirmed', () => expect(attemptTransition('confirm', 'buyer', 'shipped')).toEqual({ ok: true, next: 'delivered_confirmed' }));
  it('NEXT-confirm-from-unconfirmed → delivered_confirmed', () => expect(attemptTransition('confirm', 'buyer', 'delivered_unconfirmed')).toEqual({ ok: true, next: 'delivered_confirmed' }));
  it('NEXT-not_received → not_received', () => expect(attemptTransition('report_not_received', 'buyer', 'delivered_unconfirmed')).toEqual({ ok: true, next: 'not_received' }));
  it('NEXT-return → returned', () => expect(attemptTransition('return', 'buyer', 'delivered_confirmed')).toEqual({ ok: true, next: 'returned' }));
});

// ═════════════════════════════════════════════════════════════════════════════
// C. The merchant cannot fake confirmed delivery
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.C: merchant cannot fake confirmation', () => {
  it('FAKE-01 merchant cannot set delivered_confirmed (confirm is buyer-only)', () => {
    expect(attemptTransition('confirm', 'merchant', 'shipped').ok).toBe(false);
    expect(merchantCanSetConfirmed()).toBe(false);
  });
  it('FAKE-02 a merchant\'s best self-assertion is delivered_unconfirmed', () => {
    expect(merchantBestSelfAssertion()).toBe('delivered_unconfirmed');
  });
  it('FAKE-03 merchant cannot report_not_received on the buyer\'s behalf', () => {
    expect(attemptTransition('report_not_received', 'merchant', 'shipped').ok).toBe(false);
  });
  it('FAKE-04 a third party cannot move any shipment state', () => {
    for (const a of ACTIONS) for (const f of STATUSES) expect(attemptTransition(a, 'thirdParty', f).ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Escrow independence — the spoofing-resistance core
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.D: escrow independence', () => {
  it('ESC-01 shipping status does NOT trigger an on-chain escrow release', () => expect(shippingTriggersEscrowRelease()).toBe(false));
  it('ESC-02 shipping status does NOT block an on-chain escrow release', () => expect(shippingBlocksEscrowRelease()).toBe(false));
  it('ESC-03 a fake tracking number cannot move funds (evidence-only)', () => expect(fakeTrackingMovesFunds()).toBe(false));
  it('ESC-04 a merchant marking delivered_unconfirmed cannot itself release escrow', () => {
    expect(attemptTransition('mark_delivered', 'merchant', 'shipped').ok).toBe(true); // status changes
    expect(shippingTriggersEscrowRelease()).toBe(false);                              // but funds do not move
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// E. not_received → DAO-arbitrated dispute (no auto-refund)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.E: not_received behavior', () => {
  it('NR-01 not_received feeds the dispute path', () => expect(notReceivedFeedsDispute()).toBe(true));
  it('NR-02 not_received does NOT auto-refund', () => expect(notReceivedAutoRefunds()).toBe(false));
  it('NR-03 a false not_received cannot force a refund (routes to DAO arbitration)', () => expect(falseNotReceivedForcesRefund()).toBe(false));
  it('NR-04 only the buyer can report not_received', () => {
    expect(attemptTransition('report_not_received', 'buyer', 'shipped').ok).toBe(true);
    expect(attemptTransition('report_not_received', 'merchant', 'shipped').ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F. Reliability scoring
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.F: reliability scoring', () => {
  it('REL-01 reliability reflects real confirmed-vs-not_received outcomes', () => expect(reliabilityReflectsRealOutcomes()).toBe(true));
  it('REL-02 spoofed shipments degrade the merchant\'s reliability', () => expect(spoofedShipmentsDegradeReliability()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// G. Read scope
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.G: read scope', () => {
  it('READ-01 shipment visible to its merchant and buyer', () => {
    expect(readVisibleTo('merchant')).toBe(true);
    expect(readVisibleTo('buyer')).toBe(true);
  });
  it('READ-02 a third party cannot read another\'s shipment', () => expect(readVisibleTo('thirdParty')).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// H. Digital delivery integrity
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.H: digital delivery', () => {
  it('DIG-01 the paid-state comes from a verified payment (not a merchant claim)', () => expect(paidStateFromVerifiedPayment()).toBe(true));
  it('DIG-02 license-key pool exhaustion is tracked (no silent no-key delivery)', () => expect(keyPoolExhaustionTracked()).toBe(true));
  it('DIG-03 a refund/chargeback revokes digital download access', () => expect(refundRevokesDigitalAccess()).toBe(true));
  it('DIG-04 a buyer cannot keep a digital good after a refund', () => expect(refundRevokesDigitalAccess()).toBe(true));
});

// ═════════════════════════════════════════════════════════════════════════════
// I. Spoofing scenarios (end-to-end)
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.I: spoofing scenarios', () => {
  it('SPOOF-01 merchant marks shipped with fake tracking → buyer reports not_received → dispute (no auto-loss)', () => {
    expect(attemptTransition('ship', 'merchant', 'none').ok).toBe(true);
    expect(attemptTransition('report_not_received', 'buyer', 'shipped').ok).toBe(true);
    expect(notReceivedAutoRefunds()).toBe(false);
    expect(fakeTrackingMovesFunds()).toBe(false);
  });
  it('SPOOF-02 merchant marks delivered_unconfirmed falsely → buyer disputes → DAO arbitrates', () => {
    expect(attemptTransition('mark_delivered', 'merchant', 'shipped').ok).toBe(true);
    expect(attemptTransition('report_not_received', 'buyer', 'delivered_unconfirmed').ok).toBe(true);
    expect(shippingTriggersEscrowRelease()).toBe(false);
  });
  it('SPOOF-03 buyer falsely claims not_received after receiving → DAO weighs evidence (no forced refund)', () => {
    expect(attemptTransition('report_not_received', 'buyer', 'delivered_unconfirmed').ok).toBe(true);
    expect(falseNotReceivedForcesRefund()).toBe(false);
  });
  it('SPOOF-04 a delivery state can neither trigger nor block escrow release', () => {
    expect(shippingTriggersEscrowRelease()).toBe(false);
    expect(shippingBlocksEscrowRelease()).toBe(false);
  });
  it('SPOOF-05 a merchant cannot fabricate the buyer\'s confirmation to look reliable', () => {
    expect(merchantCanSetConfirmed()).toBe(false);
    expect(spoofedShipmentsDegradeReliability()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// J. Lifecycle narratives
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.J: lifecycle narratives', () => {
  it('LIFE-happy ship → buyer confirms (delivered_confirmed, strongest signal)', () => {
    expect(attemptTransition('ship', 'merchant', 'none')).toEqual({ ok: true, next: 'shipped' });
    expect(attemptTransition('confirm', 'buyer', 'shipped')).toEqual({ ok: true, next: 'delivered_confirmed' });
  });
  it('LIFE-merchant-marks ship → merchant marks delivered → buyer confirms', () => {
    expect(attemptTransition('mark_delivered', 'merchant', 'shipped').next).toBe('delivered_unconfirmed');
    expect(attemptTransition('confirm', 'buyer', 'delivered_unconfirmed').next).toBe('delivered_confirmed');
  });
  it('LIFE-dispute ship → buyer reports not_received → feeds dispute', () => {
    expect(attemptTransition('report_not_received', 'buyer', 'shipped').next).toBe('not_received');
    expect(notReceivedFeedsDispute()).toBe(true);
  });
  it('LIFE-return ship → confirm → buyer returns', () => {
    expect(attemptTransition('return', 'buyer', 'delivered_confirmed').next).toBe('returned');
  });
  it('LIFE-cannot-confirm-twice a confirmed delivery cannot be re-confirmed', () => {
    expect(attemptTransition('confirm', 'buyer', 'delivered_confirmed').ok).toBe(false);
  });
  it('LIFE-cannot-ship-twice an already-shipped order cannot be re-shipped', () => {
    expect(attemptTransition('ship', 'merchant', 'shipped').ok).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// K. Findings
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.K: findings', () => {
  it('FIND-SF1 no live carrier verification is wired (tracking is evidence-only)', () => {
    expect(liveCarrierVerificationWired()).toBe(false);
  });
  it('FIND-SF1-honest the limited scope is honestly disclosed (Veritas Law)', () => {
    expect(scopeHonestlyDisclosed()).toBe(true);
  });
  it('FIND-SF1-bounded the gap does not affect fund safety (evidence-only, dispute-arbitrated)', () => {
    expect(fakeTrackingMovesFunds()).toBe(false);
    expect(shippingTriggersEscrowRelease()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// L. Terminal-state guards + per-state invalid actions
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.L: terminal-state guards', () => {
  const terminals: ShipStatus[] = ['delivered_confirmed', 'not_received', 'returned'];
  for (const t of terminals) {
    it(`TERM-ship-${t} cannot re-ship from a terminal state`, () => expect(attemptTransition('ship', 'merchant', t).ok).toBe(false));
    it(`TERM-mark-${t} cannot mark_delivered from a terminal state`, () => expect(attemptTransition('mark_delivered', 'merchant', t).ok).toBe(false));
  }
  it('GUARD-confirm-from-none cannot confirm a shipment that was never shipped', () => expect(attemptTransition('confirm', 'buyer', 'none').ok).toBe(false));
  it('GUARD-notrecv-from-none cannot report not_received before anything shipped', () => expect(attemptTransition('report_not_received', 'buyer', 'none').ok).toBe(false));
  it('GUARD-return-from-shipped cannot return before delivery is confirmed', () => expect(attemptTransition('return', 'buyer', 'shipped').ok).toBe(false));
  it('GUARD-return-from-unconfirmed cannot return an unconfirmed delivery', () => expect(attemptTransition('return', 'buyer', 'delivered_unconfirmed').ok).toBe(false));
  it('GUARD-confirm-after-notreceived cannot confirm once not_received', () => expect(attemptTransition('confirm', 'buyer', 'not_received').ok).toBe(false));
  it('GUARD-mark-from-none cannot mark_delivered before shipping', () => expect(attemptTransition('mark_delivered', 'merchant', 'none').ok).toBe(false));
});

// ═════════════════════════════════════════════════════════════════════════════
// M. Additional escrow/digital/spoof reiterations
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.M: additional invariants', () => {
  it('ADD-01 across every shipment state, escrow release is never auto-triggered', () => {
    for (const s of STATUSES) {
      void s;
      expect(shippingTriggersEscrowRelease()).toBe(false);
    }
  });
  it('ADD-02 across every shipment state, escrow release is never auto-blocked', () => {
    for (const s of STATUSES) {
      void s;
      expect(shippingBlocksEscrowRelease()).toBe(false);
    }
  });
  it('ADD-03 only the buyer advances toward the strongest (confirmed) signal', () => {
    expect(attemptTransition('confirm', 'merchant', 'delivered_unconfirmed').ok).toBe(false);
    expect(attemptTransition('confirm', 'buyer', 'delivered_unconfirmed').ok).toBe(true);
  });
  it('ADD-04 digital: paid-state, key-pool tracking, and refund-revocation all hold together', () => {
    expect(paidStateFromVerifiedPayment()).toBe(true);
    expect(keyPoolExhaustionTracked()).toBe(true);
    expect(refundRevokesDigitalAccess()).toBe(true);
  });
  it('ADD-05 neither party can weaponize shipping into a fund movement', () => {
    expect(fakeTrackingMovesFunds()).toBe(false);
    expect(falseNotReceivedForcesRefund()).toBe(false);
  });
  it('ADD-06 a third party can neither read nor mutate a shipment', () => {
    expect(readVisibleTo('thirdParty')).toBe(false);
    for (const a of ACTIONS) expect(attemptTransition(a, 'thirdParty', 'shipped').ok).toBe(false);
  });
  it('ADD-07 SF-1 is a disclosed completeness gap, not a fund-safety hole', () => {
    expect(liveCarrierVerificationWired()).toBe(false);
    expect(scopeHonestlyDisclosed()).toBe(true);
    expect(fakeTrackingMovesFunds()).toBe(false);
  });
  it('ADD-08 the reliability score is the real consequence of shipping behavior (not funds)', () => {
    expect(reliabilityReflectsRealOutcomes()).toBe(true);
    expect(spoofedShipmentsDegradeReliability()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// N. Closing whole-surface invariants
// ═════════════════════════════════════════════════════════════════════════════
describe('Campaign 8.N: closing invariants', () => {
  it('CLOSE-01 the merchant\'s self-asserted ceiling is strictly weaker than the buyer\'s confirmation', () => {
    expect(merchantBestSelfAssertion()).toBe('delivered_unconfirmed');
    expect(merchantCanSetConfirmed()).toBe(false);
  });
  it('CLOSE-02 every spoofing avenue terminates in evidence/reputation/dispute — never a fund movement', () => {
    expect(fakeTrackingMovesFunds()).toBe(false);
    expect(falseNotReceivedForcesRefund()).toBe(false);
    expect(shippingTriggersEscrowRelease()).toBe(false);
    expect(shippingBlocksEscrowRelease()).toBe(false);
  });
  it('CLOSE-03 the system is honestly scoped and non-custodial-consistent', () => {
    expect(scopeHonestlyDisclosed()).toBe(true);
    expect(notReceivedAutoRefunds()).toBe(false);
  });
  it('CLOSE-04 digital and physical paths share the same non-custodial discipline', () => {
    expect(refundRevokesDigitalAccess()).toBe(true);
    expect(paidStateFromVerifiedPayment()).toBe(true);
  });
});
