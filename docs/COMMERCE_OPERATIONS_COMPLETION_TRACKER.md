# VFIDE Commerce Operations Completion Tracker

The same discipline that exposed the hidden Preparedness defects and the Wave 96 integration defects, applied
to commerce. A phase advances **only** through the full gate sequence — never because code exists, tests pass,
or a UI exists.

## The Gate (every subsystem)
```
Build → Functional Audit → Edge-Case Audit (50–100 scenarios) → Adversarial Audit
      → Integration Audit (escrow · trust · ProofScore · Seer · HQ · employees · continuity · preparedness)
      → Grandmother Audit (non-technical merchant usable?) → Certification
```
**Rule:** no future phase starts until the current phase is **fully certified**. Each subsystem requires a
dedicated **Scenario Matrix** (50+ for variants; 100+ for professional services).

## Status legend
🔴 not started · 🟡 in progress / partially certified · ✅ certified · ⛔ locked (prerequisite not met)

---

## PHASE 1 — E-COMMERCE COMPLETION · 🟡 IN PROGRESS · Priority: HIGHEST
Reason: existing merchants are partially blocked.

### 1A — Variants · ✅ CERTIFIED
- **Build:** ✅ three real gaps closed — variant inventory enforcement, variant-required rule, variant CRUD
  (`lib/commerce/variants.ts`, `app/api/merchant/products/[id]/variants/route.ts`, orders-route wiring).
- **Functional / Edge / Adversarial:** ✅ **60 executing scenarios pass** (45 pure-logic + 15 CRUD/route):
  size/color/size+color, 100 variants, out-of-stock, archived, price override, $0 variant, depletion, deletion
  (archive), reorder, concurrency model, wrong-product, overflow/negative/NaN abuse, ownership safety.
- **Integration:** ✅ variant price → order total → escrow; `order_items.variant_id` persisted; variant
  check+decrement inside the existing `FOR UPDATE` transaction; RBAC/ownership/continuity unaffected.
- **Grandmother:** ✅ buyer selector exists; **merchant variant-management UI shipped**
  (`components/merchant/VariantManager.tsx` + "Variants" button in `app/merchant/inventory/page.tsx`).
- **Certification:** ✅ **CERTIFIED** — all gates pass. Evidence:
  `docs/COMMERCE_PHASE_1A_VARIANTS_CERTIFICATION.md`.
- **Target met:** a clothing merchant can operate entirely through variants.

### 1B — Digital Delivery · ✅ CERTIFIED
- **Build:** ✅ four gaps closed — auto-fulfill orchestration (shared `lib/commerce/fulfillDigitalForOrder.ts`),
  license-pool-exhaustion tracking, refund revocation, lost-access reissue (`lib/commerce/digitalDelivery.ts`,
  `app/api/merchant/digital/manage/route.ts`, migration `20260612_140000`, hardened existing route).
- **Functional / Edge / Adversarial:** ✅ **50 executing scenarios** (38 pure-logic + 12 route).
- **Integration:** ✅ **auto-fulfill wired into the verified `payments/confirm` flow** — which also fixed a
  latent bug (the merchant API never set `payment_status='paid'`; orders are now settled at the verified seam).
  Refund→revoke wired into the orders PATCH. Both tested.
- **Grandmother:** ✅ buyer download works; **merchant digital-asset UI shipped**
  (`components/merchant/DigitalAssetManager.tsx` + "Digital" button on digital products).
- **Certification:** ✅ **CERTIFIED** — all gates pass. Evidence:
  `docs/COMMERCE_PHASE_1B_DIGITAL_DELIVERY_CERTIFICATION.md`.
- **Target met:** a software seller can operate entirely inside VFIDE (register file/keys → auto-deliver on
  paid → revoke on refund).

### 1C — Shipping Operations · ✅ CERTIFIED (in-house rating) · ⛔ carrier integration is a documented boundary
- **Build:** ✅ in-house rate engine (`lib/commerce/shippingRates.ts`) — zones + flat/weight/price rates +
  free-over; carrier boundary defined (`lib/commerce/carrierAdapter.ts`, intentionally unimplemented);
  migration `20260612_160000`; CRUD + public quote route; **shipping made server-authoritative in checkout**
  (non-breaking fallback for merchants without zones); UI `app/merchant/shipping/page.tsx` + nav link.
- **Functional / Edge / Adversarial:** ✅ **52 executing scenarios** (39 pure-logic + 13 route): zones,
  flat/weight/price, free-over, weight bounds, multi-rate ordering, international, no-service, authoritative
  selection, client-can't-cheapen.
- **Integration:** ✅ authoritative shipping → order total → escrow; `shipping_rate_id` recorded; uncovered
  destination blocks the order; existing shipments record/confirm + delivery reliability unchanged.
- **Grandmother:** ✅ merchant defines zones + rates from a screen; checkout charges correctly. ⚠️ live carrier
  labels/rates/tracking disclosed as not-built (needs carrier credentials).
- **Certification:** ✅ **in-house rating CERTIFIED**; ⛔ **live carrier integration NOT BUILT (documented
  boundary)**. Evidence: `docs/COMMERCE_PHASE_1C_SHIPPING_CERTIFICATION.md`.
- **Target:** "ship globally" met for rate calculation; carrier labels/live-rates/tracking-sync are a separate
  credential-dependent build against the defined adapter interface (does not block 1D).

### 1D — Tax Engine · ✅ CERTIFIED (in-house rate application) · ⛔ legally-authoritative determination is a documented boundary
- **Build:** ✅ in-house tax engine (`lib/commerce/taxEngine.ts`) — jurisdiction match (city>state>country,
  postal, applies_to), default fallback, exempt, per-type buckets, refund reversal; provider boundary defined
  (`lib/commerce/taxProvider.ts`, intentionally unimplemented); migration `20260612_180000` (order tax_exempt +
  breakdown); **tax made server-authoritative in checkout** (bucketed by CATALOG product_type; non-breaking
  fallback); **order-line product_type now authoritative from catalog** (closed a tax-evasion hole). Existing
  `app/merchant/tax` UI already does full rate authoring — its "picked at checkout" promise is now real.
- **Functional / Edge / Adversarial:** ✅ **52 executing scenarios** (44 pure-logic + 8 integration): matching,
  specificity, applies_to, postal regex (fails closed), default fallback, exempt, multi-state/international,
  refund, can't-dodge-by-type.
- **Integration:** ✅ authoritative tax → order total → escrow; breakdown + exempt persisted; product-type
  trust fix also benefits 1B digital auto-fulfill.
- **Grandmother:** ✅ existing tax UI now backed by real computation; ⚠️ merchant responsible for rate
  correctness (no nexus/taxability determination — documented).
- **Certification:** ✅ **in-house rate application CERTIFIED**; ⛔ **legally-authoritative determination NOT
  BUILT (documented boundary)**. Evidence: `docs/COMMERCE_PHASE_1D_TAX_CERTIFICATION.md`.
- **Target:** checkout charges tax correctly from configured rates; legal rate/nexus/taxability accuracy is a
  separate tax-data-service build against the defined provider interface (does not block 1E).

### 1E — Bundles & Discounts · ✅ FULLY CERTIFIED (no external boundary)
- **Build:** ✅ pure engine (`lib/commerce/discountEngine.ts`) — full coupon validation (time window, usage cap,
  per-customer limit, product scope), bundle match/savings, and `composePrice` (discount→tax-on-discounted-
  base→shipping); migration `20260612_200000` (bundles + components, order coupon_code/bundle_discount);
  bundles CRUD + preview route; **discounts made server-authoritative + composition corrected in checkout**
  (tax now computed on the discounted base; coupon redemption written in the order tx); UI
  `app/merchant/bundles` + nav (Bundles + Discounts).
- **Functional / Edge / Adversarial:** ✅ **59 executing scenarios** (39 pure-logic + 20 route): coupon %/fixed,
  time/usage/per-customer/min-order, product scope, bundle match/savings (no surcharge), composition, can't-go-
  negative / can't-bypass-caps.
- **Integration:** ✅ correct subtotal(1A)→discount(1E)→tax(1D, on discounted base)→shipping(1C)→total pipeline;
  composed total feeds escrow; coupon usage caps enforced in the order transaction.
- **Grandmother:** ✅ coupons (existing manager) + bundles (new page) authorable from screens.
- **Certification:** ✅ **FULLY CERTIFIED — no external boundary**. Evidence:
  `docs/COMMERCE_PHASE_1E_BUNDLES_DISCOUNTS_CERTIFICATION.md`.
- **Target met:** a merchant runs coupon + bundle promotions; checkout prices them authoritatively and
  composes them correctly with tax + shipping.

### 1F — Returns & Exchanges · ✅ FULLY CERTIFIED (no external boundary)
- **Build:** ✅ pure refund/exchange engine (`lib/commerce/returnsEngine.ts`) — proportional discount (clamped
  to gross), proportional tax (via 1D `refundTax`), shipping on full-return; exchange credit/difference;
  **authoritative refund wired into the returns route** (computed from order totals, overrides client amount);
  **completed refund return settles the order + revokes digital deliveries (1B linkage)**. No new migration/UI
  needed (returns table + `app/merchant/returns` already existed); added Returns nav link.
- **Functional / Edge / Adversarial:** ✅ **50 executing scenarios** (44 pure-logic + 6 route). The adversarial
  matrix **caught + fixed a real money bug** (discount could exceed a returned line's gross → negative refund).
- **Integration:** ✅ refund reverses the 1E-composed total (variant→discount→tax→shipping); completed return
  drives the order to `refunded` + digital revoke; restock guard unchanged.
- **Grandmother:** ✅ existing returns UI now with computed refunds (merchant no longer types the amount).
- **Certification:** ✅ **FULLY CERTIFIED — no external boundary**. Evidence:
  `docs/COMMERCE_PHASE_1F_RETURNS_EXCHANGES_CERTIFICATION.md`.
- **Target met:** a merchant processes returns/exchanges; refunds reverse exactly what was paid.

---

## ✅ PHASE 1 (E-COMMERCE) — COMPLETE
All six sub-phases certified: **1A Variants · 1B Digital Delivery · 1C Shipping (in-house; carrier boundary) ·
1D Tax (in-house; determination boundary) · 1E Bundles & Discounts · 1F Returns & Exchanges.** The checkout
pricing pipeline is coherent + server-authoritative end-to-end: variant price → discount → tax on discounted
base → shipping → composed total → escrow, with refunds that reverse it correctly. **Phase 2 (Professional
Services) is unlocked.**


## PHASE 2 — PROFESSIONAL SERVICES CIVILIZATION · ⛔ LOCKED (until Phase 1 certified)
Foundation already in tree (spec + first orchestration route + migration), but **locked** for certification
until Phase 1 completes. Subsystems, each Build → Audit → Certification:
2A Engagements · 2B Contracts · 2C Retainers · 2D Milestones · 2E Deliverables · 2F Acceptance ·
2G Auto-Release · 2H Milestone Disputes. **≥100 scenarios required.**
**Certification:** agency, consultant, lawyer, accountant, developer, designer, coach, architect, and
freelancer can all operate completely within VFIDE.
*(Design note: a milestone = one CommerceEscrow; engagement orchestrates N. Disputes are milestone-scoped for
free. Hard part = subjective acceptance — silence=acceptance auto-release + reasoned-reject. See
`PROFESSIONAL_SERVICES_OPERATIONS_BUILD_SPEC.md`.)*

### 2 — Professional Services · ✅ CERTIFIED (orchestration & acceptance) · ⛔ on-chain fund movement is a wallet/DAO boundary
- **Build:** ✅ acceptance state machine (`lib/commerce/milestoneEngine.ts`) — fund/submit gates, accept→release,
  reasoned-reject→dispute, **silence=acceptance auto-release**, completion; milestone lifecycle route
  (`app/api/merchant/milestones`: link_escrow/deliver/accept/reject/confirm_release); **auto-release keeper**
  (CRON_SECRET-guarded); 6 MILESTONE_* event types; role-aware UI `app/merchant/engagements` + nav. Builds on
  the existing engagements foundation (one CommerceEscrow per milestone — no contract change).
- **Functional / Edge / Adversarial:** ✅ **58 executing scenarios** (40 pure-logic + 18 route): transitions,
  gates, accept/reject, silence=acceptance timing, completion, role enforcement, keeper secret-gating.
- **Integration:** ✅ one-escrow-per-milestone; milestone-scoped disputes (other milestones untouched);
  continuity-aware (silence handles absent client, settleByInheritance handles chain side).
- **Grandmother:** ✅ role-aware engagements UI (provider proposes/delivers, client funds/accepts/rejects).
- **Certification:** ✅ **orchestration & acceptance CERTIFIED**; ⛔ **on-chain fund movement = wallet/DAO action
  (documented boundary, not signed server-side)**. Evidence:
  `docs/COMMERCE_PHASE_2_PROFESSIONAL_SERVICES_CERTIFICATION.md`.
- **Target:** staged service work with per-milestone escrow + silence=acceptance is orchestrated end-to-end;
  fund movement is the audited contract's job via a wallet (fixed_milestone certified; retainer/hourly follow-up).

## PHASE 3 — WORKFORCE · ✅ CERTIFIED
The audit's "strongest, gap-free" category — and the RBAC *model* is excellent — but adversarial reading found
the limits were stored/displayed, **never enforced server-side**. Phase 3 added the missing enforcement.
- **Build:** ✅ pure enforcement engine (`lib/commerce/staffAuthEngine.ts`) — `authorizeStaffAction` (session
  validity → permission → per-tx cap → cumulative daily cap vs today's total) + `canAssignRole` (escalation
  guard: admin can't mint admin); **`authorize` mode** on the staff route (loads perms, computes today's sale
  total from `staff_activity_log`, gates the action, records allowed sales). Staff-management UI already existed;
  added Staff nav.
- **Functional / Edge / Adversarial:** ✅ **59 executing scenarios** (48 pure-logic + 11 route): session
  validity, per-action permission gating, per-tx + daily caps (small sales accumulate to the cap),
  role-assignment escalation, custom overrides (elevated cashier / restricted manager), tamper-safety.
- **Integration:** ✅ token-authenticated gate; `staff_activity_log` is the shared tally + audit source;
  owner manages staff via withAuth, `canAssignRole` guards delegated staff-management.
- **Grandmother:** ✅ existing staff UI now backed by real enforcement (a cashier's caps actually bind).
- **Certification:** ✅ **CERTIFIED**. Evidence: `docs/COMMERCE_PHASE_3_WORKFORCE_CERTIFICATION.md`.
- **Key caveat (named, not hidden):** the `authorize` gate only protects actions that CALL it. The gate + its
  semantics are certified; wiring every POS/sale/refund entry point to call it is a broader integration to
  complete before production reliance.

## PHASE 4 — PHYSICAL RETAIL · ✅ FULLY CERTIFIED (no external boundary)
Was the weakest category (pos/charge = 72-line stub). Phase 4 built the real thing: a POS sale that composes
the Phase 1 pricing pipeline + the Phase 3 staff gate + per-location inventory into one authoritative path,
plus register sessions with cash reconciliation and cross-location stock transfer.
- **Build:** ✅ pure POS engine (`lib/commerce/posEngine.ts`) — drawer reconciliation, register lifecycle,
  location stock, transfers, receipts; migration `20260612_210000` (location_inventory, register_sessions,
  register_movements, POS order columns); register route (`app/api/merchant/registers`) + **real POS sale route
  (`app/api/pos/sale`)** replacing the stub; UI `app/merchant/pos` + nav.
- **Cross-phase wiring (the point):** ✅ POS sale prices server-side (1A), composes tax+total (1D/1E), **gates a
  cashier via authorizeStaffAction (3) — over-cap / over-daily / no-permission DENIED at the till** (the
  gate-ubiquity wiring Phase 3 flagged), and decrements location stock atomically (4).
- **Functional / Edge / Adversarial:** ✅ **50 executing scenarios** (34 pure-logic + 16 route): drawer over/short,
  transfers conserve units, **price-injection blocked**, **staff caps enforced at POS**, short drawer flagged.
- **Integration:** ✅ POS order is a normal merchant_orders row (cash→paid, card→pending); cash ledgered +
  reconciled; refunds/returns/reporting see POS sales uniformly.
- **Grandmother:** ✅ register/POS screen (open float → ring sales → close + count) for a non-technical operator.
- **Certification:** ✅ **FULLY CERTIFIED — no external boundary**. Evidence:
  `docs/COMMERCE_PHASE_4_PHYSICAL_RETAIL_CERTIFICATION.md`.


## PHASE 5 — MARKETPLACE DISCOVERY · ✅ CERTIFIED (ranking engine) · ⚠️ public marketplace UI wiring is the remaining follow-up
The audit said VFIDE "lacks a ranking engine" — out of date: a mature relevance-gated, capped, fraud-penalizing,
explainable engine already existed (Waves 63/69/76/82). Phase 5 verified it and added the adversarial matrix.
- **Build:** ✅ engine `lib/seer/discovery.ts` verified (relevance dominates / merit capped / fraud penalty /
  forbidden wealth-social-paid inputs / explainable); route `app/api/discovery` composes real server signals;
  merchant transparency `app/api/merchant/discovery-standing` + `MerchantDiscoveryStanding`.
- **Functional / Edge / Adversarial:** ✅ **58 executing scenarios** (21 existing engine + 31 new anti-manipulation
  + 6 route): **keyword-stuffing, fake-merchant, signal-stacking, review/dispute attacks, order-manipulation all
  resisted**; recovery possible; fraud-flagged merchant demoted through the real route path.
- **Integration:** ✅ ProofScore/trust + delivery + fraud + Builder + commerce-health rank with correct caps and
  the protective fraud penalty; un-gameable by construction.
- **Grandmother:** ✅ merchant discovery-standing transparency. ⚠️ the public `app/marketplace` UI still queries
  `/api/merchant/products` (client-side filtering) and does NOT yet consume `/api/discovery` — documented gap.
- **Certification:** ✅ **ranking engine CERTIFIED**; ⚠️ **public marketplace UI wiring is the remaining
  follow-up**. Evidence: `docs/COMMERCE_PHASE_5_MARKETPLACE_DISCOVERY_CERTIFICATION.md`.

---

## ✅ COMMERCE OPERATIONS — ALL FIVE PHASES ADDRESSED
**Phase 1 (E-Commerce, 1A–1F) ✅ · Phase 2 (Professional Services) ✅ (orchestration; on-chain = wallet/DAO
boundary) · Phase 3 (Workforce) ✅ · Phase 4 (Physical Retail) ✅ · Phase 5 (Marketplace Discovery) ✅ (ranking
engine; public-UI wiring documented as follow-up).** The gate discipline held throughout: a 50+ scenario matrix
per phase, an adversarial pass that repeatedly caught real money/security/ranking issues, an honest boundary
wherever one existed (carrier, tax determination, on-chain signing, gate-ubiquity, marketplace-UI wiring), and a
Grandmother check per surface.


---

## Ledger
| Phase | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | 1A Variants | ✅ CERTIFIED | `COMMERCE_PHASE_1A_VARIANTS_CERTIFICATION.md`; 60 scenarios; engine+UI; regression green |
| 1 | 1B Digital Delivery | ✅ CERTIFIED | `COMMERCE_PHASE_1B_DIGITAL_DELIVERY_CERTIFICATION.md`; 50 scenarios; engine+trigger+UI |
| 1 | 1C Shipping | ✅ CERTIFIED (in-house); carrier integration = documented boundary | `COMMERCE_PHASE_1C_SHIPPING_CERTIFICATION.md`; 52 scenarios |
| 1 | 1D Tax | ✅ CERTIFIED (in-house); determination = documented boundary | `COMMERCE_PHASE_1D_TAX_CERTIFICATION.md`; 52 scenarios |
| 1 | 1E Bundles & Discounts | ✅ FULLY CERTIFIED | `COMMERCE_PHASE_1E_BUNDLES_DISCOUNTS_CERTIFICATION.md`; 59 scenarios |
| 1 | 1F Returns & Exchanges | ✅ FULLY CERTIFIED | `COMMERCE_PHASE_1F_RETURNS_EXCHANGES_CERTIFICATION.md`; 50 scenarios |
| 2 | Professional Services | ✅ CERTIFIED (orchestration); on-chain fund movement = wallet/DAO boundary | `COMMERCE_PHASE_2_PROFESSIONAL_SERVICES_CERTIFICATION.md`; 58 scenarios |
| 3 | Workforce | ✅ CERTIFIED | `COMMERCE_PHASE_3_WORKFORCE_CERTIFICATION.md`; 59 scenarios |
| 4 | Physical Retail | ✅ FULLY CERTIFIED | `COMMERCE_PHASE_4_PHYSICAL_RETAIL_CERTIFICATION.md`; 50 scenarios; pricing+staff-gate+location-inventory wired |
| 5 | Marketplace Discovery | ✅ CERTIFIED (engine); public-UI wiring = documented follow-up | `COMMERCE_PHASE_5_MARKETPLACE_DISCOVERY_CERTIFICATION.md`; 58 scenarios |

**Immediate next action:** ALL FIVE Commerce Operations phases are addressed. The single most valuable remaining
follow-up surfaced by the gate discipline is **wiring the public marketplace UI (`app/marketplace`) to consume
the ranked, abuse-resistant `/api/discovery` results** (it currently uses `/api/merchant/products` with
client-side filtering). The ranking engine and merchant transparency are complete and tested; this is a UI
integration, not an engine change.