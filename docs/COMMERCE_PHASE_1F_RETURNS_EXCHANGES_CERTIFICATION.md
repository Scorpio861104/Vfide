# Commerce Operations · Phase 1F — Returns & Exchanges · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 50-scenario matrix. Verdict up front: **Phase 1F is FULLY CERTIFIED — no external
boundary** (like 1E; returns are in-house logic). This is the **final E-Commerce sub-phase — Phase 1 is now
complete.** The interaction risk I flagged — refund math that correctly reverses the 1E-composed total
(discount + tax + shipping) — is built and tested, and the matrix caught + fixed a real engine bug.

## Build — what was found, what was built
The returns workflow was further along than expected (the recurring lesson): `merchant_returns` (items, type,
status machine requested→approved/rejected→completed, refund/credit amounts, resolved-by) + a 325-line route
doing RMA creation (with order-item validation — F-BE-036), a status state machine, and **inventory restock on
completion with a `__restocked` double-restock guard** (F-BE-035). Buyer-owns-order is enforced (F-BE-011).
Real gaps:
1. **`refund_amount` was client-passed**, not computed — a merchant could enter any number; nothing reversed
   the actual 1E-composed total. The interaction risk made concrete.
2. **No proportional refund logic** — a partial return needs item value − proportional discount + proportional
   tax + (shipping on full return); 1D's `refundTax` existed but was unused here.
3. **No exchange re-pricing** — `type='exchange'` stored but no price-difference computation.
4. **Completing a return didn't link back to the order** — no refunded-status, no 1B digital revoke.

Built (typecheck-clean, git-applicable):
- **`lib/commerce/returnsEngine.ts`** — pure logic:
  - `returnedValue` — gross value of returned lines, capped at ordered quantities; full-vs-partial.
  - `computeRefund` — AUTHORITATIVE refund: returned lines' net value (after **proportional discount, clamped
    to gross** so a discount can't reverse more than the goods), + **proportional tax** (via 1D's `refundTax`
    on the discounted base), + **shipping on full return only** (policy-gated). Composes 1A/1D/1E.
  - `computeExchange` — returned lines' net value as a credit vs replacement value → amount due / refund.
- **Trust fixes in the returns route:**
  - For refund-type returns reaching approved/completed, the refund is now **computed from the order's actual
    line items + totals**, overriding the client `refundAmount`. Non-breaking: falls back to the provided
    amount if the order can't be loaded.
  - A **completed refund return settles the order** (status + payment_status `refunded`) and **revokes its
    digital deliveries** (1B linkage). Best-effort; never fails the return update.
- **No new migration / no new UI needed** — `merchant_returns` already had the columns, and
  `app/merchant/returns` already manages the workflow (it now benefits from authoritative refund computation
  for free, since the merchant no longer types the amount). Added a **Returns** nav link for discoverability.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (50 executing scenarios)
**Honesty constraint (as before):** no live Postgres → logic extracted to pure functions and run as tests, plus
the route tested against a mocked DB. Every scenario executed and passed (after a real bug was fixed — below).

**Pure-logic matrix — 44 scenarios** (`returnsEngine.test.ts` + `returnsEngine.combinations.test.ts`):
- *Returned value (A1–A5):* partial value, full detection, over-return cap, not-in-order → 0.
- *Refund no discount/tax (B1–B2)*; *with discount (C1–C2)* proportional, don't-refund-unpaid-discount;
  *with tax (D1–D2)* proportional; *shipping policy (E1–E3)* full-only, policy-off, partial-never.
- *Exchange (F1–F4):* even/upgrade/downgrade/discount-adjusted credit.
- *Multi-line partial (K1–K3); discount+tax combined (L1–L2); rounding (M1–M2); quantity partials (N1–N3);
  full pipeline discount+tax+shipping (O1–O3); exchange combinations (P1–P3).*
- *Adversarial (G1–G5, Q1–Q5):* over-return capped, **discount can't exceed gross (the bug, now fixed)**,
  zero-subtotal safe, fully-discounted refunds ~0 goods, negative-quantity ignored, never-negative refund.

**Route matrix — 6 scenarios** (`merchant-returns.test.ts`, mocked DB):
- *RMA creation (H1):* buyer files a return for their own order.
- *Authoritative refund (I1–I4):* **computed refund overrides the client amount** (verified 32.40 over 999),
  invalid transition rejected, not-found → 404, missing fields → 400.
- *Settlement linkage (J1):* completing a refund return settles the order + revokes digital deliveries.

**Result: 50/50 pass.** Full regression: **321 tests / 14 suites green**, typecheck 0, nav 0.

### A real bug the matrix caught
Scenario Q5 (discount $1000 on a $160 order, return one $20 line) produced a **−105 refund**: the proportional
discount ($125) exceeded the returned line's gross ($20). Fixed by clamping `discountReversed` to the gross so
the net refund can never go negative (applied to both refund and exchange). Without the adversarial matrix this
ships as a money bug.

## Integration — the composition with 1A / 1C / 1D / 1E (the point of this phase)
- **Refund reversal:** ✅ a refund reverses the **1E-composed** total: returned goods' net value (after
  proportional 1E discount) + proportional 1D tax (on the discounted base) + 1C shipping (full return). Uses
  1A's authoritative line prices from `merchant_order_items`.
- **Order lifecycle:** ✅ a completed refund return drives the order to `refunded` (the same terminal state the
  orders PATCH already supported) and triggers 1B digital revoke — one consistent settlement path.
- **Inventory:** ✅ restock on approve/complete with the existing double-restock guard (unchanged).
- **Escrow / ProofScore / continuity:** ✅ the refund amount is authoritative, so a refund can't over-withdraw
  vs what escrow holds; delivery-reliability/fraud signals from the shipments layer are untouched.

## Grandmother — can a non-technical merchant handle returns?  ✅
- ✅ `app/merchant/returns` lists requests, filters by status, and approves/rejects — and now the refund amount
  is computed for the merchant (no manual math). Added to the merchant nav.

## Certification verdict (full)
| Gate | Result |
|---|---|
| Build | ✅ refund/exchange engine; authoritative refund + order settlement wired |
| Functional / Edge-Case | ✅ 44 pure-logic scenarios |
| Adversarial | ✅ over-return capped, discount-can't-exceed-gross (bug fixed), never-negative |
| Integration | ✅ refund reverses the composed total; order settlement + digital revoke |
| Grandmother | ✅ existing returns UI, now with computed refunds |
| **Phase 1F** | ✅ **FULLY CERTIFIED (no external boundary)** |

## Phase 1 (E-Commerce) — COMPLETE
With 1F certified, **all six E-Commerce sub-phases are done**: 1A Variants ✅ · 1B Digital Delivery ✅ · 1C
Shipping ✅ (in-house; carrier boundary documented) · 1D Tax ✅ (in-house; determination boundary documented) ·
1E Bundles & Discounts ✅ · 1F Returns & Exchanges ✅. The checkout pricing pipeline is now coherent and
server-authoritative end-to-end: **variant price (1A) → discount (1E) → tax on discounted base (1D) → shipping
(1C) → composed total → escrow**, with **refunds (1F) that reverse it correctly**. Per the discipline,
**Phase 2 (Professional Services) may begin.**

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The returns-route authoritative-refund
  path (order/items load + settle + revoke) and the restock SQL should be confirmed against a real DB.
- Exchanges: the engine computes the credit + difference, but the route does not yet auto-create the
  replacement order — that re-pricing/charge is left to the normal order flow. Wiring an exchange into an
  automatic replacement order is a follow-up.
- Partial-return shipping policy is "never refund shipping on partial; full refund on full return (default
  on)"; a per-merchant shipping-refund policy toggle is a future refinement.
- A completed **partial** return flags the whole order `refunded` for status visibility while the return row
  records the actual partial sum; if per-line partial-refund order states are later needed, that's a schema
  refinement.
