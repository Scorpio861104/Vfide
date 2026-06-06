# Frontend Route Audit — Final Report
**Date:** 2026-05-29  
**Codebase:** main @ 67141e3  
**Build status:** ✅ Clean (254 pages, 0 TS errors, 0 build failures)

---

## Summary

| Category | Result | Issues Found | Fixed |
|---|---|---|---|
| 1. Redirect-only pages (24) | ✅ Clean | 0 | — |
| 2. SSR / useSearchParams crashes | ✅ Clean | 0 (false positives) | — |
| 3. Wagmi hook crashes | ✅ Clean | 0 (false positives) | — |
| 4. Broken imports / missing exports | ✅ Clean | 0 (false positives) | — |
| 5. Broken static Link hrefs | ✅ Clean | 0 | — |
| 6. Unguarded JSON.parse | ✅ Fixed | 10 unguarded calls | ✅ All fixed in PR |
| 7. Tab redirect values | ✅ Clean | 0 | — |
| 8. Dynamic route param guards | ✅ Clean | 0 | — |
| 9. API route parity | ✅ Clean | 5 missing routes (dead code only) | — |
| 10. Env var crash risks | ✅ Clean | 0 crash-risk usages | — |
| 11. Wagmi hooks without wallet guard | ℹ️ Info | 30 pages (graceful empty state) | — |
| 12. Route group layouts | ✅ Clean | 0 | — |
| 13. Orphan layouts (no page.tsx) | ✅ Clean | 0 | — |
| 14. error.tsx coverage | ✅ Clean | 11 routes use root fallback | — |

---

## Category 9 Detail — Dead Code API Calls (not production issues)

The following API endpoints are called only from dead-code lib files (not imported in any production page):

| Endpoint | Called From | Status |
|---|---|---|
| `/api/analytics/metrics` | `lib/analytics.ts` (unused), `WebVitalsTracker` (unused) | Dead code |
| `/api/admin/metrics/dashboard` | `lib/optimization/monitoring.ts` (unused in prod) | Dead code |
| `/api/messages/tip` | `lib/crypto.ts` → `PaymentButton.tsx` (not used in any page) | Dead code |
| `/api/social/tips` | `lib/socialPayments.ts` → demo page only | Demo only |
| `/api/social/content-purchases` | `lib/socialPayments.ts` → demo page only | Demo only |

None of these affect live user-facing pages.

---

## Category 11 Detail — Wagmi Hooks Without Explicit Wallet Guard

These 30 pages use `useAccount()` but don't have an `isConnected` early-return gate. All render safely with empty/placeholder state when no wallet is connected (wagmi v2 returns `{ address: undefined }`):

`/dashboard`, `/explorer/[id]`, `/governance/proposal/[id]`, `/inheritance/claim`, `/inheritance/memorial`, `/merchant/analytics`, `/merchant/bookings`, `/merchant/coupons`, `/merchant/customers`, `/merchant/expenses`, `/merchant/gift-cards`, `/merchant/installments`, `/merchant/inventory`, `/merchant/invoices`, `/merchant/locations`, `/merchant/loyalty`, `/merchant/payment-links`, `/merchant/profile/edit`, `/merchant/returns`, `/merchant/staff`, `/merchant/subscriptions`, `/merchant/suppliers`, `/merchant/tax`, `/merchant/tips`, `/merchant/wholesale`, `/testnet`, `/vault/pending-changes`, `/vault/recover`, `/vault/safety/window`, `/vesting`

**Recommendation:** Low priority. All use `if (!address) return` or conditional rendering. No crashes confirmed.

---

## Category 14 Detail — error.tsx Coverage Gaps

11 routes rely on the root `app/error.tsx` fallback (no per-route error boundary):
`/inheritance`, `/me`, `/onboarding`, `/recovery-challenge`, `/recovery-sign`, `/recovery-status`, `/rewards-hub`, `/roadmap`, `/scan`, `/verifier`, `/vesting`

**Recommendation:** Add per-route `error.tsx` for `/onboarding`, `/vesting`, `/me`, and `/inheritance` (user-critical paths). The root fallback is functional but shows generic messaging.

---

## Fix Applied — Category 6 (JSON.parse Safety)

**Commit:** `ed80c4c` → merged into `main` at `67141e3`

Files fixed:
- `app/checkout/[id]/page.tsx` (L161, L243)
- `app/merchant/wholesale/page.tsx` (L157)
- `app/social-hub/page.tsx` (L137, L138, L191, L221)
- `components/social/GroupMessaging.tsx` (L766)
- `components/social/MutualFriends.tsx` (L36, L40)

Pattern applied: `let x = []; try { x = JSON.parse(...); } catch { x = []; }`

---

## Categories 15–28 (Extended Audit)

| Category | Result | Detail |
|---|---|---|
| 15. loading.tsx coverage | ℹ️ Info | 13 routes use root fallback (non-critical) |
| 16. middleware.ts | ✅ Clean | Auth handled at component level (correct for dApp) |
| 17. ConstitutionSection GitHub links | ✅ Clean | All 3 links return HTTP 200 |
| 18. Body-level <Link> hrefs | ✅ Clean | 63 unique hrefs — 0 broken |
| 19. next.config.ts redirects | ✅ Clean | 3 redirects, all destinations exist |
| 20. OG image assets | ✅ Clean | og-image.png exists in /public |
| 21. manifest.json + PWA icons | ✅ Clean | All 5 icon references resolve |
| 22. Hardcoded localhost URLs | ✅ Clean | 1 occurrence, gated behind NODE_ENV !== 'production' |
| 23. Broken /public asset references | ✅ Clean | 0 broken |
| 24. next/router vs next/navigation | ✅ Clean | 0 incorrect imports |
| 25. Server Actions | ✅ Clean | 0 'use server' files |
| 26. Route conflicts | ✅ Clean | 0 static/dynamic conflicts |
| 27. i18n / translation keys | ✅ Clean | All 31 used keys exist in en.json + 7 locales complete |
| 28. Hardcoded test content | ✅ Clean | 2 flagged — both intentional (SampleDataBanner, zero-addr fallback) |

## Fixes Applied — error.tsx for Critical User Paths

Added per-route `error.tsx` for 4 previously uncovered critical routes:
- `app/onboarding/error.tsx` — links to /onboarding restart
- `app/vesting/error.tsx` — links back to /dashboard
- `app/me/error.tsx` — links back to /dashboard
- `app/inheritance/error.tsx` — links back to /vault (safety-aware messaging)

All 4 include `'use client'`, `logger.error()` reporting, retry button, and nav link.
