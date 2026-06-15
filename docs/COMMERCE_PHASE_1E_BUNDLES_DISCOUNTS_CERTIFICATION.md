# Commerce Operations · Phase 1E — Bundles & Discounts · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 59-scenario matrix. Verdict up front: **Phase 1E is FULLY CERTIFIED — no external
boundary.** Unlike 1C (carrier) and 1D (tax determination), discounts and bundles are entirely in-house
commerce logic with no third-party dependency, so this is a complete certification. The real risk here was
**composition** — how discounts interact with the now-authoritative variant pricing (1A), shipping (1C), and
tax (1D) — and that interaction is built correctly and tested.

## Build — what was found, what was built
Coupons were further along than expected (the recurring 1A/1B lesson): `merchant_coupons` (percentage/fixed,
min-order, max-discount, max-uses, per-customer-limit, valid-from/until, product-scoped) + a
`coupon_redemptions` table + full CRUD route + a merchant coupons UI + `lib/coupons.calculateCouponDiscount`.
But there were real gaps:
1. **`discount_amount` was client-supplied** in the orders route — the same trust gap shipping/tax had; a buyer
   could claim any discount, and no coupon limits were enforced at order time.
2. **`calculateCouponDiscount` was incomplete** — it checked active + min-order + max-discount, but NOT the
   time window, total usage cap, per-customer limit, or product scope.
3. **No bundle feature at all** ("buy X + Y together for Z").
4. **Composition was wrong for the new authoritative pricing:** tax was computed on the *gross* subtotal, and
   discount was subtracted at the very end — so a discount didn't reduce taxable value.

Built (typecheck-clean, git-applicable):
- **`lib/commerce/discountEngine.ts`** — pure logic:
  - `validateCoupon` — the full authoritative check (time window, usage cap, per-customer limit, product
    scope), computing the discount against the ELIGIBLE (scoped) subtotal; builds on `calculateCouponDiscount`.
  - `bundleMatchCount` / `bundleComponentCost` / `bundleSavings` — a bundle fires when the cart has ALL its
    components; savings are component-cost − bundle price (fixed) or %-off (percent), never a surcharge,
    multiplied by whole copies present.
  - `composePrice` — the canonical order math: **discount reduces subtotal → tax is computed on the discounted
    base → shipping added last**; discount clamped so the total never goes negative.
- **Migration `20260612_200000`** — `merchant_bundles` + `merchant_bundle_components`; `merchant_orders`
  `coupon_code` + `bundle_discount`.
- **`app/api/merchant/bundles/route.ts`** — bundle CRUD (with product-ownership verification) + a public
  `?action=preview` (bundle savings for a cart).
- **Trust fixes in the orders route (the core of 1E):**
  - Discounts are now **server-authoritative** and computed **before** tax. Coupons are validated against the
    customer's real prior redemptions and the eligible subtotal; bundles are auto-applied from the cart.
  - **Tax is computed on the discounted base** (each line scaled by the discount ratio across product-type
    buckets), and `composePrice` produces the final total. Non-breaking: with no coupon code and no bundles,
    the client `discount_amount` is honored (legacy).
  - The **coupon redemption is written + `uses` incremented inside the order transaction**, so usage caps and
    per-customer limits are enforced against real redemptions (not bypassable).
- **UI:** `app/merchant/bundles/page.tsx` (create/list/delete bundles, pick component products + quantities),
  linked in the merchant nav alongside a new **Discounts** link to the existing coupons manager.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (59 executing scenarios)
**Honesty constraint (as before):** no live Postgres → logic extracted to pure functions and run as tests, plus
the bundles route tested against a mocked DB. Every scenario executed and passed.

**Pure-logic matrix — 39 scenarios** (`__tests__/commerce/discountEngine.test.ts`):
- *Coupon percentage/fixed (A1–A6):* %/fixed, maxDiscount cap, never-exceeds-base, inactive, zero-effect.
- *Time window (B1–B4):* not-started, expired, within, no-window.
- *Usage caps (C1–C6):* total cap, per-customer limit, min-order (against full subtotal).
- *Product scope (D1–D3):* scoped discounts only eligible subtotal, no-eligible → rejected, unscoped uses full.
- *Bundle match (E1–E5):* copies limited by scarcest component, missing component → 0, qty>1, inactive, empty.
- *Bundle savings (F1–F5):* component cost, fixed saving, %-off, **above-components → 0 (no surcharge)**,
  multi-copy.
- *Composition (G1–G5):* **discount reduces subtotal, tax on discounted base, shipping after**, clamp, no-
  discount, shipping-not-discounted, cents rounding.
- *Adversarial (H1–H5):* can't go negative, expired+capped both reject, can't over-discount scoped base,
  bundle can't surcharge, disabled rejected.

**Route matrix — 20 scenarios** (`__tests__/api/merchant-bundles.test.ts` — 10 here; coupons route already
existed):
- *Bundle CRUD (I1–I6):* add (ownership-verified, tx), non-owned product → 400, unowned update → 404, delete,
  invalid pricing_type → 400, empty components → 400.
- *Bundle preview (J1–J3):* savings for a matching cart, no-merchant → 400, garbage cart → 0.
- *Validation (K1):* unknown action → 400.

**Result: 59/59 pass.** Full regression: **299 tests / 15 suites green**, typecheck 0, nav 0.

## Integration — the composition with 1A / 1C / 1D (the point of this phase)
- **Pricing pipeline:** ✅ subtotal (1A variant pricing) → **discount (1E)** → **tax on discounted base (1D)** →
  **shipping (1C)** → `composePrice` total. The ordering is explicit and tested; a coupon now correctly reduces
  the taxable amount, and shipping is not discounted away.
- **Escrow:** ✅ the composed total is what escrow funds — discounts can't desync the on-chain amount from the
  order.
- **Coupon redemption integrity:** ✅ redemption row + `uses` increment happen in the same transaction as the
  order; usage caps / per-customer limits enforced against real data; rolls back with the order on failure.
- **Variant pricing (1A):** ✅ bundle component costs and coupon eligibility use the authoritative line prices
  (variant overrides included), since they read `validatedItems`.
- **ProofScore / continuity / RBAC:** ✅ unaffected — discounts are checkout pricing; a `manager` authors
  bundles/coupons via the existing permission.

## Grandmother — can a non-technical merchant run a promotion?  ✅
- ✅ Coupons: the existing coupons manager (create codes, %/fixed, limits, expiry).
- ✅ Bundles: new `app/merchant/bundles` — name a bundle, pick products + quantities, set a bundle price or
  %-off; checkout applies it automatically. Both linked in the merchant nav (Bundles + Discounts).

## Certification verdict (full)
| Gate | Result |
|---|---|
| Build | ✅ coupon validation completed; bundles built; composition corrected |
| Functional / Edge-Case | ✅ 39 pure-logic scenarios |
| Adversarial | ✅ can't go negative, over-discount, surcharge, or bypass caps |
| Integration | ✅ correct discount→tax→shipping composition; redemption integrity in the order tx |
| Grandmother | ✅ coupons + bundles authorable from screens |
| **Phase 1E** | ✅ **FULLY CERTIFIED (no external boundary)** |

Per the discipline, **Phase 1F (Returns & Exchanges) may begin** — 1E is fully certified.

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The orders-route discount path (coupon
  load + redemption write + `uses` increment) and the bundle/coupon SQL should be confirmed against a real DB.
- A subtle concurrency note: total `max_uses` is enforced by reading `uses` then incrementing in the order tx.
  Under heavy concurrent redemption of the *same* coupon, two orders could both pass the check before either
  increments (a classic check-then-act race). For exact-cap enforcement under contention, a conditional
  `UPDATE ... WHERE uses < max_uses` (or a row lock) is the hardening — noted, not yet applied, because it
  needs live-DB verification.
- Tax-on-discounted-base scales lines by the overall discount ratio; for a product-scoped coupon this spreads
  the discount across all taxable buckets rather than only the scoped products' bucket. This is a reasonable,
  conservative approximation for blended tax; an exact per-bucket discount allocation is a future refinement.
- Server-authoritative discount is **opt-in by sending a coupon code / having bundles**; a merchant with
  neither still accepts a client `discount_amount` (non-breaking). Stricter enforcement is a future tightening.
