# Commerce Operations · Phase 1C — Shipping Operations · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 52-scenario matrix. Verdict up front: **Phase 1C is CERTIFIED for in-house shipping
operations — with an explicit, documented boundary: live carrier integration (real-time USPS/UPS/FedEx rates,
label purchase, tracking sync) is NOT built, because it requires external carrier credentials this system does
not have.** This is the inverse of 1A/1B (where more was built than the audit implied); here the audit was
right that shipping was thin, and 1C honestly draws the line between what's buildable in-house and what isn't.

## Build — what was found, what was built
The shipments layer's own code says it plainly: a **record + confirmation** system, "NOT a live carrier API."
What existed: a `shipments` table with a status machine (shipped / delivered_confirmed / delivered_unconfirmed
/ not_received / **returned**), delivery-reliability scoring, tracking capture; plus `weight_grams` on products
and `shipping_address` (with country) on orders. What was **missing** (the buildable in-house gaps):
1. **No shipping zones** — no way to say where a merchant ships.
2. **Shipping cost was client-supplied** — `shipping_amount` came from the request body (a real trust gap:
   shipping wasn't server-authoritative, unlike product/variant price after 1A).
3. **No rate rules** — no flat/weight/price rate tables.

Built (typecheck-clean, git-applicable):
- **`lib/commerce/shippingRates.ts`** — pure engine: `resolveZone` (explicit country wins over `*` catch-all),
  `rateCost` (flat / weight [per-kg rounded up] / price [% of subtotal], free-over, weight bounds),
  `quoteShipping` (applicable rates cheapest-first), `authoritativeShipping` (server-authoritative selection).
- **`lib/commerce/carrierAdapter.ts`** — the honest boundary: a typed `CarrierAdapter` interface
  (`getLiveRates` / `buyLabel` / `getTracking`) that is **intentionally unimplemented** (`NO_CARRIER_ADAPTER`
  throws), so a real provider can be dropped in later without touching checkout/order code.
- **Migration `20260612_160000`** — `merchant_shipping_zones`, `merchant_shipping_rates`, and
  `merchant_orders.shipping_rate_id` (records the authoritative rate used).
- **`app/api/merchant/shipping/route.ts`** — zones/rates CRUD + a public `?action=quote` endpoint.
- **Trust fix in the orders route:** when a merchant has configured zones, shipping is now
  **server-authoritative** (computed from catalog weights + destination country + the chosen rate). If they
  have **no** zones, it falls back to the client amount (legacy behavior) so existing merchants aren't broken.
- **UI:** `app/merchant/shipping/page.tsx` (zones + rates authoring), linked in the merchant nav.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (52 executing scenarios)
**Honesty constraint (as before):** no live Postgres → logic extracted to pure functions and run as tests,
plus the route tested against a mocked DB. Every scenario executed and passed.

**Pure-logic matrix — 39 scenarios** (`__tests__/commerce/shippingRates.test.ts`):
- *Zone resolution (A1–A7):* explicit/EU/case-insensitive/catch-all, explicit-wins-over-catch-all, no-zones,
  **no-catch-all+unlisted → null (no service)**.
- *Flat (B1–B3):* fee ignores weight, zero=free, inactive→null.
- *Weight (C1–C5):* base+per-kg **rounded up**, exact-1kg, 1g→1kg, 0g→base, multi-package 10.1kg→11kg.
- *Price / free-over (D1–D4):* % of subtotal, free-over threshold (and just under), free-over on weight rates,
  cents rounding.
- *Weight bounds (E1–E4):* below-min/above-max don't apply, within applies, inclusive boundary.
- *Multi-rate quote (F1–F4):* cheapest-first, free-over reorders, other-zone excluded, inapplicable filtered.
- *International / no-service (G1–G3):* domestic vs international rate, **uncovered → no options (not free)**.
- *Authoritative selection (H1–H4):* chosen amount, default-cheapest, NO_SERVICE, RATE_NOT_AVAILABLE.
- *Adversarial (I1–I5):* client can't force a cheaper amount (engine recomputes), can't pick an inapplicable
  weight-bounded or inactive rate, empty-country with/without catch-all.

**Route matrix — 13 scenarios** (`__tests__/api/merchant-shipping.test.ts`, mocked DB):
- *Zone CRUD (J1–J4):* add (countries uppercased), unowned→404, delete cascades, empty-update→400.
- *Rate CRUD (K1–K5):* add on owned zone, unowned zone→404, update, unowned delete→404, invalid type→400.
- *Quote (L1–L3):* options + `ships_to_destination`, uncovered→empty/false, missing merchant→400.
- *Validation (M1):* unknown action→400.

**Result: 52/52 pass.** Full regression: **198 tests / 11 suites green**, typecheck 0, nav 0.

## Integration
- **Checkout / orders:** ✅ shipping is server-authoritative when zones exist; the chosen `shipping_rate_id` is
  recorded on the order; an uncovered destination **blocks** the order rather than defaulting to free. Non-
  breaking fallback for merchants without zones.
- **Order total → escrow:** ✅ authoritative shipping feeds the order total that escrow funds — same trust path
  as 1A's variant pricing.
- **Existing shipments record/confirm + delivery reliability:** ✅ unchanged and complementary — the rate
  engine prices the sale; the shipments layer records dispatch/delivery and feeds Seer/fraud.
- **ProofScore / continuity / RBAC:** ✅ shipping is catalog/checkout config; doesn't alter scoring, recovery,
  or staff permissions (a `manager` edits shipping via the existing `product_edit`-class permission).

## Grandmother — can a non-technical merchant ship?  ✅ (in-house) / boundary noted
- ✅ A merchant defines zones (countries, or `*` for rest-of-world) and rates (flat / by-weight / by-price,
  optional free-over) from `app/merchant/shipping`, with inline guidance; checkout then charges correctly with
  no technical knowledge. The page states honestly that this is in-house rating, not a live carrier integration.
- ⚠️ A merchant who wants **printed carrier labels / real-time carrier rates / automatic tracking** cannot get
  them here — that needs a carrier account and an implemented `CarrierAdapter`. This is disclosed, not hidden.

## Certification verdict (honest, scoped)
| Gate | Result |
|---|---|
| Build | ✅ zones + rates + authoritative checkout; carrier boundary defined |
| Functional / Edge-Case | ✅ 39 pure-logic scenarios |
| Adversarial | ✅ client cannot dictate/cheapen shipping; inapplicable rates rejected |
| Integration | ✅ server-authoritative shipping wired into orders, non-breaking |
| Grandmother | ✅ in-house shipping fully usable from a screen |
| **Phase 1C — in-house rating** | ✅ **CERTIFIED** |
| **Phase 1C — live carrier integration** | ⛔ **NOT BUILT (documented boundary; needs external credentials)** |

**What "certified" covers and doesn't:** a physical-product merchant can define global shipping zones + rate
rules and have checkout charge correctly, server-authoritatively — that is built, tested, and usable.
**"Ship globally" is met for rate calculation; it is NOT met for carrier labels/live-rates/tracking-sync**,
which are an explicit, typed, unimplemented boundary (`carrierAdapter.ts`). I am certifying what exists and
naming what doesn't rather than claiming a carrier integration I cannot build or test here.

Per the discipline, **Phase 1D (Tax Engine) may begin** — 1C's in-house scope is certified and its boundary is
documented. (If live carrier integration is later required for launch, it is a separate, credential-dependent
build against the defined adapter interface — it does not block 1D.)

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The authoritative-shipping path in the
  orders route (zone/rate load + weight sum + selection) and the CRUD SQL should be confirmed against a real DB
  before launch.
- The non-breaking fallback means a merchant with **no** zones still accepts a client-supplied `shipping_amount`
  — server-authoritative enforcement is **opt-in by configuring zones**. A stricter posture (require zones for
  physical products) is a future tightening, noted not hidden.
- Weight uses catalog `weight_grams`; products with null weight contribute 0 — merchants must set weights for
  weight-based rates to be meaningful.
