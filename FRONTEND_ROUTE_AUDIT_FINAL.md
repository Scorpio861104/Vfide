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
