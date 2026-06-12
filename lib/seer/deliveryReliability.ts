/**
 * Delivery reliability scoring (Phase 3 — feeds Marketplace Trust + Fraud).
 *
 * Pure/deterministic. Turns a merchant's shipment history into a delivery-reliability signal the Seer
 * can use: confirmed deliveries are positive, not-received reports are negative, and unconfirmed
 * deliveries are neutral-ish (the merchant says delivered but the buyer hasn't confirmed). Honest about
 * thin data — a merchant with few shipments gets a provisional score, not a confident one.
 */

export interface DeliveryStats {
  shipped: number;
  deliveredConfirmed: number;
  deliveredUnconfirmed: number;
  notReceived: number;
  returned: number;
}

export type DeliveryReliability = 'unproven' | 'developing' | 'reliable' | 'concerning';

export interface DeliveryReliabilityResult {
  /** 0..100, or null when there's too little history. */
  score: number | null;
  reliability: DeliveryReliability;
  /** Fraction of fulfilled shipments the buyer reported as not received. */
  notReceivedRate: number;
  note: string;
}

export function computeDeliveryReliability(s: DeliveryStats): DeliveryReliabilityResult {
  const total = s.shipped + s.deliveredConfirmed + s.deliveredUnconfirmed + s.notReceived + s.returned;
  const fulfilled = s.deliveredConfirmed + s.deliveredUnconfirmed + s.notReceived;

  if (total < 3) {
    return { score: null, reliability: 'unproven', notReceivedRate: 0, note: 'Not enough delivery history yet to judge reliability.' };
  }

  const notReceivedRate = fulfilled > 0 ? s.notReceived / fulfilled : 0;

  // Confirmed deliveries are the strong positive; not-received is the strong negative.
  let score = 60;
  if (fulfilled > 0) {
    score += (s.deliveredConfirmed / fulfilled) * 40; // up to +40 for confirmed
    score -= notReceivedRate * 80; // up to -80 for non-delivery reports
    score -= (s.deliveredUnconfirmed / fulfilled) * 5; // mild: merchant-asserted, unconfirmed
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  let reliability: DeliveryReliability;
  if (notReceivedRate >= 0.15) reliability = 'concerning';
  else if (score >= 80) reliability = 'reliable';
  else reliability = 'developing';

  const note =
    reliability === 'concerning' ? `${Math.round(notReceivedRate * 100)}% of deliveries were reported not received — a real concern.`
    : reliability === 'reliable' ? 'Strong delivery record with confirmed receipts.'
    : 'Building a delivery record.';

  return { score, reliability, notReceivedRate: Math.round(notReceivedRate * 100) / 100, note };
}
