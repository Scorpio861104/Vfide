# Commerce Operations · Phase 4 — Physical Retail · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 50-scenario matrix. Verdict up front: **Phase 4 — Physical Retail is FULLY CERTIFIED —
no external boundary.** This was the **weakest category in the master audit** (`pos/charge` was a 72-line
payment-intent stub), so unlike the other phases this one was a genuine BUILD, not a composition of something
already mostly there. It is also the phase where two earlier commitments finally land in one real code path:
the **Phase 1 pricing pipeline** and the **Phase 3 staff-authorization gate** are both wired into the POS sale.

## Build — what was found, what was built
The audit was right: `app/api/pos/charge/route.ts` validated an amount and returned a `pending` charge intent
and **did nothing else** — no order, no items, no inventory, no pricing, no staff check, no location, no
receipt. There was a basic `merchant_locations` table + a CRUD locations route, but **no per-location
inventory, no register/cash-drawer concept, and no real sale path.**

Built (typecheck-clean, git-applicable):
- **`lib/commerce/posEngine.ts`** — the pure money/inventory/session math: `expectedDrawer` + `reconcileDrawer`
  (over/short), `canRegisterAct` (open/record/close lifecycle), `availableAt` + `canFulfillAtLocation`
  (per-location stock), `computeTransfer` (unit-conserving cross-location move), `buildReceipt` (total taken
  FROM the Phase 1 composed order — POS never reprices), `tenderSufficient`.
- **Migration `20260612_210000`** — `location_inventory` (per-location stock), `register_sessions` (float →
  movements → close reconciliation), `register_movements` (cash-drawer ledger), and POS columns on
  `merchant_orders` (`channel`, `location_id`, `register_session_id`, `sold_by_staff_id`).
- **`app/api/merchant/registers/route.ts`** — open/close registers (close reconciles cash and stores
  expected/counted/variance), set per-location stock, and **transfer stock between locations** (atomic,
  FOR UPDATE, unit-conserving).
- **`app/api/pos/sale/route.ts`** — the real POS sale, the heart of this phase, composing the whole stack into
  one authoritative path (see Integration).
- **UI** — `app/merchant/pos/page.tsx`: a register screen (open with a float, ring up sales, close + count) for
  a non-technical operator. Linked in the nav.

## The cross-phase wiring (the point of this phase)
A POS sale is an in-person ORDER, and the sale route runs the full sequence:
1. **Authoritative catalog pricing (Phase 1A):** unit prices come from `merchant_products`, never the client —
   a POS line cannot inject its own price (the schema has no client unit_price; a test proves an injected
   `unit_price: 0.01` is ignored).
2. **Tax + composition (Phase 1D/1E):** tax computed on the base, then `composePrice` produces the total; the
   receipt total equals the composed total.
3. **Staff authorization (Phase 3) — the gate-ubiquity wiring:** if a cashier (not the owner) rings the sale,
   the route calls `authorizeStaffAction` with the composed total. A cashier **over their per-transaction cap,
   over their daily limit, or without sale permission is DENIED at the POS** — proven by scenarios J2/J3/J4.
   This is exactly the integration Phase 3 flagged as "not yet wired everywhere"; Phase 4 wires it into a real
   sale path and records the sale in `staff_activity_log` so the daily tally stays accurate.
4. **Location inventory (Phase 4):** the sale checks and decrements that location's stock atomically
   (FOR UPDATE); an insufficient-stock sale is rejected (409) before any order is written.
5. **Order + drawer + receipt:** the order is created (`channel='pos'`, location, register, staff), the
   cash-drawer movement is recorded against the open register, and a receipt is returned.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (50 executing scenarios)
**Honesty constraint (as throughout):** no live Postgres → the cash/inventory/receipt math is pure functions
run as tests; the sale + register routes are tested against a mocked DB. Every scenario executed and passed
(after one fix — to a TEST, not the code; see below).

**Pure-logic matrix — 34 scenarios** (`__tests__/commerce/posEngine.test.ts`):
- *Expected drawer (A1–A5)*; *reconciliation over/short (B1–B4)*; *register lifecycle (C1–C3)*.
- *Location stock (D1–D3); fulfillment + shortfall (E1–E4); transfers conserve units (F1–F5).*
- *Receipts: line totals, cash change, exact tender, and **receipt total == composed total** (G1–G4).*
- *Adversarial (H1–H6):* cash tender below total insufficient, card/wallet exact, **change never negative**,
  negative float floored, **short drawer flagged not absorbed**.

**Route matrix — 16 scenarios** (`__tests__/api/pos-sale.test.ts`, mocked DB):
- *Owner sale (I1–I6):* prices+decrements+receipt, **server price wins over injected unit_price**, insufficient
  location stock→409, insufficient cash→400, foreign product→400, unknown location→404.
- *STAFF GATE (J1–J5):* within-caps allowed, **over-per-tx-cap denied**, **over-daily-limit denied**,
  **no-sale-permission denied**, unknown/foreign token→404.
- *Registers (K1–K5):* open, no-second-open-per-location, **close reconciles (short flagged)**, transfer
  conserves units, same-location transfer→400.

**Result: 50/50 pass.** Full regression: **461 tests / 19 suites green**, typecheck 0, nav 0.

### The one fix this turn
A route test (I3) initially expected 409 for an out-of-stock sale but got 400 — because the cash-tender check
correctly fires before the inventory transaction, and the test under-tendered. Fixed the TEST (tender enough to
reach the inventory check); the route ordering (validate tender → then touch inventory) is correct. No code bug.

## Integration
- **Pricing pipeline:** ✅ POS reuses `composePrice` + `computeTax`; no parallel pricing logic.
- **Staff gate:** ✅ the Phase 3 enforcement engine now guards a real sale path (the headline integration).
- **Inventory:** ✅ per-location stock is decremented atomically; cross-location transfers conserve units.
- **Cash integrity:** ✅ every cash movement is ledgered against the register; close-out reconciles and flags
  over/short rather than silently absorbing a discrepancy.
- **Escrow / online orders:** ✅ a POS order is a `merchant_orders` row like any other (cash → paid; card/wallet
  → pending for the existing payment-confirmation flow), so refunds/returns (1F) and reporting see it uniformly.

## Grandmother — can a non-technical shop operator run a till?  ✅
- ✅ `app/merchant/pos`: pick a location, open the drawer with a float, tap products into a sale, take cash, and
  close + count at end of shift (with the over/short result shown). Linked in the merchant nav.

## Certification verdict (full)
| Gate | Result |
|---|---|
| Build | ✅ POS engine + sale route + registers + location inventory + UI (real, replacing the stub) |
| Functional / Edge-Case | ✅ 34 pure-logic scenarios |
| Adversarial | ✅ price-injection blocked, over-cap/over-daily/no-permission denied, short drawer flagged |
| Integration | ✅ Phase 1 pricing + Phase 3 staff gate + location inventory in one authoritative path |
| Grandmother | ✅ register/POS screen for a non-technical operator |
| **Phase 4 — Physical Retail** | ✅ **FULLY CERTIFIED (no external boundary)** |

Per the discipline, **Phase 5 (Marketplace Discovery) may begin** — Phase 4 is fully certified.

## Residual honesty notes
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The sale transaction (location-stock
  FOR UPDATE + decrement + order insert + drawer movement + staff-log) and the register SQL should be confirmed
  against a real DB.
- **In-store tax uses the merchant default rate** (no shipping address at the counter); a location-specific tax
  jurisdiction (per-store rate) is a refinement — the engine supports it, the POS route passes an empty address
  and falls back to the default.
- **POS discounts are not in this slice** — a sale composes at full price + tax. Wiring coupon/bundle discounts
  into the POS (they exist for online from 1E) is a follow-up.
- Card/wallet POS sales are created `pending` and rely on the existing payment-confirmation flow to settle;
  this phase records the intent + drawer (for cash) but does not itself confirm card settlement.
- Staff authorization at POS covers the `sale` action; a parallel **refund-at-POS** path (and refund-at-a-
  different-location) should likewise call the gate (`issueRefunds`) and reverse location stock — noted as the
  natural next increment, not built here.
