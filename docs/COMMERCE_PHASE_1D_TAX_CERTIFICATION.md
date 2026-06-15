# Commerce Operations · Phase 1D — Tax Engine · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 52-scenario matrix. Verdict up front: **Phase 1D is CERTIFIED for in-house tax rate
application — with an explicit, documented boundary: legally-authoritative tax DETERMINATION (correct nexus,
per-product taxability, accurate rates across thousands of US local jurisdictions + international VAT/GST) is
NOT built, because it is a tax-data-service problem (Avalara/TaxJar class) requiring external credentials and
continuously-updated data this system does not have.** Same shape as 1C: VFIDE computes consistently from a
merchant's configured rates; the merchant (or a future TaxProvider) is responsible for rate correctness.

## Build — what was found, what was built
Like 1C, the audit was right that tax was "stored, not computed." What existed: a strong storage + authoring
layer — `merchant_tax_rates` (rate in **basis points**, jurisdiction country/state/city, `postal_code_pattern`
regex, `is_default` with a unique-per-merchant index, `enabled`, `applies_to[]`), a full CRUD route, AND a
**complete merchant UI** (`app/merchant/tax/page.tsx`, 401 lines: add/edit/delete, make-default, applies-to,
percent↔bps). The route's own comment promised "checkout picks the matching rate by the buyer's shipping
address" — but **no jurisdiction-matching or tax-computation logic existed anywhere** (aspirational), and
`tax_amount` in the orders route was **client-supplied** (the same trust gap shipping had before 1C).

Built (typecheck-clean, git-applicable):
- **`lib/commerce/taxEngine.ts`** — pure engine: `rateMatchesAddress` (null rate field = "any"; invalid stored
  regex fails closed), `selectRate` (most-specific wins: city > state > country, postal adds specificity; ties
  by rate then id; falls back to the merchant default; honors `applies_to`), `computeTax` (buckets lines by
  product type, applies each type's selected rate, exempt → zero, rounds per-bucket + total to cents,
  `effectiveRateBps` when uniform), `refundTax` (proportional reversal).
- **`lib/commerce/taxProvider.ts`** — the honest boundary: a typed `TaxProvider` interface
  (`determine`) that is **intentionally unimplemented** (`NO_TAX_PROVIDER` throws), so a real determination
  service drops in later without touching checkout.
- **Migration `20260612_180000`** — `merchant_orders.tax_exempt` + `tax_breakdown` JSONB (audit trail).
- **Trust fixes in the orders route:** (1) tax is **server-authoritative** when the merchant has enabled rates
  — lines bucketed by the **catalog** `product_type` (not the client's), most-specific jurisdiction rate per
  type, exempt → zero; persisted with breakdown. Non-breaking fallback to the client amount when no rates.
  (2) order-line `product_type` is now taken from the **catalog**, not the client — closing a tax-evasion hole
  (a client could have mislabeled a physical good as a 0%-rated type).
- **UI:** none needed — the existing `app/merchant/tax/page.tsx` already does full rate authoring, and its
  "picked at checkout" promise is now actually true.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (52 executing scenarios)
**Honesty constraint (as before):** no live Postgres → logic extracted to pure functions and run as tests. The
orders-route integration is exercised via its exact mapping contract (`taxEngine.integration.test.ts`) and
covered by the build's typecheck.

**Pure-logic matrix — 44 scenarios** (`__tests__/commerce/taxEngine.test.ts`):
- *Jurisdiction matching (A1–A7):* country/state/city (case-insensitive), mismatch, **null field = any**.
- *Specificity (B1–B4):* city > state > country, fallbacks, tie-break by rate then id.
- *applies_to (C1–C4):* physical/digital/service selection, type-excluded rate ignored.
- *Postal patterns (D1–D4):* regex match/non-match, **invalid regex fails closed**, postal adds specificity.
- *Default / no-service (E1–E3):* fallback to default, no-match+no-default → null, default-not-applies → null.
- *computeTax (F1–F6):* single rate, cents rounding, mixed-type sum, same-type bucketing, no-rate → 0,
  breakdown recording.
- *Exempt (G1–G2):* zero tax, lines preserved.
- *Multi-state / international (H1–H4):* CA/NY/UK rates, unconfigured state → 0.
- *Refund (I1–I5):* full/half/over-clamp/zero-base/partial-rounding.
- *Adversarial (J1–J5):* disabled never selected, can't dodge via type (catalog type used), country-null
  default taxes empty address, empty config safe, huge postal doesn't crash.

**Integration matrix — 8 scenarios** (`__tests__/commerce/taxEngine.integration.test.ts`):
- *Orders-route shape (K1–K5):* multi-item cart summed, digital+physical mix, exempt, international fallback,
  service line.
- *Real-world modeling (L1–L3):* a **combined** city rate (state+local folded in) applied as-is (documented:
  VFIDE applies one most-specific rate, not additive stacking), buyer outside the city → state rate, origin-
  based single default.

**Result: 52/52 pass.** Full regression: **250 tests / 13 suites green**, typecheck 0, nav 0.

## Integration
- **Checkout / orders:** ✅ tax server-authoritative when rates exist; bucketed by catalog product type; exempt
  honored; `tax_breakdown` + `tax_exempt` persisted; non-breaking fallback for merchants without rates.
- **Order total → escrow:** ✅ authoritative tax feeds the order total escrow funds — same trust path as 1A/1C.
- **Product-type trust:** ✅ line `product_type` now authoritative from the catalog (also benefits 1B's digital
  auto-fulfill, which keys off product type).
- **ProofScore / continuity / RBAC / shipping (1C):** ✅ unaffected — tax is checkout-time pricing config; a
  `manager` edits rates via the existing permission.

## Grandmother — can a non-technical merchant charge tax?  ✅
- ✅ The merchant sets per-jurisdiction rates (and a default) from `app/merchant/tax`, choosing applies-to and
  entering a percent; checkout then charges the right rate automatically by the buyer's address. The page's
  long-standing promise is now real. No new UI needed.
- ⚠️ The merchant is responsible for configuring **correct** rates for the jurisdictions they have nexus in —
  VFIDE does not determine nexus or per-product taxability. This is the documented boundary, not hidden.

## Certification verdict (honest, scoped)
| Gate | Result |
|---|---|
| Build | ✅ engine + authoritative checkout + product-type trust fix; provider boundary defined |
| Functional / Edge-Case | ✅ 44 pure-logic scenarios |
| Adversarial | ✅ can't dodge tax by type/disabled rate; invalid regex fails closed |
| Integration | ✅ server-authoritative tax wired into orders, non-breaking; breakdown persisted |
| Grandmother | ✅ existing tax UI now backed by real computation |
| **Phase 1D — in-house rate application** | ✅ **CERTIFIED** |
| **Phase 1D — legally-authoritative determination** | ⛔ **NOT BUILT (documented boundary; needs a tax-data service)** |

**What "certified" covers and doesn't:** a merchant can configure jurisdiction rates and have checkout charge
tax correctly and server-authoritatively from those rates — built, tested, usable. **It does NOT claim legal
correctness of rates, nexus determination, or per-product taxability** — those require a tax-determination
service behind the defined `TaxProvider` interface. I am certifying what exists and naming what doesn't.

Per the discipline, **Phase 1E (Bundles & Discounts) may begin** — 1D's in-house scope is certified and its
boundary documented. A live tax-determination integration, if later required, is a separate credential-
dependent build against `taxProvider.ts` and does not block 1E.

## Residual honesty notes
- "Tested" = pure-logic + integration-contract execution; **not** live Postgres. The authoritative-tax path in
  the orders route (rate load + bucket + persist) and the migration should be confirmed against a real DB.
- Server-authoritative tax is **opt-in by configuring rates** (non-breaking). A merchant with no rates still
  accepts a client `tax_amount` — a stricter posture is a future tightening.
- VFIDE applies **one most-specific rate per type**, not additive state+county+city stacking; merchants fold
  local taxes into a single combined jurisdiction rate. Documented modeling choice, not a hidden assumption.
- `refundTax` is implemented and tested but not yet wired into a partial-refund flow (refunds here are full-
  order); wiring it is a small follow-up when partial refunds land.
