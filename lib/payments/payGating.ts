/**
 * Payment gating helpers (pure, unit-tested in ./__tests__/payGating.test.ts).
 *
 * These encode the integrity rules that protect a payer on the /pay route, where the
 * merchant + amount arrive in the URL and are otherwise tamper-able:
 *
 *  - Instant settlement is irreversible, so it is only honored for a payment whose
 *    recipient+amount are verified — a valid merchant signature (source=qr/link) or a
 *    server-verified stored payment link (source=paylink). Every other payment is
 *    downgraded to escrow, which preserves the payer's dispute/refund recourse. This
 *    closes the bypass where `source=checkout&settlement=instant` on a crafted link
 *    would route unverified, irreversible funds to an attacker.
 *  - A stored payment link's URL recipient must match the canonical merchant on the
 *    server record, and the amount must satisfy the link's fixed/min/max constraints.
 */

export type Settlement = 'instant' | 'escrow';

export function computeEffectiveSettlement(
  requested: Settlement,
  canSettleInstantly: boolean,
): Settlement {
  if (requested === 'instant' && !canSettleInstantly) return 'escrow';
  return requested;
}

export interface PayLinkConstraints {
  amount?: string | number | null; // fixed amount, if the link sets one
  min_amount?: string | number | null;
  max_amount?: string | number | null;
}

const EPS = 1e-9;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Fixed-amount links: the requested amount must equal the fixed amount.
 * Open-amount links: the requested amount must be > 0 and within [min, max]
 * (each bound optional). Anything non-numeric or non-positive is rejected.
 */
export function validatePayLinkAmount(requestedAmount: string, link: PayLinkConstraints): boolean {
  const amt = toNumber(requestedAmount);
  if (amt === null || amt <= 0) return false;
  const fixed = toNumber(link.amount);
  if (fixed !== null) return Math.abs(amt - fixed) < EPS;
  const min = toNumber(link.min_amount);
  const max = toNumber(link.max_amount);
  if (min !== null && amt < min - EPS) return false;
  if (max !== null && amt > max + EPS) return false;
  return true;
}

/**
 * The /pay URL merchant must match the canonical merchant on the stored link, so a
 * tampered link (recipient swapped to an attacker) is rejected. Comparison is
 * case-insensitive and requires a non-empty address.
 */
export function verifyPayLinkRecipient(urlMerchant: string, serverMerchant: string): boolean {
  const a = (urlMerchant || '').trim().toLowerCase();
  const b = (serverMerchant || '').trim().toLowerCase();
  return a.length > 0 && a === b;
}
