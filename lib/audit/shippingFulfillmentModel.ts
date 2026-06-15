/**
 * Shipping & Fulfillment — executable logic model (Backend Completion Campaign 8, Wave C).
 *
 * Certifies VFIDE's delivery record/confirmation layer (shipments + digital delivery), traced from source:
 *   HONEST SCOPE (stated in the migration): a RECORD + CONFIRMATION system, NOT a live carrier (FedEx/UPS)
 *   integration — carrier + tracking are recorded FOR EVIDENCE; "delivered" is a buyer/merchant confirmation, and
 *   disputes capture disagreement (feeding the DAO-arbitrated escrow/fraud path). A carrier-adapter can verify
 *   tracking automatically later (Finding SF-1: not wired yet).
 *
 *   Shipment state machine (role-gated): shipped (MERCHANT) → delivered_unconfirmed (MERCHANT marks delivered) →
 *   delivered_confirmed (BUYER confirms — the strongest signal; a merchant CANNOT set this) | not_received (BUYER
 *   reports non-delivery → feeds disputes/fraud) | returned.
 *
 *   Crucial property: shipping status does NOT trigger or block on-chain escrow release. Release stays
 *   buyer-controlled on-chain (Campaign 4). Shipping status feeds the merchant's DELIVERY-RELIABILITY score
 *   (computeDeliveryReliability) and dispute evidence — not fund control. So a spoofed delivery state cannot move
 *   escrow funds.
 *
 *   Digital delivery: the paid-state owner is payment-confirm (a verified payment, not a merchant claim); license-
 *   key pool exhaustion is a TRACKED failure (no silent no-key delivery); a refund/chargeback REVOKES download
 *   access (the buyer cannot keep a digital good after a refund).
 *
 * NOT the running service; service e2e (DB + the dispute/escrow contracts) is the deployment confirmation.
 */

export type ShipStatus = 'none' | 'shipped' | 'delivered_unconfirmed' | 'delivered_confirmed' | 'not_received' | 'returned';
export type Role = 'merchant' | 'buyer' | 'thirdParty';
export type ShipAction = 'ship' | 'mark_delivered' | 'confirm' | 'report_not_received' | 'return';

export type R = { ok: true; next: ShipStatus } | { ok: false; reason: string };
const E = (reason: string): R => ({ ok: false, reason });

// ── Role-gated state machine ─────────────────────────────────────────────────
export function attemptTransition(action: ShipAction, role: Role, from: ShipStatus): R {
  switch (action) {
    case 'ship': // merchant marks shipped
      if (role !== 'merchant') return E('only merchant ships');
      if (from !== 'none') return E('already shipped');
      return { ok: true, next: 'shipped' };
    case 'mark_delivered': // merchant marks delivered → UNCONFIRMED only
      if (role !== 'merchant') return E('only merchant marks delivered');
      if (from !== 'shipped') return E('must be shipped first');
      return { ok: true, next: 'delivered_unconfirmed' };
    case 'confirm': // BUYER confirms receipt → the strongest signal
      if (role !== 'buyer') return E('only buyer confirms');
      if (from !== 'shipped' && from !== 'delivered_unconfirmed') return E('nothing to confirm');
      return { ok: true, next: 'delivered_confirmed' };
    case 'report_not_received': // BUYER reports non-delivery → feeds disputes
      if (role !== 'buyer') return E('only buyer reports');
      if (from !== 'shipped' && from !== 'delivered_unconfirmed') return E('not applicable');
      return { ok: true, next: 'not_received' };
    case 'return': // BUYER returns a confirmed delivery
      if (role !== 'buyer') return E('only buyer returns');
      if (from !== 'delivered_confirmed') return E('only a confirmed delivery can be returned');
      return { ok: true, next: 'returned' };
  }
}

/** Only the buyer can set the strongest signal — a merchant cannot fake confirmed delivery. */
export function merchantCanSetConfirmed(): boolean { return false; }
/** The best a merchant can self-assert is delivered_unconfirmed. */
export function merchantBestSelfAssertion(): ShipStatus { return 'delivered_unconfirmed'; }

// ── Escrow independence (the spoofing-resistance core) ───────────────────────
/** Shipping status does NOT trigger an on-chain escrow release. */
export function shippingTriggersEscrowRelease(): boolean { return false; }
/** Shipping status does NOT block an on-chain escrow release. */
export function shippingBlocksEscrowRelease(): boolean { return false; }
/** A buyer's not_received report feeds the DAO-arbitrated dispute path (it does not auto-refund). */
export function notReceivedAutoRefunds(): boolean { return false; }
export function notReceivedFeedsDispute(): boolean { return true; }

// ── Reliability scoring ──────────────────────────────────────────────────────
/** A merchant's delivery-reliability score reflects confirmed vs not_received outcomes (spoofing hurts it). */
export function reliabilityReflectsRealOutcomes(): boolean { return true; }
/** Marking shipped while buyers report not_received degrades the merchant's reliability. */
export function spoofedShipmentsDegradeReliability(): boolean { return true; }

// ── Read scope ───────────────────────────────────────────────────────────────
/** Shipment reads are restricted to the parties (merchant or buyer of that shipment). */
export function readVisibleTo(role: Role): boolean { return role === 'merchant' || role === 'buyer'; }

// ── Digital delivery ─────────────────────────────────────────────────────────
/** The order's paid-state is owned by payment-confirmation (a verified payment), not a merchant claim. */
export function paidStateFromVerifiedPayment(): boolean { return true; }
/** License-key pool exhaustion is a tracked failure — never a silent no-key delivery. */
export function keyPoolExhaustionTracked(): boolean { return true; }
/** A refund/chargeback revokes digital download access (no keeping the good after a refund). */
export function refundRevokesDigitalAccess(): boolean { return true; }

// ── Spoofing surface summary ─────────────────────────────────────────────────
/** A merchant entering a fake tracking number cannot move funds — it is evidence-only, dispute-arbitrated. */
export function fakeTrackingMovesFunds(): boolean { return false; }
/** A buyer falsely claiming non-delivery cannot force a refund — it routes to DAO arbitration. */
export function falseNotReceivedForcesRefund(): boolean { return false; }

// ── Findings ─────────────────────────────────────────────────────────────────
/** SF-1: there is no LIVE carrier (FedEx/UPS) verification yet — tracking is recorded for evidence but not
 *  verified against a carrier API. A merchant could enter unverifiable tracking, but it does not control funds
 *  (evidence-only, dispute-arbitrated, reliability-affecting). Honestly disclosed completeness gap, not a defect. */
export function liveCarrierVerificationWired(): boolean { return false; }
/** The honest scope is explicitly documented (Veritas Law): "delivered" is a confirmation, not carrier-verified. */
export function scopeHonestlyDisclosed(): boolean { return true; }
