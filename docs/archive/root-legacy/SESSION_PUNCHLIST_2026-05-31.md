# VFIDE — Consolidated Punch-List (session of 2026-05-31)

Everything found across this session, ordered by what YOU need to do. Three buckets:
**FIXED** (drafts applied, need your toolchain to confirm) · **OPEN — your call** (decisions only
you can make) · **VERIFIED CLEAN** (checked, holds up — recorded so it's not re-litigated).

Honest framing: this is a STATIC review. It proves presence/consistency, not absence of bugs.
"Fixed" = reviewed draft on a branch, NOT runtime-verified. The gates (tsc/lint/compile/size/test/
slither) are the discovery mechanism for the next layer and are non-optional.

---

## A. FIXED THIS SESSION (apply on a branch → run gates → confirm)

### Contracts (in `fixed-contracts/` + combined `VFIDE_FIXES.patch`, +101/−11, applies clean)
- **F1** `VFIDETermLoan.sol` — guarantor extraction capped by `principal − amountRepaid` (stops
  lender over-recovery).
- **E1** `VFIDEBridge.sol` — removed the `require` that made the graceful refund branch dead code
  (destination-liquidity shortfall now opens source-chain refund instead of stranding funds).
- **I1** `MerchantPortal.sol` — payment ProofScore rewards volume-gated + self-pay blocked (kills
  dust/wash score-farming). *Adds state → `check_size.cjs` mandatory.*
- **NEW** `SubscriptionManager.sol` — same score-farm class (not in original audit): self-sub
  blocked + volume-gated. *Adds state → `check_size.cjs` mandatory.*
- **G1** `SystemHandover.sol` — permissionless `finalizeHandover` (already in working tree).
- GATES: `npx hardhat compile && node check_size.cjs && npx hardhat test && npm run typecheck:contracts && slither .`

### Frontend (in `page-fixes/`, 12 files, brace-balanced)
- 10 pages: removed dead `useTranslation`/`useLocale` hooks (lint breaks from the i18n port).
- `profile/page.tsx`: rewrote redirect that wrongly called a client hook before `redirect()`.
- `marketplace`, `wallet`, `pay`, `recovery-sign`: removed unused value imports.
- `PayContent.tsx`: removed unused `getScoreTierObject` import.
- GATES: `npx tsc --noEmit && npx next lint`

### API (in `api-fixes/`)
- **Finding A** `merchant/checkout/[id]/route.ts` — added `withRateLimit(req,'read')` to the unauth
  GET (was unthrottled), and `merchant/invoices/route.ts` — invoice-number entropy widened
  `randomBytes(3)`→`randomBytes(12)` (24-bit→96-bit). Closes a customer-PII enumeration path.
  Existing invoice numbers stay valid.

### lib/ (in `lib-fixes/`)
- **DAI address** `crossChain.ts` — fixed corrupted mainnet DAI address (was 40 chars but non-hex:
  `…EescdeCB…` → canonical `…EedeAC495271d0F`). Swept ALL hardcoded addresses; this was the only one.

---

## B. OPEN — YOUR CALL (decisions/judgment I can't make for you)

1. **[HIGH] 4 unauth money-stub API routes** — `social/tips`, `social/content-purchases`,
   `social/content-access`, `messages/tip`. Take `txHash`+money identities from the body, ZERO
   on-chain verification, return success (B1/B2 flaw class). Currently INERT (0 DB writes, 0 callers)
   but deployed + public. **Before testnet: DELETE until the feature is real, OR add `withAuth` +
   on-chain `getTransactionReceipt` verification mirroring the fixed checkout route.** (Deleting also
   resolves their missing-rate-limit + missing-validation.) See `API_ROUTE_GAP_2026-05-31.md`.

2. **[HIGH/complex] H1 — buyer pays the fee (Option A)** — the highest-risk change; NOT auto-applied.
   Spec in `H1_IMPLEMENTATION_SPEC.md`. Spans 3 UI surfaces with DIFFERENT current states:
   (a) `useMerchantHooks.usePayMerchant` (add `maxFee` to intent + EIP-712 typehash in lockstep),
   (b) `checkout/[id]` (copy already buyer-pays; wire computed fee), (c) `PayContent.tsx` (copy is
   merchant-pays — button must charge X+fee or it under-charges). Uses the existing router
   `calculateGrossAmount` view → gross-up at vault layer, never touch `_transfer`. 7-item test
   checklist included. Test-driven, money-moving — do carefully.

3. **[MED] `recovery-challenge/page.tsx` mock data** — renders a hardcoded `VAULT_FAKE` address as
   fallback (file comment: "mock state"/"placeholder") on a fund-critical recovery surface. Wire to
   real vault data OR gate/confirm as an intentional preview before testnet.

4. **[LOW] PayrollManager reward farming** — `payroll_created`(+5)/`payroll_received`(+1) ungated,
   BUT requires locked capital + time-gated accrual (far less farmable than dust). Did NOT auto-fix:
   volume-gating could harm legit small-payroll for unbanked workers. Decide: accept as-is, or add a
   cheap `if (payee == msg.sender) revert` self-deal block (doesn't touch amounts).

---

## C. VERIFIED CLEAN (checked line-by-line — holds up; recorded to avoid re-work)

- **Contracts deep logic:** fee math (BurnRouter — aggregate-first split, underflow-safe redirect
  cascades, F-30 day-rollover), arithmetic (no precision-loss div), `unchecked` blocks (all safe),
  access control (internal msg.sender checks), loan state machine (rigorous guards), reentrancy/CEI
  (PayrollManager withdraw+cancel settle state before transfers), N-C4 fee-scoring not trickable,
  ALL `seer.reward` paths (only I1 + SubscriptionManager were ungated — now fixed).
- **Frontend:** all 142 pages + 525 components — endpoints all exist, handlers wired & honest
  (`payMerchant` awaits receipt before "success"), validation present, edge cases clamped,
  fund-critical flows (guardians/inheritance/vault) well-built w/ full ARIA + strict bps validation.
- **Websocket server:** HS256-pinned JWT w/ revocation (fail-closed in prod), auth-timeout,
  per-address topic isolation, payload caps (8 KiB), Zod validation. No vuln found.
- **RLS/data-access (`lib/db.ts`):** the historical "RLS never activated" gap is FIXED — sets the
  user-address session var per request, resets it in a `finally` before pool return (both paths,
  no async race), `NOBYPASSRLS` enforced.
- **API injection:** dynamic `ORDER BY`/`WHERE`/`SET` all whitelist-driven; values parameterized;
  no `.passthrough()`; no raw-body-spread into inserts (no mass-assignment).
- **API data-leakage:** merchant data routes filter by the VERIFIED auth identity, not client
  params (no horizontal leak); public `users` SELECT excludes `email`; loans/invite/pay-link
  correctly scoped & public-by-design.
- **Input validation:** authed money routes have strong bounds (positive amounts, count/interval
  caps, length-capped strings, email validation). Only the 4 stubs validate nothing.
- **lib/ security:** JWT algorithm-pinned + fail-fast; session keys properly scoped (target+selector
  whitelist, expiry, per-call + cumulative caps, correct calldata-offset amount decode); secure
  randomness used where it matters; no exploitable `Math.random`.

---

## D. RETRACTED (my own false findings — corrected, not left to mislead)
- **"8 unthrottled mutating routes" (Finding B)** — too-narrow grep; `profile`/`avatar`/`report`
  have their own `checkRateLimit`. Only a no-op telemetry sink + the 4 stubs lack throttle. Dissolved.
- **"~11 unused-import / dead-locale" full-scan flags** — type-only imports + `pickLocaleCopy(...)`
  locale usage + a comment-as-import. NOT actioned; verified real-use first.

---

## E. STILL GENUINELY UN-DEEP-READ (NOT a "done" stamp)
- Lower-risk `lib/` helpers (crypto.ts internals, attachments, logger, misc utilities).
- Per-field input-validation *completeness* on every one of the 147 POST bodies (sampled, not 100%).
- The other ~20 unauth GET routes beyond the set checked (sampled the highest-risk).
- **All runtime behavior** — the gates + a real fuzz/integration/load test surface what static
  reading cannot. This is the dominant remaining unknown.

## Bottom line
The CORE security machinery (custody, recovery, fee math, websocket, RLS, JWT, session keys,
injection, auth-binding) holds up under scrutiny. The real, fixable problems cluster at the EDGES:
the unauth API stubs, one weak ID scheme (fixed), one corrupted constant (fixed), and the i18n-port
lint residue (fixed). That is a specific, calibrated state — not "complete," and not "broken."
The next move that actually advances things is running the gates on the fixes and acting on bucket B.
