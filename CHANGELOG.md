# Changelog

## 2026-05-12 (later) — Round 3 fixes (deeper audit, lib/ layer)

After Round 2, ran the scanners again to catch anything missed. Three
more issues surfaced — all real, all now fixed.

### Tax report was localStorage-only (most dangerous finding of this round)

`/taxes` and `/budgets` both load from `useFinancialIntelligence` in
`lib/financialIntelligence.ts`. That hook was reading transactions from
`localStorage[vfide-tx-${address}]` only — never the server. A user
with a wallet they've used on multiple devices would see an *incomplete*
tax report from whichever browser they happened to be in. The code had
a comment "In production, fetch from API/indexer" that was never acted on.

Fix: `useFinancialIntelligence` now fetches from
`/api/crypto/transactions/[address]` first (the existing endpoint accepts
either a numeric userId or a wallet address with proper auth), with
localStorage as offline cache only. Adapter maps the flat API row shape
(user_address, from_address, to_address, token_amount, currency,
message, tx_hash, created_at) into the UI's Transaction type.

Additionally, added an explicit "not tax advice" disclaimer at the top
of `/taxes` covering off-platform activity, other chains, cost-basis
adjustments, and jurisdiction-specific rules. Added a "saved on this
device only" banner at the top of `/budgets` because budgets remain
client-side (no API yet) and users need to know they won't sync.

### Dead CommandBar with fake "execute transactions" loop

`components/CommandBar.tsx` was a natural-language + voice command bar
that, on user input like "Send 100 VFIDE to alice.eth", would:
- Parse via `lib/naturalLanguage.ts`
- Iterate over a fake execution plan
- Show `toast.info('Executing: ...')` for each step
- `await new Promise(r => setTimeout(r, 1000))` — **just sleeping**
- Show `toast.success('All actions completed')`
- Comment said "In production, this would actually execute the transactions"

It would have completely deceived a voice user about sending money. But
nothing mounted CommandBar — it was 378 lines of dead UI plus its
naturalLanguage and voiceCommands dependencies. Deleted all three:
`components/CommandBar.tsx`, `lib/naturalLanguage.ts`, `lib/voiceCommands.ts`.

### Type-check status

`npx tsc --noEmit -p tsconfig.json` passes with zero errors across the
full codebase after all three rounds of changes.

## 2026-05-12 — Frontend Audit Round 2 (Pretend-Features Removal)

Did a deep audit of the frontend after the merchant-OS round. Goal:
find UIs that pretend to work but actually don't, and either make them
honest or wire them to real backends.

### Severity-1 fixes (fake "success" UI replaced with honest coming-soon)

These pages used to show success toasts and decorative buttons with no
onClick handlers. A user could "create a stream" or "add a signer" and
believe they did something real when nothing on-chain or server-side
happened. Replaced with explicit `ComingSoonPage` explaining what the
feature does, what's needed to ship it, and pointing to the closest
real alternative today.

| Page | Was | Now |
|------|-----|-----|
| `/streaming` | "Stream created successfully" toast on client-only `setStreams([newStream])` | Honest description of payment streaming; points to `/merchant/subscriptions` |
| `/multisig` | Hardcoded `required=0`, "Add Signer" / "Approve" buttons with no handlers | Explains M-of-N multisig; points to `/guardians` for today's protection |
| `/time-locks` | `setTimeLocks([])` and buttons with no handlers | Explains tiered transaction delays; points to `/vault` withdrawal queue |
| `/reporting` | 457-line `useReportingAnalytics` hook that wrote "scheduled reports" to localStorage | Points to `/merchant/analytics` for the real, merchant-scoped version |
| `/agent` | localStorage-only audit log for cash-handling agents (dangerous — agents handle real money) | Coming-soon with requirements (server audit log, KYC, regulatory review) |

### Severity-2 fixes (localStorage masquerading as backend → wired to real APIs)

| Hook / Page | Was | Now |
|------|-----|-----|
| `useNotificationHub` / `/notifications` | 400 lines of localStorage state; real `/api/notifications` endpoint existed but was never called | Rewrote to use API as source of truth, with per-wallet localStorage cache for offline. Adapter maps API shape → UI Notification type. Mutations (markAsRead, markAllAsRead) hit the API with optimistic local update and revert-on-failure |
| `useThreatDetection` / `/security-center` | Three "checks" — `checkUnusualLocation()` always returned `false`, `checkSuspiciousIp()` always returned `false`, only `checkUnusualDevice()` was real. The hook emitted "Your account security looks good" recommendations from sources it never actually consulted | Removed the lying stubs. Kept the real device-fingerprint comparison and client-side rate limiting. Risk score now reflects only the signals we actually have. `detectAnomalies()` is explicit that "server-side signals (IP reputation, geographic anomalies, cross-session brute-force tracking) are not yet wired up" |
| `/price-alerts/ActiveTab` | Fetched price once on mount and never again. Had `Bell` icons but never called `Notification(...)`. localStorage with no disclosure | Polls `/api/crypto/price` every 30s. Fires Web Notifications when thresholds trigger (with permission request UI). Throttles re-fires (30 min per alert). Explicit banner that alerts are local-only and only fire while a tab is open. Permission state UI |

### Severity-3 fixes (fake data labeled as real)

| File | Was | Now |
|------|-----|-----|
| `app/governance/components/HistoryTab.tsx` | 8 hardcoded fake votes in user's "Your Voting History" | Real implementation reading `Voted(uint256, address, bool)` events from DAO contract via `publicClient.getLogs`, filtered by connected wallet, enriched with `getProposalDetails` for proposal title + final status. Proper empty/loading/error/not-deployed states |
| `app/council/components/SalaryTab.tsx` | One placeholder period row, no disclosure | Added `SampleDataBanner` |
| `app/dashboard/components/ScoreSimulatorTab.tsx` | Made-up scoring formula `transactions * 50 + governanceVotes * 100 + ...` that bore no relation to the actual Seer contract | Rewrote against real Seer constants (max 100/call, 200/day per operator pair, 300/day total, 100/month decay toward NEUTRAL=5000). 5 activity-level scenarios over 1-24 months. Trajectory sparkline. Explicit "how scoring actually works" disclosure box |

### Dead code removed

- `components/dashboard/VFIDEDashboard.tsx` — 9.8KB, never rendered anywhere
- `components/dashboard/VFIDEDashboardSections.tsx` — had `MOCK_SCORE = 7420`, `MOCK_BALANCE = "12,847.32"`, `MOCK_ADDRESS`. Was only imported by VFIDEDashboard. Both deleted together
- `components/dashboard/index.ts` — barrel cleaned, removed broken exports
- `hooks/useTwoFactorAuth.ts` — 319 lines, zero callsites. `TwoFactorSetup` component is correctly gated as "coming soon" so the hook had nothing to power

### New reusable component

`components/feedback/ComingSoonPage.tsx` — used by all 5 honest-replacement pages. Has slots for: title, tagline, description of what the feature would do, requirements list of what's needed to ship it, and an optional "use this instead today" link to the closest real feature.

### Type-check status

After all changes: `npx tsc --noEmit -p tsconfig.json` passes cleanly with zero errors across the entire codebase. The Seer-contract event signature in HistoryTab matches the contract's `event Voted(uint256 id, address voter, bool support)` declaration (DAO.sol:44).

### What's still pending

These were flagged in the audit but left as-is intentionally:

- `/social-payments` & the 5 broken `/api/social/*` endpoints — page already says "Live tip history is not available yet"; consistent self-disclosure, no user-facing lie. Build the feature when there's appetite, or remove the page.
- `/api/admin/metrics/dashboard` — silently fails; admin tooling, no end-user impact.
- `/api/crypto/ens/[address]` — silently falls back to raw address. Cosmetic only.
- Embedded wallet stub (`lib/wallet/VFIDEWalletProvider.tsx`) — throws by design until Privy/Web3Auth/Magic SDK installation decision is made. Properly self-disclosed.
- `components/security/TwoFactorSetup.tsx` — explicit "2FA not in this release" UI. Correct as-is.

## 2026-05-11 (night, part 2) — Merchant OS + Broken API Endpoint Audit

User pushed back: "things are still not finished." Right. Did a proper
systematic feature audit and found multiple substantial gaps.

### 6 missing Merchant OS modules → built

Per user memory, the Merchant OS has 13 systems. Found 7 of 13 had
routes. Built the 6 missing routes plus their APIs/migrations.

| Route | Status | Implementation |
|-------|--------|---------------|
| `/merchant/invoices` | **NEW** | API existed (`/api/merchant/invoices`, 353 lines, full CRUD). Built 465-line page with list, status filtering, create modal with line items, status transitions (draft → sent → paid). |
| `/merchant/inventory` | **NEW** | API existed (`/api/merchant/products`, 564 lines). Built 424-line page with search, status filter, low-stock alerts (threshold 5), inventory value, create modal for physical/digital/service products. |
| `/merchant/bookings` | **NEW** | API existed (`/api/merchant/bookings`). Built 448-line page with appointments + availability slots tabs, status transitions (confirmed → completed/no_show), depends on service-type products in inventory. |
| `/merchant/subscriptions` | **NEW** | API existed (`/api/merchant/subscriptions`). Built 330-line page with plans list, weekly/monthly/quarterly/yearly intervals, trial days, MRR estimate (weights by interval), pause/resume/archive. |
| `/merchant/tips` | **NEW + new API** | API didn't exist. Built `/api/merchant/tips/route.ts` (138 lines, GET+PUT) + 253-line settings page with preset percentage editor, custom-amount toggle, tip totals from existing `merchant_tips` table. |
| `/merchant/payment-links` | **NEW + new API + new buyer route** | API didn't exist. Built `/api/merchant/payment-links/route.ts` (232 lines, full CRUD), 368-line settings page with fixed vs open-amount toggle, single-use vs max_uses, expiry, copy-to-clipboard. Plus built public buyer-side `/pay/link/[id]` page + API (link resolution with same-origin redirect to /pay). |
| `/merchant/tax` | **NEW + new API** | API didn't exist. Built `/api/merchant/tax-rates/route.ts` (213 lines, full CRUD with transactional default-rate enforcement using getClient+BEGIN/COMMIT), 380-line page with multi-jurisdiction config, basis-point storage, applies_to selector, single-default-per-merchant via partial unique index. |

### Merchant hub completely rebuilt

The existing `/merchant/page.tsx` was a marketing page that linked to
**exactly one** sub-route (`/merchant/setup`). All 13+ Merchant OS
sub-systems were inaccessible from the hub. A merchant landing there
would have no way to discover their tools.

Replaced with a real hub: detects wallet connection, shows 20 module
cards organized into 5 logical sections (Sales & checkout, Customers,
Operations, Business, Setup), each with icon + label + description.
First-time prompt suggests setup → inventory → payment-links flow.
Disconnected wallet still sees the processor-fee comparison.

### Subnav merchant section also updated

`components/navigation/SubNav.tsx` was missing the 6 new routes too.
Added: inventory, invoices, payment-links, bookings, subscriptions,
tax, tips. Now 21 merchant routes navigable from the SubNav too.

### New database migration

`migrations/20260511_180000_merchant_tip_paylink_tax.sql` + `.down.sql`:

- `merchant_tip_settings` (per-merchant tip-jar config)
- `merchant_payment_links` (shareable URLs with usage/expiry/email/shipping)
- `merchant_tax_rates` (multi-jurisdiction tax with basis points)

All three: owner-RLS scoped by `merchant_address`, grants to `vfide_app`.
Payment links have an additional public-read RLS policy for status='active'
so the buyer page `/pay/link/[id]` can resolve without auth.

### Broken API endpoints found by audit → fixed where critical

Ran a scanner that maps every `fetch('/api/...')` in client code against
the actual API routes. Found 6 broken endpoints:

| Endpoint | Severity | Action |
|----------|----------|--------|
| POST `/api/crypto/transactions` | **Critical** — every payment's server-side log was silently failing | **Built** the missing route + extended `transactions` schema via migration `20260511_190000_extend_transactions_table.sql` (adds user_address, from_address, to_address, token_amount, currency, message, fee, metadata, created_at columns; converts id to TEXT for idempotent upsert; adds party-based RLS) |
| GET `/api/crypto/ens/[address]` | Low — ENS resolution nice-to-have, displays raw address as fallback | **Left as is** — graceful degradation |
| `/api/social/tips`, `/api/social/content-purchases`, `/api/social/payment-stats/*`, `/api/social/content-access` | Medium — social payments feature, page already shows "not available yet" message | **Left as is** — consistent with the explicit not-yet-implemented UI on `/social-payments` |
| `/api/admin/metrics/dashboard` | Low — only called from `lib/optimization/monitoring.ts`, admin-only | **Left as is** — admin tooling, no end-user impact |

### Components built but never wired (audit finding, no action)

Sweep found multiple "Manager" / "Dashboard" / "System" / "Portal" /
"Panel" components in `components/<feature>/` that aren't imported by
any page. Most are reasonable (alternative implementations, legacy code
replaced by newer wiring). Notable:

- `InvoiceManager`, `BookingSystem`, `InventoryManager`, `TipSystem`,
  `RefundManager` — these are pure-presentational widgets that take
  data as props; my new pages handle their own data fetching directly
  and don't need them. Architectural duplication, not breakage.
- `CreateProposalTab`, `DiscussionsTab`, `SuggestionsTab` in
  `app/governance/components/` — full UIs for on-chain proposal
  creation + community forums + suggestions with upvotes, built but
  never wired into `app/governance/page.tsx` (which uses `CreateTab`,
  an API-only stub instead). Real disconnect; not fixing now without
  a clearer signal of which version of governance you want active.

### Files

New routes:
- `app/merchant/invoices/page.tsx`
- `app/merchant/inventory/page.tsx`
- `app/merchant/bookings/page.tsx`
- `app/merchant/subscriptions/page.tsx`
- `app/merchant/tips/page.tsx`
- `app/merchant/payment-links/page.tsx`
- `app/merchant/tax/page.tsx`
- `app/pay/link/[id]/page.tsx`
- `app/pay/link/[id]/components/PayLinkContent.tsx`

New APIs:
- `app/api/merchant/tips/route.ts`
- `app/api/merchant/payment-links/route.ts`
- `app/api/merchant/tax-rates/route.ts`
- `app/api/pay/link/[id]/route.ts`
- `app/api/crypto/transactions/route.ts`

New migrations:
- `migrations/20260511_180000_merchant_tip_paylink_tax.sql` + `.down.sql`
- `migrations/20260511_190000_extend_transactions_table.sql` + `.down.sql`

Modified:
- `app/merchant/page.tsx` — rebuilt as real hub
- `components/navigation/SubNav.tsx` — added 7 missing merchant routes

### Migration order

When applying to your database, append these to the existing 5
migrations in order:

```
6. 20260511_180000_merchant_tip_paylink_tax.sql
7. 20260511_190000_extend_transactions_table.sql
```

Both are wrapped in BEGIN/COMMIT so a failure rolls back cleanly.

## 2026-05-11 (night) — QR Payment Audit + iOS Scanner Fix

User asked to double-check QR payment flow. Audit findings:

### What was already working ✅

- **Merchant QR generation** (SmartQR, PaymentQR, MerchantPOS) — fully
  wired with `qrcode` library and `qrcode.react`
- **Signed QRs with expiry** — `lib/payments/qrSignature.ts` builds a
  canonical message (`vfide:qr-payment:v1\nmerchant:...\namount:...\n
  orderId:...\nexpiresAt:...`); merchant signs with their wallet via
  EIP-191; signature + expiry embedded as `sig` and `exp` query params
- **Buyer-side signature verification** at `/pay` — uses
  `viem.verifyMessage` to recover the signer and confirm it matches
  the merchant address in the URL
- **Pay button gated on valid signature** — `qrReadyForPayment` check
  at PayContent.tsx line 185 disables the submit button until signature
  is `'valid'`; tampered/expired/missing QRs show explicit error states
- **Security event logging** — invalid/expired/missing signatures
  POST to `/api/security/qr-signature-events` with merchant, amount,
  reason, signature prefix (for forensics without leaking the full sig)
- **Universal-link fallback** — `https://yourdomain/pay?merchant=...&
  amount=...&sig=...` opens in any phone's native browser, so iOS
  users can scan with Camera.app and the link auto-opens VFIDE

### What was broken ⚠️

- **In-app QR scanner only worked on Android.** `lib/barcode/index.ts`
  used the browser-native `BarcodeDetector` API, which is supported on
  Android Chrome / Edge / desktop Chrome but **not on iOS Safari**.
  Users on iOS who tapped "Scan QR" got "Barcode scanning is not
  supported on this device" with no fallback.
- **No dedicated buyer-side scan page.** The PieMenu's "Scan QR" quick
  action was wired to `/pay` (which has no scanner — just the payment
  form). Users tapping it landed on an empty pay form.

### Fixed

- **`lib/barcode/index.ts`** rewritten with a two-tier strategy:
  - Tries native `BarcodeDetector` first (fastest path on Android)
  - Falls back to **jsQR** (pure JavaScript, ~14KB, works on iOS
    Safari 11+) when the native API is absent
  - Both paths drive the same `<video>` element the caller provides
  - jsQR path throttled to ~10 scans/sec to preserve battery on iOS
  - Lazy-imports jsQR so Android users don't pay its bundle cost
- **Added `jsqr@^1.4.0`** to dependencies
- **Created `app/scan/page.tsx` + `app/scan/components/ScanContent.tsx`** —
  fullscreen camera viewfinder with rear-camera default, targeting
  reticle UI, permission-denied / unsupported-browser / camera-error
  states, "Try again" button, and a critical security check:
  - **Decoded QRs are validated for same-origin before redirecting.**
    A QR encoding `https://attacker.example/pay?...` will NOT be
    auto-followed — the user sees "Unrecognized QR" with the raw
    string. Only same-origin `/pay` paths trigger a redirect. Prevents
    QR-phishing attacks where a malicious sticker placed over a
    merchant's real QR redirects users to a fake VFIDE.
  - Also blocks `javascript:`, `data:`, `vbscript:`, `file:` URL
    schemes regardless of origin.
- **PieMenu Scan QR action** rewired from `/pay` to `/scan`
  (`components/navigation/PieMenuEnhancements.tsx` line 92)

### What the user will now see

- **Merchant flow** (unchanged, was working): generate signed QR,
  show to buyer
- **Buyer flow, iOS Camera path** (unchanged, was working): point
  Camera at QR → tap link → opens `/pay` → signature verified → tap
  to pay
- **Buyer flow, in-app scan path** (NEW): long-press the V button →
  Scan QR → camera opens fullscreen → point at any merchant's signed
  QR → automatically redirects to `/pay` → signature verified → tap
  to pay. Works on iOS and Android.

### Files changed

- `lib/barcode/index.ts` — BarcodeDetector + jsQR strategy
- `package.json` — `jsqr@^1.4.0` added to dependencies
- `app/scan/page.tsx` — NEW, fullscreen scanner route
- `app/scan/components/ScanContent.tsx` — NEW, camera + decode + safe redirect
- `components/navigation/PieMenuEnhancements.tsx` — wire Scan QR to /scan

## 2026-05-11 (late evening) — PieMenu Mount Fix

User reported: "the pie navigation with color-changing ring tied to
ProofScore plus press-and-hold merchant quick-nav isn't showing up."

### Root cause

The full feature was built and wired:

- `components/navigation/PieMenu.tsx` (1086 lines) — the radial nav
  with V-button trigger, 400ms long-press detection, merchant
  quick-actions overlay (line 1041), full 8-direction fan-out
- `components/navigation/PieMenuEnhancements.tsx` (477 lines) — the
  4-tier ProofScore color thresholds (red < 5000, amber 5000+,
  cyan 6500+, emerald 8000+)
- `components/ui/ProofScoreRing.tsx` (238 lines) — the color-changing
  ring component itself
- `components/navigation/AppShell.tsx` — renders `<PieMenu />` on
  every route except `/embed` and `/s/*`
- `components/layout/ClientLayout.tsx` — wraps children in
  `<AppShell>`

But `app/layout.tsx` (the Next.js root layout) was rendering
`<CoreProviders>{children}</CoreProviders>` directly, completely
bypassing ClientLayout. So AppShell never mounted, so PieMenu never
rendered. The build worked, every page loaded, but the radial nav
was simply not in the DOM. This is the classic "thin-shell missing
wiring" regression — likely lost during the frontend overhaul that
decomposed the monolith pages.

### Fixed

- **`app/layout.tsx`** — Now imports `ClientLayout` from
  `@/components/layout/ClientLayout` and wraps children in it inside
  CoreProviders. The mounting chain
  `RootLayout → CoreProviders → ClientLayout → AppShell → PieMenu`
  is now complete.

### Bonus fix — ring now shows the LIVE ProofScore

Without a `PieMenuContextProvider` ancestor, the ring defaults to
5000 (neutral / amber) regardless of the user's actual ProofScore.
Wiring this was previously left as a TODO in `PieMenu.tsx` line 712.

Added `components/navigation/LiveProofScoreProvider.tsx`:

- Reads connected wallet's score from `Seer.getScore(address)` via
  wagmi `useReadContract`
- Wraps children in `PieMenuContextProvider` with the live score
- 60s staleTime so the ring doesn't refetch on every remount
- Degrades silently — no wallet, no Seer address, RPC error all fall
  back to neutral 5000

Wired into ClientLayout above AppShell so every route inherits the
live score automatically.

### What the user will now see

- V-button at bottom-right on every route (except `/embed` and `/s/*`)
- Ring around the V tinted by ProofScore tier:
  - Red — score < 5000 (low / new user)
  - Amber — score 5000–6499 (neutral)
  - Cyan — score 6500–7999 (building)
  - Emerald — score 8000+ (trusted)
- Tap V → 8-direction radial nav fans out for primary navigation
- Press-and-hold V (400ms) → merchant quick-actions overlay fans out
  above the V button for one-tap access to common merchant flows

### Files changed

- `app/layout.tsx` — mount ClientLayout
- `components/layout/ClientLayout.tsx` — wrap AppShell in LiveProofScoreProvider
- `components/navigation/LiveProofScoreProvider.tsx` — NEW, wagmi wiring

## 2026-05-11 (evening) — Vercel Build Fix

User pushed to Vercel and the build failed with `npm run build exited 1`
and no visible error message. Two root causes:

### Root cause 1: prebuild validator was failing silently

`scripts/postinstall-validate-env.cjs` skips in CI (good), but the
`prebuild` script (`npm run validate:env` → `tsx lib/validateProduction.ts`)
runs unconditionally. It detected Vercel (`process.env.VERCEL === '1'`),
saw missing required env vars, and exited 1 — but its output was
completely suppressed because the validator used `logger.info(...)` for
ALL messages including error reports. The production logger config is
`['warn', 'error']`, so info-level output is dropped.

**Fix:** Converted all 21 `logger.info()` / `logger.warn()` / `logger.error()`
calls in `lib/validateProduction.ts` to direct `console.log()` /
`console.warn()` / `console.error()`. Build-time validation output is
operator-facing and must survive the runtime log-level filter. Dropped
the now-unused `logger` import.

### Root cause 2: testnet builds were forced to provide mainnet addresses

`strictProduction` was `isProduction && !frontendOnly`. On Vercel,
`NODE_ENV=production` always, so every "production: true" env-var check
fired — including all 18 contract addresses that don't exist until
operator runs `deploy-full.ts`. Classic chicken-and-egg.

**Fix:** Made `strictProduction = isProduction && !frontendOnly && !isTestnet`.
The `isTestnet` flag (already computed but unused) is true unless
`NEXT_PUBLIC_IS_TESTNET` is explicitly `"false"`. Testnet builds now
warn on missing contract addresses; mainnet builds (`NEXT_PUBLIC_IS_TESTNET=false`)
still hard-fail. Same treatment applied to the Redis-required check.

### Verified behaviour

```
NODE_ENV=production VERCEL=1 NEXT_PUBLIC_IS_TESTNET=true  + 7 floor vars → exit 0  ✅
NODE_ENV=production VERCEL=1 NEXT_PUBLIC_IS_TESTNET=false + 7 floor vars → exit 1  ✅
```

### Minimum env vars to set in Vercel for a testnet deploy

These 8 must be set explicitly (no auto-fallback on Vercel; this is by
design — operator must be explicit):

```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.basescan.org
NEXT_PUBLIC_IS_TESTNET=true
APP_ORIGIN=https://<your-vercel-domain>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
DATABASE_URL=postgresql://vfide_app:...@host/vfide
JWT_SECRET=<32+ char random string>
```

After running `deploy-full.ts` against Base Sepolia, copy each
`NEXT_PUBLIC_*_ADDRESS` line from the deploy script's console output
into Vercel env vars. The build no longer requires them, but the
frontend wagmi hooks do.

### Files changed

- `lib/validateProduction.ts` — logger calls → console; strictProduction
  excludes testnet; Redis-required check excludes testnet.

## 2026-05-11 (afternoon) — Architecture Correction

User correction (was wrong about this across multiple rounds): this
codebase does NOT use Next.js's built-in `middleware.ts` mechanism. The
security stack lives in `proxy.ts` and is invoked by a separate proxy
layer (see `next.config.ts`: "CSP is applied per-request in proxy.ts
with a nonce" and "Strict fallback CSP for non-proxy paths").

### Fixed in this round

- **Deleted the erroneous `middleware.ts` shim.** Creating it was wrong;
  a Next.js auto-loaded middleware would either bypass or duplicate the
  proxy stack the codebase actually uses.
- **Rewrote `scripts/validate-frontend-ready.ts` section 1.** Was
  checking that `middleware.ts` existed (and called this "required");
  now correctly checks `proxy.ts` has its proxy function, config
  matcher, validateCSRF call, CSP nonce, and body-size enforcement.
- **Added section 2 to the validator: a guard AGAINST stray
  `middleware.ts`.** If a `middleware.ts` ever re-appears at the project
  root, the validator now fails loud. This prevents the same wrong fix
  from being re-applied in future rounds.

### Wrong assertions removed from earlier CHANGELOG entries

The previous CHANGELOG entries for 2026-05-10 (afternoon) and the
2026-05-11 round-1 entry both falsely claimed `middleware.ts` was
"missing" and "required" — those claims were wrong. The proxy layer
that invokes `proxy.ts` has always been in place; nothing was broken.

## 2026-05-11 — Restoration + Writer-Role Split

This round restored work from rounds 2 and 3 that had been reverted in
the user's zip, and closed the final outstanding code-level item.

### Restored from prior rounds (lost in zip round-trip)

The uploaded zip dropped almost all of the round-2/3 deliverables. Re-applied:

- `scripts/compile-with-solcjs.cjs` (sandbox compile fallback)
- `scripts/validate-frontend-ready.ts` (hardhat-free pre-flight)
- `scripts/sync-abis.ts` with SKIP_LIST / RENAME_MAP / MERGE_MAP support
- `migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql` + .down
- `migrations/20260510_140000_complete_rls_baseline.sql` + .down
- `migrations/20260510_141500_normalize_legacy_rls_lower.sql` + .down
- 13 ABI files re-synced from artifacts (CardBoundVault 84→102 fns,
  VFIDEBridge 0→112 fns, VFIDECommerce 16→35 fns, MainstreamPayments
  20→36 fns, DevReserveVesting 26→28 fns, plus 8 others)
- `package.json` — removed 9 dead/broken script entries; re-added 7 new
- Deleted (again): `scripts/deploy-all.ts`, `scripts/apply-all.ts`

(NOTE: An erroneous `middleware.ts` shim was also re-applied in this
round but subsequently removed in the 2026-05-11 afternoon correction —
see the entry above.)

### New — closes the last open code-level item

- **`migrations/20260511_160000_split_writer_role.sql`** + .down. Creates
  a `vfide_app_writer` role (NOBYPASSRLS, no LOGIN by default), revokes
  INSERT/UPDATE/DELETE from `vfide_app` on the 25 Pattern F
  system/lookup tables, and grants those four privileges to the new
  writer role. `vfide_app` retains SELECT — reads from API routes
  continue to work. Backend jobs (indexer, cron, webhook handlers) must
  switch to a `DATABASE_URL_WRITER` env var that connects as the writer
  role. Until they do, those flows hit "permission denied" — fails loud,
  not silent. Tables touched: platform_categories, daily_quests,
  weekly_challenges, achievement_milestones, prize_tiers,
  monthly_prize_pool, seer_analytics_daily_rollup,
  seer_reason_code_daily_rollup, performance_metrics, indexed_events,
  indexer_state, merchant_webhook_deliveries, merchant_invoice_items,
  merchant_order_items, merchant_product_variants,
  merchant_digital_assets, merchant_digital_deliveries,
  coupon_redemptions, installment_payments,
  merchant_wholesale_group_buys, audit_events,
  security_alert_dispatches, security_webhook_replay_events,
  flashloan_lanes, flashloan_lane_events, vault_identities.

- `validate-frontend-ready.ts` extended with the new migration check.

### State at end of round

All 16 frontend pre-flight checks pass. Five migrations on disk cover
the full RLS surface:

1. `20260503_120000_create_app_role_rls_enforcement.sql` — creates vfide_app NOBYPASSRLS
2. `20260510_120000_grant_vfide_app_and_baseline_rls.sql` — 102-table grants + 31-table RLS
3. `20260510_140000_complete_rls_baseline.sql` — 47 more tables, 5 ownership patterns
4. `20260510_141500_normalize_legacy_rls_lower.sql` — case-insensitive wallet matching
5. `20260511_160000_split_writer_role.sql` — Pattern F write protection

## 2026-05-10 (evening) — Closing All Open Items

This pass closes the four "Open" items I documented at the end of the
previous session.

### Compile + ABI sync (✅ closed)

Got Solidity compilation working in a sandboxed environment without the
native solc binary. The Hardhat compiler downloader fetches from
`binaries.soliditylang.org` which is unreachable in some networks
(including the prep environment used for this work). Resolved by:

- **`scripts/compile-with-solcjs.cjs`** — standalone Node script that uses
  the pure-JS `solc` npm package (already in `devDependencies`) to compile
  any subset of contracts directly, writing Hardhat-compatible artifacts
  to `artifacts/contracts/`. Supports a CLI list of contract names so you
  can compile in batches when viaIR makes a full build too slow.
- Compiled the full production contract set across 8 batches.
- **All 58 frontend ABIs are now in sync** with the deployed contract
  surface. Drift in 11 ABIs was fixed:
  - **CardBoundVault**: 18 functions added — `executeQueuedPayment`,
    `cancelQueuedPayment`, `applyLargePaymentThreshold`,
    `setLargePaymentThreshold`, `pauseApprovalByGuardian`,
    `splitAdminFromActive`, and 12 supporting view/state vars. These
    drive the withdrawal-queue UI.
  - **FraudRegistry**: `getPendingEscrowsPaginated`, `userActiveEscrowCount`
  - **VFIDEBridge**: 21 functions for refund-window and recovery flows
  - **VFIDEBadgeNFT**: 18 functions for emergency-controller flow
  - **VFIDECommerce**: 18 functions across MerchantRegistry+CommerceEscrow
  - **VFIDEEnterpriseGateway**: 10 oracle-floor functions
  - **VFIDEFlashLoan**: 13 fee-distributor/orphan-sweep functions
  - **VFIDEPriceOracle**: 19 emergency-controller functions
  - **VFIDETermLoan**: 3 cosigning functions
  - **VaultRegistry**: 4 vault-hub-change functions
  - **VaultInfrastructure**: removed 1 stale function (`getRecoveryStatus`)

### sync-abis.ts — handles all corner cases now

Extended with three new categories so `--check` is now CI-clean:

- **SKIP_LIST** (`ERC20`) — hand-curated standard interfaces are never
  overwritten by sync.
- **RENAME_MAP** — when `lib/abis/<X>.json` reflects a contract that was
  renamed (`DevReserveVesting` → `DevReserveVestingVault`,
  `MainstreamPayments` → `MainstreamPriceOracle`), the symbol stays stable
  while the artifact source is correctly tracked.
- **MERGE_MAP** — for multi-contract files like `VFIDECommerce.sol`
  (defines both `MerchantRegistry` and `CommerceEscrow`), the script
  merges both artifacts' ABIs into one file. Dedupes by type+name+inputs.

### Full RLS coverage (✅ closed)

Two new migrations close the policy gap on the ~72 sensitive tables that
had no RLS at all:

- **`migrations/20260510_140000_complete_rls_baseline.sql`** — covers 47
  tables across 5 ownership patterns:
  - Pattern A (28 tables): `user_id` FK joined through `users.wallet_address`
  - Pattern B (4 tables): `address` PRIMARY KEY = wallet
  - Pattern C (5 tables): dual-address payments/streams/loans — both
    `from`/`to` parties can read; only originator can insert; either party
    can update (cancellation/acceptance)
  - Pattern D (7 tables): actor FK columns (`creator_id`, `sender_id`,
    `uploaded_by`, `reporter_id`, `staff_id`)
  - Pattern E (2 tables): group membership scope — visible to current
    group members via `group_members` lookup
  - Pattern F (25 tables): explicit no-RLS decision documented in-migration
    for system/lookup tables (categories, daily quests, achievement
    milestones, performance metrics, indexer state, etc.) — these stay
    open-read with writes gated by future role split.
- **`migrations/20260510_141500_normalize_legacy_rls_lower.sql`** —
  consistency-patches the 6 legacy RLS-protected tables (users, messages,
  friendships, user_rewards, endorsements) to use `LOWER()` on wallet
  comparisons, matching the modern pattern established by
  `20260430_120000_user_portfolios_and_users_insert_rls.sql`. Closes a
  latent footgun where any mixed-case wallet address inserted by an admin
  job would become invisible to its rightful owner under RLS.
  user_portfolios already used LOWER(); proposals is intentionally
  read-public.

Both migrations are idempotent and have companion `.down.sql` files.

### Legacy-RLS audit (✅ closed)

The 7 pre-existing RLS-protected tables were audited:

| Table           | Had | Now |
|-----------------|-----|-----|
| users           | R,U + insert (bare =) | R,U,I (LOWER) |
| messages        | R,I,D (bare =)        | R,I,D (LOWER) |
| friendships     | R,I,U (bare =)        | R,I,U (LOWER) |
| user_rewards    | R,U (bare =)          | R,U (LOWER)   |
| endorsements    | read-all + I,D (bare =) | read-all + I,D (LOWER) |
| user_portfolios | R,I,U (LOWER)         | unchanged     |
| proposals       | read-all              | unchanged     |

Three intentional gaps remain by design:
- `users` has no DELETE policy (admin-only deletion)
- `messages` has no UPDATE policy (messages are immutable)
- `endorsements` has no UPDATE policy (endorsements are immutable)

### Compile validation (✅ closed)

The 8-batch compile against solc 0.8.30 surfaced ZERO compile errors in
the production set. Warnings logged:
- 18 "unused parameter" warnings (cosmetic)
- 4 "function can be restricted to view/pure" warnings (cosmetic)
- 4 "contract size exceeds 24576 bytes" warnings on Seer.sol,
  SeerAutonomous.sol, CardBoundVault.sol, EcosystemVault.sol — these are
  EXPECTED in a default runs:200 build; `hardhat.config.ts` has per-file
  overrides with `runs:0` and `revertStrings: "strip"` that bring each
  under 24KB for actual deployment. Verify with `npx hardhat
  size-contracts` on a real Hardhat compile before mainnet.

### Files added in this pass

- `scripts/compile-with-solcjs.cjs`
- `migrations/20260510_140000_complete_rls_baseline.sql` + `.down.sql`
- `migrations/20260510_141500_normalize_legacy_rls_lower.sql` + `.down.sql`

### Files modified in this pass

- `scripts/sync-abis.ts` — added SKIP_LIST, RENAME_MAP, MERGE_MAP
- `scripts/validate-frontend-ready.ts` — recognizes the two new RLS migrations
- `lib/abis/` — 11 files updated with fresh ABIs from solc 0.8.30

### Single remaining caveat

The 25 Pattern F tables (system/lookup) stay open-read by intentional
decision. The migration documents this in a long comment block. For
mainnet, consider splitting `vfide_app` into `vfide_app_reader` and
`vfide_app_writer` so writes to those tables are role-gated.

## 2026-05-10 (afternoon) — Frontend / API / DB Readiness

Goal: close the non-Solidity testnet blockers blocking "100% mainnet parity."

### Critical fixes

- **Created root `middleware.ts`** — re-export shim pulling `middleware`
  and `config` from `proxy.ts`. Next.js (currently 16.2.4) only picks up
  middleware named EXACTLY `middleware.ts` at project root. Without this
  file, `proxy.ts` was never executed — meaning no CSRF validation, no CSP
  nonce, no request-size limits, no Content-Type validation, no CORS
  enforcement on any API route, despite all that logic being implemented.

- **Added `migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql`.**
  Of 110 tables defined across migrations, only 8 had `GRANT … TO
  vfide_app` statements. Promoting `DATABASE_URL` to the `vfide_app` role
  (NOBYPASSRLS — the only safe production setup) would have failed at the
  first query against any other table with "permission denied". The
  migration:
    - Grants SELECT/INSERT/UPDATE/DELETE on all existing public tables
    - Grants USAGE on all sequences
    - Sets ALTER DEFAULT PRIVILEGES so future tables/sequences inherit
      these grants without per-migration boilerplate
    - For every table with an obvious owner column (`wallet_address`,
      `owner_address`, `user_address`, `merchant_address`,
      `merchant_wallet_address`), adds `_read_own`/`_insert_own`/
      `_update_own`/`_delete_own` RLS policies keyed on
      `current_setting('app.current_user_address', true)`
    - Prints NOTICE listing tables with no obvious owner column so they
      can be reviewed manually before mainnet
  Companion down migration drops the policies and revokes grants.

### New tooling

- **`scripts/validate-frontend-ready.ts`** + `npm run validate:frontend`.
  Pre-flight that does NOT require hardhat. Checks: middleware.ts present;
  proxy.ts exports correct surface and calls validateCSRF; /api/csrf
  route exists; CSRF exempt list doesn't include high-value paths;
  lib/db.ts calls set_config(app.current_user_address, ...);
  instrumentation.ts calls verifyRlsEnforcementOrThrow; both vfide_app
  migrations are present. Pairs with validate:testnet for full coverage.

### Re-applied (drifted between zip rounds)

- `package.json` had reverted to pre-cleanup state. Re-removed six broken
  script entries; re-added five new ones; added `validate:frontend`.
- `scripts/deploy-all.ts` and `scripts/apply-all.ts` had been restored.
  Re-deleted. These deploy a strict subset of `deploy-full.ts` (18 of 28+
  contracts), directly contradicting the testnet==mainnet goal.

### Verified-already-wired (user-memory note was stale)

The user-memory note `"SET app.current_user_address never called in
lib/db.ts"` referred to an earlier code state. Current `lib/db.ts:32-33`
defines `applyDbUserAddressContext`, and every `query()` / `getClient()`
invocation either resolves the user from AsyncLocalStorage or from
request headers/cookies and applies the context on a dedicated client.
Wired correctly. The actual gap was the table-grant gap above.

## 2026-05-10

### Testnet Readiness — Deployment Pipeline Consolidation

Goal: deploy the same contract set + wiring on testnet that we'd ship to
mainnet, with no parallel scripts to maintain and no silent runtime gaps.

#### Deployment scripts
- **Made `scripts/deploy-full.ts` the canonical deploy path.** Added
  `TESTNET_CHAIN_IDS` constant matching `_isSupportedTestnetChain` in
  `contracts/testnet/VFIDETestnetFaucet.sol`, and gated the faucet
  deployment behind `isTestnetChain && DEPLOY_TESTNET_FAUCET=true`.
  `DEPLOY_TESTNET_FAUCET=true` on a mainnet chain now throws fast with a
  clear error instead of relying on the faucet constructor revert.
- **Wired the faucet to EcosystemVault.** Previously every faucet claim
  silently lost its referral inside a try/catch because
  `EcosystemVault.registerUserReferral` is `onlyManager` and the faucet
  was never registered. Deploy now calls `setManager(faucet, true)` (which
  queues a 2-day timelock) and `faucet.setEcosystemVault(ecoAddr)`.
- **Added missing module DAO transfer finalizations to `apply-full.ts`.**
  `MerchantPortal.applyDAO`, `VFIDEFlashLoan.applyDAO`,
  `VFIDETermLoan.applyDAO`, and `FraudRegistry.applyDAO_FR` are all
  48h-timelocked and were queued by `deploy-full.ts` but never executed.
  Without this fix the deployer remained DAO of all four modules forever.
- **Added `EcosystemVault.executeManagerChange()` to `apply-full.ts`** so
  the faucet manager grant queued at deploy time actually takes effect.
- **Deleted `scripts/deploy-all.ts` and `scripts/apply-all.ts`** — the
  partial duplicate of `deploy-full.ts`/`apply-full.ts` that only covered
  18 of the 28+ production contracts.
- **Removed nine dead script entries from `package.json`** that pointed at
  `.broken` files: `contract:deploy`, `deploy:apply-wiring:{mainnet,sepolia}`,
  `deploy:solo:{base,mainnet,sepolia}`, `deploy:wizard`, `deploy:all`, `apply:all`.

#### New scripts (all idempotent, chain-guarded)
- `scripts/fund-faucet.ts` — funds the testnet faucet with VFIDE + ETH,
  with pre-flight balance check and optional operator registration. Refuses
  to run on non-testnet chains. Reads `.deployments/<network>.json` so no
  hand-typed addresses.
- `scripts/sync-abis.ts` — copies fresh ABIs from `artifacts/contracts/`
  into `lib/abis/` after `hardhat compile`. `--check` mode for CI.
  Fixes the recurring "function not in ABI" wagmi runtime errors.
- `scripts/validate-testnet-ready.ts` — single-shot pre-flight that checks
  chain id, deployment book completeness, token total supply (200 M),
  token module wiring, faucet balance + ecosystem vault wiring,
  EcosystemVault.isManager(faucet), all six module DAO ownerships, and
  parity between `NEXT_PUBLIC_*_ADDRESS` env vars and the deployment book.
  Exits non-zero on any failure for CI gating.

#### hardhat.config.ts
- Removed three phantom Solidity overrides for files that don't exist:
  `contracts/DeployPhases3to6.sol`, `contracts/DeployPhase1.sol`,
  `contracts/DeployPhase1Governance.sol`.
- Corrected the path for `BadgeManager.sol` and `SeerAutonomous.sol` to
  `contracts/future/` (where they actually live).
- Added testnet networks: `zkSyncSepolia` (300), `arbitrumSepolia` (421614),
  `optimismSepolia` (11155420) — all in the faucet's allowlist but
  previously unreachable from `--network ...`.
- Added matching mainnet networks: `arbitrum` (42161), `optimism` (10).
- Extended etherscan config with `ARBISCAN_API_KEY` and
  `OPTIMISTIC_ETHERSCAN_API_KEY` plus custom-chain endpoints for all four
  new networks.

#### Faucet API
- `app/api/faucet/claim/route.ts` — replaced hardcoded `baseSepolia`
  imports/usages with a `resolveTestnetChain()` helper that maps
  `NEXT_PUBLIC_DEFAULT_CHAIN_ID` to its viem chain definition + default
  RPC URL. Supports Base Sepolia, Polygon Amoy, zkSync Sepolia, Ethereum
  Sepolia, Arbitrum Sepolia, and Optimism Sepolia. Returns 503
  "Unsupported testnet chain" if `NEXT_PUBLIC_DEFAULT_CHAIN_ID` is set to
  anything not in the testnet allowlist.

#### Doc / env hygiene
- Updated `.env.example` and `.env.staging.example` references from the
  deleted `deploy-all.ts` to `deploy-full.ts`. Added
  `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` to the canonical post-deploy block.
- Updated stale references in `scripts/verify-admin-roles.ts` and
  `scripts/future/apply-phase2.ts`.

#### Known follow-ups (not fixed in this pass)
- ABI drift inventory: `FraudRegistry` is missing 8 functions from
  `lib/abis/FraudRegistry.json`; `CardBoundVault` is missing 9 (including
  `executeQueuedPayment` and `cancelQueuedPayment` — both needed for the
  withdrawal-queue UI). Run `npx hardhat compile && npm run sync-abis`
  after this drop to repair.
- Hardhat compile was not run in the prep environment (no solc binary
  available); a clean compile + `hardhat size-contracts` should be the
  next gate.

## 2026-04-13

### Security And Reliability Remediation

- Finalized deep audit remediations across token, vault, escrow, governance, and router flows.
- Added testnet chain guard for the faucet to block deployment on major production chains.
- Enforced timelocked whale-limit exemption application flow and aligned related tests.
- Hardened fee-routing, score fallback, whitelist enforcement, and anti-whale accounting behavior.
- Standardized compiler configuration and interface surface updates for safer operations.

### Release

- Commit: `8e18922e`
- Branch: `main`
- Validation: `hardhat compile` clean; representative Jest regression suite passing.
