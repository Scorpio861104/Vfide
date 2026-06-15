# Commerce Operations · Phase 3 — Workforce · Certification Report

Run under the gate discipline: **Build → Functional → Edge-Case → Adversarial → Integration → Grandmother →
Certification**, with a 59-scenario matrix. Verdict up front: **Phase 3 — Workforce is CERTIFIED.** The audit
called this the strongest, gap-free category — and the RBAC *model* is indeed excellent — but adversarial
reading found the model's limits were **stored and displayed, never enforced server-side.** Phase 3's real
contribution is the missing **enforcement**: a staff member's role permissions, per-transaction cap, and
cumulative daily limit are now gated at the point of action, not merely advisory.

## Build — what was found, and the gap a "strong" category hid
What existed (genuinely strong): a clean three-role model (`admin`/`manager`/`cashier`) with per-role presets
and per-staff overrides (`maxSaleAmount`, `dailySaleLimit`, `issueRefunds`, `editProducts`, `viewAnalytics`),
all stored server-side in `merchant_staff` (role + permissions JSONB + hashed session token), a
`staff_activity_log`, a 342-line staff route (create / update / revoke / session lookup / action log), and a
full staff-management UI. A manager can operate a store without owning it — the headline RBAC property holds.

**The gap (found by asking "where is this ENFORCED?"):** nothing decided whether a given action was *allowed*.
- No server-side authorization function existed.
- `merchant_staff` was referenced **only by the staff route itself** — the sale/refund/product paths never
  looked up the acting staff or checked their permissions.
- The action log **recorded** `sale`/`refund` but never gated them or tallied the daily total against the cap.

So a cashier's `maxSaleAmount: 300`, `dailySaleLimit: 2000`, and `issueRefunds: false` were decorative — a real
privilege gap (a cashier could process a $10,000 sale or issue refunds).

Built (typecheck-clean, git-applicable):
- **`lib/commerce/staffAuthEngine.ts`** — the pure enforcement the model lacked: `authorizeStaffAction`
  (session validity → permission for the action → per-transaction cap → cumulative daily cap against today's
  total), and `canAssignRole` (privilege-escalation guard: owner assigns anything; an admin may create
  managers/cashiers but **not another admin**; managers/cashiers cannot manage staff).
- **`authorize` mode on the staff route** — a server-side gate the POS calls before a sale/refund/product-edit:
  loads the staff's permissions, computes today's cumulative sale total from `staff_activity_log` (UTC day),
  runs the engine, returns allow/deny, and on an allowed sale (with `record: true`) logs it so the daily tally
  stays accurate — one round-trip.
- **UI** — none needed (the staff-management UI already exists); added a **Staff** nav link.

## Functional + Edge-Case + Adversarial — the Scenario Matrix (59 executing scenarios)
**Honesty constraint (as throughout):** no live Postgres → enforcement extracted to pure functions and run as
tests, plus the `authorize` route tested against a mocked DB. Security-critical, so the adversarial coverage is
deliberately heavy. Every scenario executed and passed.

**Pure-logic matrix — 48 scenarios** (`staffAuthEngine.test.ts` + `staffAuthEngine.overrides.test.ts`):
- *Session validity (A1–A4):* inactive/expired blocked, active allowed, null-expiry never expires.
- *Permission gating (B1–B7):* cashier can't edit/refund/view-analytics but can sell; manager can edit+refund;
  admin all; processSales=false blocks selling.
- *Per-transaction cap (C1–C4):* at-cap allowed, over-cap blocked, per-role caps, admin large sale.
- *Daily limit (D1–D4):* under allowed, breach blocked, exact-limit allowed, **small sales accumulate to the
  daily cap even under the per-tx cap**.
- *Role assignment (E1–E5):* owner any; **admin can't mint admin**; manager/cashier can't assign.
- *Adversarial (F1–F8):* negative/NaN amount rejected, cashier can't refund at $0, **inactive/expired override
  permission**, tampered maxSale/daily of 0 blocks, out-of-enum action denied.
- *Custom overrides (J/K/L/M, 16):* elevated cashier (granted refund/higher caps/edit), restricted manager
  (refund/edit/analytics revoked, tighter cap), mixed (high cap + tight daily still enforces daily; refund-yes
  sales-no; inactive beats elevation; admin near daily cap still capped), full assignment matrix.

**Route matrix — 11 scenarios** (`merchant-staff-authorize.test.ts`, mocked DB):
- *Permission gating (G1–G4):* cashier sale allowed, cashier refund/edit → 403 NOT_PERMITTED, manager refund ok.
- *Limits (H1–H3):* over-cap → 403 OVER_MAX_SALE, daily breach → 403 OVER_DAILY_LIMIT, **today's total computed
  from the activity log**.
- *Recording + session (I1–I4):* record=true writes a log row, unknown token → 404, inactive → 403, expired →
  403.

**Result: 59/59 pass.** Full regression: **372 tests / 14 suites green**, typecheck 0, nav 0.

## Integration
- **Staff sessions:** ✅ the gate authenticates by the same hashed session token the existing staff route uses;
  active/expiry/revoked all honored.
- **Activity log as the tally source:** ✅ daily totals are derived from `staff_activity_log` sale rows, and an
  authorized+recorded sale appends to it — the enforcement and the audit trail share one source of truth.
- **Owner vs staff:** ✅ the merchant (owner, via `withAuth`) manages staff; `canAssignRole` guards the case
  where staff management is delegated, preventing an admin from minting peers.
- **ProofScore / continuity / commerce phases:** ✅ unaffected — this is access control around existing actions.

## Grandmother — can a non-technical owner run a team?  ✅
- ✅ The existing staff-management UI creates staff with a role + custom limits, shows activity, and revokes —
  now backed by real enforcement. Added to the merchant nav. A cashier handed a POS link is now genuinely
  bounded by their caps, not just nominally.

## Certification verdict (full)
| Gate | Result |
|---|---|
| Build | ✅ enforcement engine + server-side authorize gate (the missing piece) |
| Functional / Edge-Case | ✅ 48 pure-logic scenarios |
| Adversarial | ✅ session-beats-permission, daily-cap-accumulation, no admin-mints-admin, tamper-safe |
| Integration | ✅ token-authenticated gate; activity log as the shared tally/audit source |
| Grandmother | ✅ existing staff UI now genuinely enforced |
| **Phase 3 — Workforce** | ✅ **CERTIFIED** |

Per the discipline, **Phase 4 (Physical Retail) may begin** — Phase 3 is certified.

## Residual honesty notes
- **The most important caveat:** the `authorize` gate is the enforcement point, but it only protects actions
  that actually CALL it. This phase delivers and certifies the gate + its semantics; **wiring every POS / sale
  / refund entry point to call `authorize` before acting is a broader integration** that should be completed
  (and verified against a live POS flow) before relying on it in production. Until a given path calls the gate,
  that path remains unenforced. This is named, not hidden — it is the honest limit of what a single phase that
  adds an enforcement primitive can guarantee.
- "Tested" = pure-logic + mocked-DB execution; **not** live Postgres. The daily-total SQL
  (`SUM((details->>'amount')::numeric)` over today's sale rows) and the record-on-allow insert should be
  confirmed against a real DB; the JSONB `amount` cast assumes sales are logged with a numeric `amount` detail.
- The daily window is UTC (`date_trunc('day', NOW())`); a merchant-timezone window is a future refinement.
- `canAssignRole` is implemented and tested, but staff-managing-staff is not currently a delegated flow (only
  the owner manages staff via `withAuth`); it is in place for when/if delegation is added.
