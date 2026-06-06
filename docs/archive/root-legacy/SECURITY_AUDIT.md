# VFIDE — Security Audit & Code Review

**Audit date:** 2026-05-31
**Scope:** Full-stack static review — Solidity contracts, Next.js frontend (142 pages / 525
components), 147 API routes, WebSocket server, and the `lib/` security layer.
**Method:** Line-by-line static analysis + targeted pattern sweeps. This is a STATIC review: it
establishes the presence and internal consistency of controls, not the *absence* of all bugs.
Runtime verification (compile / type-check / contract-size / tests / Slither / fuzzing) is required
and is **not** a substitute step — it is the discovery mechanism for the next layer of issues.

> **Status legend:** 🔴 Open (action required) · 🟢 Fixed (reviewed draft — must pass gates) ·
> ✅ Verified clean · ↩️ Retracted (false finding, corrected)

---

## Executive Summary

The security-critical machinery of VFIDE — token custody, vault recovery, inheritance, fee math,
JWT auth, session keys, row-level security, encryption, webhooks, and the WebSocket server — is
**competently engineered and holds up under line-by-line scrutiny, including subtle attack cases**
(JWT algorithm-confusion, GCM IV reuse, webhook DNS-rebinding, SSRF redirect-following, CSRF timing
oracles, SIWE replay). The genuine, fixable issues cluster at the **edges**: a small set of
unauthenticated API stubs, one weak identifier scheme, one corrupted address constant, an economic
score-farming vector, and lint residue from a refactor.

| Severity | Count | Status |
|---|---|---|
| High (econ/architecture) | 1 | 🟢 Fixed (drafts) |
| High (unauth API liability) | 1 (4 routes) | 🔴 Open — decision required |
| Medium | 3 | 2 🟢 Fixed, 1 🔴 Open |
| Low | 2 | 1 🟢 Fixed, 1 🔴 Open (your call) |
| Complex feature (H1) | 1 | 🔴 Spec — implement carefully |
| Verified-clean areas | many | ✅ |
| Retracted (own false findings) | 2 | ↩️ |

---

## 1. Smart Contracts

### 1.1 🟢 F1 — Guarantor over-extraction (Medium) — `VFIDETermLoan.sol`
`extractFromGuarantors` capped each guarantor at their full-principal liability share without
subtracting `amountRepaid`, letting a lender keep the borrower's partial repayments **and** extract
full principal from guarantors (over-recovery).
**Fix:** cap aggregate guarantor extraction at `principal − amountRepaid`, re-split per guarantor.
Mirrors the outstanding-debt cap `repayDefaultedLoan` already uses. No interface change.

### 1.2 🟢 E1 — Bridge auto-refund dead code (Medium) — `VFIDEBridge.sol`
A `require(availableLiquidity_ >= amount)` sat directly above the graceful-refund branch, making it
unreachable; a destination-liquidity shortfall reverted instead of opening the source-chain refund
window, risking stranded user funds.
**Fix:** removed the `require`; shortfall now falls through to notify-source + emit + return.

### 1.3 🟢 I1 — ProofScore farmable via dust payments (Medium) — `MerchantPortal.sol`
`_rewardPaymentParticipants` granted fixed +3 merchant / +1 customer on **every** payment with no
minimum and no self-pay block — two controlled addresses could wash dust to farm the score that
drives both fee rate and governance weight.
**Fix:** volume-gate rewards (`PAYMENT_VOLUME_PER_REWARD = 10_000e18`, per-party accumulators) and
block `customer == merchant`. ⚠️ Adds state → **`check_size.cjs` (EIP-170) mandatory.**

### 1.4 🟢 NEW — Subscription score-farm (Medium, not in prior audit) — `SubscriptionManager.sol`
Same class as I1: `processPayment` granted +2/+3 per charge with no minimum and no self-sub block
(1-hour interval floor only) → a self-dealing pair could farm ~+120/day.
**Fix:** block `merchant == msg.sender` at creation + volume-gate
(`SUBSCRIPTION_VOLUME_PER_REWARD`, per-party accumulators). ⚠️ Adds state → **`check_size.cjs`.**

### 1.5 🟢 G1 — Handover not trustlessly enforced (High/architecture) — `SystemHandover.sol`
The 6-month deployer-key burn could stall if not manually executed.
**Fix (already in working tree):** permissionless `finalizeHandover()` / `_doExecuteHandover()` —
anyone can finalize after the deadline.

### 1.6 🔴 H1 — Buyer pays the fee (Option A) (High/complex) — SPEC, not auto-applied
Decision: merchant nets full invoice `amount`; buyer bears the fee. This is the **highest-risk**
change (token fee accounting + vault + EIP-712 + frontend) and is delivered as a step-by-step spec.
Key enabler: the router already exposes `calculateGrossAmount(from,to,desiredNet)` (public view) →
**gross-up at the vault layer; never touch `_transfer`.** Spans 3 UI surfaces (see §3.4). Includes a
7-item test checklist. **Implement test-driven.**

### 1.7 🔴 PayrollManager reward farming (Low) — `PayrollManager.sol` — YOUR CALL
`payroll_created`(+5)/`payroll_received`(+1) ungated, but requires locked capital + time-gated
accrual (far less farmable than dust). **Not auto-fixed** — volume-gating could harm legitimate
small-payroll for unbanked workers. Optional cheap mitigation: `if (payee == msg.sender) revert`.

### 1.8 ✅ Contracts — verified clean (deep logic sweep)
Fee math (`ProofScoreBurnRouter.computeFees`: aggregate-first split, underflow-safe redirect
cascades, F-30 day-rollover); no precision-loss division; all `unchecked` blocks safe; access
control (internal `msg.sender` checks); loan state machine (rigorous state guards on accept/
installment/default); reentrancy/CEI (PayrollManager withdraw + cancel settle state before
transfers); N-C4 fee-scoring resolution not trickable; **every** `seer.reward` path audited (only
I1 + 1.4 were ungated — now fixed; FlashLoan/TermLoan/MainstreamPayments already safe).

**Contract gates (required before deploy):**
`npx hardhat compile && node check_size.cjs && npx hardhat test && npm run typecheck:contracts && slither .`

---

## 2. API Routes (147 total)

### 2.1 🔴 Unauthenticated money/content stubs (High) — DELETE or SECURE before testnet
`app/api/social/tips`, `social/content-purchases`, `social/content-access`, `messages/tip`.
Accept money identities + `txHash` from the request body, perform **zero on-chain verification**,
and return `success` — the same flaw class as the (fixed) checkout B1 bug. **Currently inert**
(0 DB writes, 0 frontend callers) but deployed and public.
**Remediation:** delete until the feature is real, OR add `withAuth` + on-chain
`getTransactionReceipt` verification mirroring `merchant/checkout/[id]`. (Deletion also resolves
their missing rate-limit and missing input-validation.)

### 2.2 🟢 Customer-PII enumeration via weak invoice IDs (Medium) — FIXED
`merchant/checkout/[id]` GET returns `customer_name` + `customer_address`, is unauthenticated
(customer-facing checkout), and was **unthrottled**. Invoice numbers were `INV-YYYYMM-` +
`randomBytes(3)` = **24 bits** within a known month prefix → enumerable → PII harvesting.
**Fix:** (a) `withRateLimit(req,'read')` on the GET; (b) invoice suffix widened to `randomBytes(12)`
(96-bit). Existing invoice numbers remain valid. (Payment *links* already used 128-bit IDs.)

### 2.3 ✅ Injection — verified clean
No string-interpolated/concatenated SQL across 147 routes. Dynamic `ORDER BY` is whitelist-driven
(ternary/switch → hardcoded columns); `WHERE`/`SET` builders use `$N` placeholders with values in
the params array; `LIMIT`/`OFFSET` clamped then parameterized. No `.passthrough()`, no raw-body
spread into inserts → **no mass-assignment.**

### 2.4 ✅ Horizontal data-leakage — verified clean
Merchant data routes (`orders`, `customers`, `invoices`, `expenses`) filter by the **verified auth
identity** (`authAddress` from the JWT via `withAuth`), not client-supplied addresses — even where a
`merchant_address` field exists in the schema. Public `users` search returns only public columns
(`email` is **excluded**). `loans` (marketplace listing), `users/invite` (code validation),
`pay/link/[id]` (128-bit IDs, public-read RLS) correctly scoped / public-by-design.

### 2.5 ✅ Input validation — verified clean (authed paths)
Authenticated money routes have strong bounds: positive amounts, `installmentCount.max(120)`,
`intervalDays.max(365)`, expenses `.max(1_000_000_000)`, length-capped strings, `email()`
validation. Default zod `.object()` strips unknown keys. Only the §2.1 stubs validate nothing.

---

## 3. Frontend (142 pages / 525 components)

### 3.1 🟢 Dead i18n hooks from the locale refactor (lint) — FIXED (10 pages)
`vault, pay, proofscore, marketplace, profile, rewards, escrow, remittance, leaderboard,
security-center` each destructured `const { t } = useTranslation()` / `const [locale] = useLocale()`
with zero uses (would fail `no-unused-vars`). Removed dead hooks + orphaned imports.

### 3.2 🟢 `profile/page.tsx` redirect bug — FIXED
A redirect stub called a **client hook** (`useTranslation`) before `redirect('/me')`, with no
`'use client'`. Rewrote as a clean server redirect.

### 3.3 🟢 Unused value imports (lint) — FIXED
`marketplace` (framer `m`/`LazyMotion`/`domAnimation` + icons `Store`/`ArrowRight`/`Sparkles`),
`wallet` (`Coins`/`Globe`), `recovery-sign` (`XCircle`/`Users`/`Clock`/`Unlock`),
`pay/components/PayContent.tsx` (`getScoreTierObject`). Leftovers from component decomposition.

### 3.4 🔴 H1 spans three UI surfaces with DIFFERENT states — for the H1 implementation
1. `hooks/useMerchantHooks.usePayMerchant` — add `maxFee` to the intent + EIP-712 typehash (lockstep).
2. `app/checkout/[id]/page.tsx` — copy already says buyer-pays; wire the computed fee values.
3. `app/pay/components/PayContent.tsx` — copy is **merchant-pays**; the button must charge `X + fee`
   or it will under-charge the buyer / short the merchant.

### 3.5 🔴 `recovery-challenge/page.tsx` mock data (Medium) — YOUR CALL
Renders a hardcoded `VAULT_FAKE` address as fallback (file comments: "mock state"/"placeholder") on
a fund-critical recovery surface. **Wire to real vault data or gate/confirm as preview before testnet.**

### 3.6 ✅ Frontend — verified clean (both axes)
All 142 pages + 525 components: every `/api/*` endpoint the frontend calls **exists** (Merchant OS
19, community 2, checkout, profile, …); forms wired; **zero** dead links / `href="#"` / TODO / alert
/ empty `onClick`. Handlers are honest (`payMerchant` awaits `waitForTransactionReceipt` before
showing success). Fund-critical flows (guardians, 6 inheritance pages, 7 vault sub-pages) well-built
with full ARIA + strict basis-point validation (`== 10000`) + connect-gates + commitment hashes
matching contracts. `ProofScoreRing` clamps score math.

**Frontend gates:** `npx tsc --noEmit && npx next lint`

---

## 4. WebSocket Server — ✅ Verified clean
`websocket-server/src/` (index 906L, auth 156L, schema 92L, rateLimit 124L). Defenses confirmed:
- **Auth:** JWT pinned to **HS256** (algorithm-confusion defense), issuer/audience enforced, secret
  rotation, token + per-user revocation via Upstash Redis, **fails closed in production.**
- **Unauth window:** `authTimeoutTimer` force-closes never-authenticated sockets; dispatch gate
  rejects any non-`auth` message from an unauthenticated client (`AUTH_REQUIRED`).
- **Topic isolation:** subscription requires topic subject == client's own lowercased address (no
  cross-user leak); DM topics require caller ∈ the two sorted parties.
- **DoS:** origin allowlist, per-IP connection rate limit (10/window), `MAX_TOPICS_PER_CLIENT` cap,
  8 KiB payload cap (server + length check), Zod validation strips unknown fields, bounded topic
  schema (≤64 chars, charset-restricted), string values ≤4096.

---

## 5. `lib/` Security Layer

### 5.1 🟢 Corrupted DAI mainnet address (correctness) — FIXED — `lib/crossChain.ts`
DAI was `0x6B175474E89094C44Da98b954EescdeCB5BE3830` — 40 chars but **non-hex** (`…EescdeCB…`), an
invalid address fed by-address into Li.Fi route requests. **Fixed** to canonical
`0x6B175474E89094C44Da98b954EedeAC495271d0F`. **Swept all hardcoded addresses repo-wide — this was
the only corrupted one.**

### 5.2 ✅ JWT (`lib/auth/jwt.ts`)
Algorithm **pinned to HS256 on both sign and verify** (F-BE-004), issuer/audience enforced, expiry
set, **no fallback secret** (fail-fast), guards conflicting JWT_SECRET/NEXTAUTH_SECRET (F-10),
zero-downtime rotation via PREV_JWT_SECRET. Foundation for all API + WS auth — correct.

### 5.3 ✅ Session keys (`lib/sessionKeys/sessionKeyService.ts`)
Highest-risk module (delegated signing) is properly bounded. `validateCall` enforces: exists →
active → `validFrom` → `validUntil` (expiry) → permission matching **both** target contract AND
selector → per-call value cap → cumulative value cap → per-call token-amount cap → cumulative
token-amount cap. Amount decode reads the **correct calldata offset per selector** (transfer/approve
+64; transferFrom/permit +128 — the subtle case, correct) with hex+length validation. Session-scoped
storage; min/max duration bounds.

### 5.4 ✅ Encryption (`lib/crypto/invoiceEncryption.ts`)
Textbook envelope encryption: **AES-256-GCM** (authenticated), fresh random 12-byte IV per
encryption, **unique per-invoice DEK** (IV reuse structurally impossible), DEK wrapped by KMS-managed
KEK, `getAuthTag`/`setAuthTag` used, `createCipheriv` (not deprecated `createCipher`).

### 5.5 ✅ Webhook dispatcher (`lib/webhooks/merchantWebhookDispatcher.ts`) — SSRF-hardened
HTTPS-only; blocks localhost/`.local`; **resolves hostname and checks the RESOLVED IP** against
private/loopback ranges incl. IPv4-mapped-IPv6 (`::ffff:127.`/`::ffff:10.`). **DNS-rebinding closed**
(rewrites request host to validated IP + pins Undici `Agent` with correct TLS servername + Host
header). **Redirect-SSRF closed** (`redirect: 'manual'`). AbortController timeout; HMAC-signed
payload w/ timestamp. Both basic and advanced bypasses handled.

### 5.6 ✅ RLS / data-access (`lib/db.ts`)
The historical "RLS enabled but never activated" gap is **fixed**: sets `app.current_user_address`
per request (from JWT via AsyncLocalStorage), and **resets it in a `finally`** before returning the
client to the pool — on both `query()` and `getClient()` paths, with no async race. `NOBYPASSRLS`
enforcement check before accepting production queries.

### 5.7 ✅ CSRF / SVG-sanitize / SIWE
- `security/csrf.ts` — `crypto.getRandomValues` tokens; **constant-time comparison** (XOR-accum +
  length pre-check; edge-runtime compatible).
- `profile/svg-sanitize.ts` — DOMPurify, deny-by-default tag/attr allowlists, requires `<svg>` root,
  defends script/foreignObject/`javascript:`.
- `security/siweChallenge.ts` — 16-byte random nonce; Redis `getdel` **atomic single-use**; fails
  closed in production.

### 5.8 ✅ Insecure randomness sweep
Security-sensitive IDs use crypto (`randomBytes`/`secureRandom`/`randomUUID`): invoices, payment
links, orders, staff, digital goods, coupons, session keys, webhooks, step-up challenges, invoice
encryption. All `Math.random()` uses are **non-authorizing** (telemetry IDs, reconnect jitter [where
correct], local labels). No exploitable randomness.

---

## 6. ↩️ Retracted findings (own false positives — corrected, not left to mislead)
- **"8 unthrottled mutating routes"** — too-narrow grep (only matched `withRateLimit`).
  `profile`/`avatar`/`report` have their own `checkRateLimit(ip)` + size caps. Only a no-op
  telemetry sink + the §2.1 stubs lack throttle. **Dissolved.**
- **"~11 unused-import / dead-locale" full-scan flags** — TypeScript `type`-only imports +
  `pickLocaleCopy(X, locale)` usage + a comment mis-parsed as imports. **Not actioned;** real-use
  verified first.

> **Methodology note:** detection heuristics over-flag; every finding here was confirmed against the
> actual code before being treated as real, and wrong findings were retracted rather than left
> standing. This applies symmetrically to confidence: areas marked ✅ were read, not assumed.

---

## 7. Scope & Remaining Work (NOT a completeness claim)

**Covered:** all contracts (deep logic), all 142 pages + 525 components, API auth/injection/leakage/
validation/rate-limit, the WebSocket server, and the security-critical `lib/` modules (jwt,
sessionKeys, db/RLS, invoiceEncryption, webhooks, csrf, svg-sanitize, siweChallenge, randomness,
address constants).

**Not exhaustively covered (honest gaps):**
- ~150 non-security `lib/` utilities (format, animation, device, SEO, UX, storage wrappers, hooks) —
  issues there would be correctness/UX, not vulnerabilities.
- Per-field input-validation *completeness* on all 147 POST bodies (sampled, not 100%).
- The ~20 unauth GET routes beyond the highest-risk set checked.
- **All runtime behavior** — gates (tsc/lint/compile/size/test/Slither) + fuzz/integration/load.
  This is the dominant remaining unknown and the necessary next step.

---

## 8. Action Checklist

**Before testnet:**
- [ ] Run frontend gates: `npx tsc --noEmit && npx next lint` (validates §3 fixes)
- [ ] Run contract gates: `compile && check_size.cjs && test && typecheck:contracts && slither`
      (validates §1 fixes; §1.3 + §1.4 added state → size check is mandatory)
- [ ] §2.1 — delete or secure the 4 unauth money-stub routes
- [ ] §3.5 — wire or gate `recovery-challenge` mock data
- [ ] Confirm §2.2 + §5.1 fixes pass the gates
- [ ] Decide §1.7 (PayrollManager self-deal block)

**Before mainnet (real value):**
- [ ] Implement §1.6 / §3.4 (H1) test-driven, per `H1_IMPLEMENTATION_SPEC.md`
- [ ] Professional third-party audit (grant-funded path)
- [ ] Fuzz/integration/load testing

---

*Static review by an automated assistant. Reviewed drafts ("Fixed") require validation via the
project's toolchain before deployment. Supporting detail in the companion documents:
`H1_IMPLEMENTATION_SPEC.md`, `API_ROUTE_GAP_2026-05-31.md`,
`DATA_LEAKAGE_AND_RATELIMIT_2026-05-31.md`, `OVERLOOKED_LAYERS_AUDIT_2026-05-31.md`,
`LIB_LAYER_AUDIT_2026-05-31.md`, `DEEP_LOGIC_SWEEP_AND_PATCH_2026-05-31.md`,
`PAGE_BY_PAGE_TRACKER.md`, `SESSION_PUNCHLIST_2026-05-31.md`.*
