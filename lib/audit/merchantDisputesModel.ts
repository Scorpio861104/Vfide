/**
 * Merchant Disputes — executable logic model (Backend Completion Campaign 4).
 *
 * Certifies VFIDE's commerce escrow + dispute/refund lifecycle (CommerceEscrow.sol), traced from source:
 *   State machine: NONE → OPEN → FUNDED → RELEASED / REFUNDED / DISPUTED → RESOLVED.
 *   • open / openAndFundWithIntent: buyer creates (and optionally funds) an escrow against a merchant.
 *   • markFunded: pulls buyer funds into escrow; re-checks merchant SUSPENDED/DELISTED (F-SC-024); verifies the
 *     buyer vault still belongs to the buyer (defense in depth); stamps fundedAt.
 *   • release: buyer-or-DAO; FUNDED → RELEASED; re-checks merchant SUSPENDED/DELISTED (release to a restricted
 *     merchant is blocked — buyer uses dispute/refund instead); resolves seller vault at release-time (N-H15).
 *   • refund: merchant-or-DAO; FUNDED/DISPUTED → REFUNDED; notes the refund toward merchant auto-suspension.
 *   • dispute: buyer-or-merchant; FUNDED → DISPUTED. Score-tiered BUYER lock (3d trusted / 7d neutral / 14d low,
 *     using LIVE score so it can't be gamed by a last-minute pump); merchant may dispute anytime. Low-value
 *     disputes (< minDisputeAmountForPenalty) are ignored for auto-suspension (N-H14).
 *   • resolve: onlyDAO; DISPUTED → RESOLVED; buyerWins → buyer paid, else merchant paid. High-value escrows
 *     (>= HIGH_VALUE_THRESHOLD) require ARBITER_TIMELOCK (7d from dispute) before the DAO may resolve (Issue #269).
 *   • settleByInheritance: permissionless; FUNDED/DISPUTED and a party's vault in MEMORIAL/CLOSED → refunds buyer
 *     (the safer side; merchant hasn't fulfilled); does NOT count as a merchant refund (R-4).
 *   • cancelStaleOpen: OPEN past OPEN_ESCROW_EXPIRY (7d) → cancelled.
 *
 * Off-chain `disputes` API is a non-custodial dispute RECORD (opener/respondent/evidence), not the fund layer.
 * NOT the compiled contract; on-chain stage-2 (bytecode) + service e2e are the deployment confirmations.
 */

export type EscrowState = 'NONE' | 'OPEN' | 'FUNDED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED' | 'RESOLVED';
export type Caller = 'buyer' | 'merchant' | 'dao' | 'thirdParty';
export type Action = 'open' | 'markFunded' | 'release' | 'refund' | 'dispute' | 'resolve' | 'settleByInheritance' | 'cancelStaleOpen';
export type MerchantStatus = 'ACTIVE' | 'SUSPENDED' | 'DELISTED' | 'NONE';
export type TrustTier = 'trusted' | 'neutral' | 'lowTrust';

export type R = { ok: true; next?: EscrowState } | { ok: false; reason: string };
const E = (reason: string): R => ({ ok: false, reason });

// ── Constants (from source) ──────────────────────────────────────────────────
export const OPEN_ESCROW_EXPIRY_DAYS = 7;
export const LOCK_TRUSTED_DAYS = 3;
export const LOCK_NEUTRAL_DAYS = 7;
export const LOCK_LOW_TRUST_DAYS = 14;
export const HIGH_VALUE_THRESHOLD = 10_000;
export const ARBITER_TIMELOCK_DAYS = 7;

export function lockPeriodDays(tier: TrustTier): number {
  return tier === 'trusted' ? LOCK_TRUSTED_DAYS : tier === 'lowTrust' ? LOCK_LOW_TRUST_DAYS : LOCK_NEUTRAL_DAYS;
}
export function isHighValue(amount: number): boolean { return amount >= HIGH_VALUE_THRESHOLD; }

// ── Context for an action attempt ────────────────────────────────────────────
export interface Ctx {
  state: EscrowState;
  merchantStatus: MerchantStatus;
  buyerTier: TrustTier;
  amount: number;
  daysSinceFunded: number;   // for the buyer dispute lock
  daysSinceDisputed: number; // for the arbiter timelock
  daysSinceOpened: number;   // for cancelStaleOpen
  buyerVaultMatches: boolean; // defense-in-depth at markFunded
  aPartyInMemorial: boolean;  // for settleByInheritance
}

// ── Authorization + state-machine transition ─────────────────────────────────
export function attempt(action: Action, caller: Caller, ctx: Ctx): R {
  switch (action) {
    case 'open':
      if (ctx.merchantStatus === 'NONE') return E('COM_NotMerchant');
      if (ctx.merchantStatus === 'SUSPENDED') return E('COM_Suspended');
      return { ok: true, next: 'OPEN' };

    case 'markFunded':
      if (ctx.state !== 'OPEN') return E('COM_BadState');
      if (caller !== 'buyer' && caller !== 'dao') return E('COM_NotAllowed');
      if (ctx.merchantStatus === 'SUSPENDED') return E('COM_Suspended'); // F-SC-024
      if (ctx.merchantStatus === 'DELISTED') return E('COM_Delisted');
      if (!ctx.buyerVaultMatches) return E('COM_NotAllowed'); // defense in depth
      return { ok: true, next: 'FUNDED' };

    case 'release':
      if (ctx.state !== 'FUNDED') return E('COM_BadState');
      if (caller !== 'buyer' && caller !== 'dao') return E('COM_NotAllowed');
      if (ctx.merchantStatus === 'SUSPENDED') return E('COM_Suspended'); // F-SC-024 at release-time
      if (ctx.merchantStatus === 'DELISTED') return E('COM_Delisted');
      return { ok: true, next: 'RELEASED' };

    case 'refund':
      if (ctx.state !== 'FUNDED' && ctx.state !== 'DISPUTED') return E('COM_BadState');
      if (caller !== 'merchant' && caller !== 'dao') return E('COM_NotAllowed');
      return { ok: true, next: 'REFUNDED' };

    case 'dispute':
      if (ctx.state !== 'FUNDED') return E('COM_BadState');
      if (caller !== 'buyer' && caller !== 'merchant') return E('COM_NotAllowed');
      // score-tiered lock applies ONLY to buyer disputes; merchant may dispute anytime
      if (caller === 'buyer' && ctx.daysSinceFunded < lockPeriodDays(ctx.buyerTier)) return E('COM_LockActive');
      return { ok: true, next: 'DISPUTED' };

    case 'resolve':
      if (ctx.state !== 'DISPUTED') return E('COM_BadState');
      if (caller !== 'dao') return E('COM_NotAllowed'); // onlyDAO
      if (isHighValue(ctx.amount) && ctx.daysSinceDisputed < ARBITER_TIMELOCK_DAYS) return E('COM_HighValueTimelock');
      return { ok: true, next: 'RESOLVED' };

    case 'settleByInheritance':
      if (ctx.state !== 'FUNDED' && ctx.state !== 'DISPUTED') return E('COM_BadState');
      if (!ctx.aPartyInMemorial) return E('COM_NotInMemorial');
      return { ok: true, next: 'REFUNDED' }; // refunds buyer regardless of which side died (permissionless)

    case 'cancelStaleOpen':
      if (ctx.state !== 'OPEN') return E('COM_BadState');
      if (ctx.daysSinceOpened < OPEN_ESCROW_EXPIRY_DAYS) return E('COM_NotExpired');
      return { ok: true, next: 'NONE' };
  }
}

// ── Resolve outcome: who is paid ─────────────────────────────────────────────
export function resolveOutcome(buyerWins: boolean): 'buyer' | 'merchant' { return buyerWins ? 'buyer' : 'merchant'; }

// ── Dispute auto-suspension accounting (low-value ignored) ───────────────────
export function disputeCountsTowardSuspension(amount: number, minForPenalty: number): boolean {
  return amount >= minForPenalty; // N-H14: low-value disputes do not penalize the merchant
}

// ── Anti-gaming properties ───────────────────────────────────────────────────
/** A buyer cannot unilaterally take a refund — the only buyer-reachable terminal that moves funds to them is via a
 *  DAO resolve (buyerWins) or settleByInheritance (a party died); never a direct buyer-triggered refund. */
export function buyerCanSelfRefund(): boolean { return false; }
/** The dispute lock uses the LIVE score, so a last-minute trust pump cannot shorten the lock window. */
export function lockUsesLiveScore(): boolean { return true; }
/** A suspended/delisted merchant cannot receive escrow funds at fund-time OR release-time. */
export function suspendedMerchantCanBePaid(status: MerchantStatus): boolean {
  return status === 'ACTIVE'; // SUSPENDED/DELISTED blocked at both markFunded and release
}
/** Mid-flight vault rotation cannot orphan funds — payout vaults are resolved live at payout-time. */
export function rotationOrphansFunds(): boolean { return false; }

// ── Findings ─────────────────────────────────────────────────────────────────
/** MD-1: there is NO automatic release-on-timeout; a silent buyer leaves the merchant reliant on a DAO-resolved
 *  dispute to be paid (merchant may dispute anytime, but resolution is DAO-gated, not automatic). */
export function hasAutoReleaseOnTimeout(): boolean { return false; }
/** A merchant DOES have recourse to a silent buyer: dispute anytime → DAO resolve. (Not stuck, but DAO-gated.) */
export function merchantHasRecourseToSilentBuyer(): boolean { return true; }
/** MD-2: escrow dispute resolution is fully DAO-centralized (resolve is onlyDAO); FraudJury is not in this path. */
export function escrowResolutionIsDaoOnly(): boolean { return true; }
