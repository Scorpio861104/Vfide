# Deep Repository Line Audit Findings

Branch: `deep-repo-line-audit-2026-06`

## Scope

This audit reviewed the tracked source/config/test/documentation corpus captured in `audit/deep-line-audit/tracked-text-files.txt` and follow-up area inventories under `audit/deep-line-audit/`. Generated artifacts, dependencies, binary assets, caches, and lockfile noise were excluded from the line-audit scope.

## Confirmed findings fixed

### 1. Social/payment API routes lacked explicit abuse throttling

Evidence files:

- `audit/deep-line-audit/api-route-files.txt` identified 147 App Router API route files.
- `audit/deep-line-audit/api-auth-rate-candidates.txt` flagged authenticated social/payment routes with auth but no `withRateLimit` call.
- `audit/deep-line-audit/high-risk-api-review.txt` captured line-numbered route evidence for manual review.

Affected endpoints:

- `app/api/messages/tip/route.ts`
- `app/api/social/content-access/route.ts`
- `app/api/social/content-purchases/route.ts`
- `app/api/social/tips/route.ts`
- `app/api/community/stories/route.ts`

Impact:

These endpoints perform authenticated reads/writes and, for payment routes, expensive on-chain payment verification and database writes. Without an early rate-limit gate, an authenticated user could repeatedly trigger verification/database work and increase abuse risk.

Fix:

Added `withRateLimit(request, 'write')` before mutation/verification paths and `withRateLimit(request, 'api')` before read paths. Added `__tests__/api/social-payment-rate-limit.test.ts` to prove rate-limit responses short-circuit before on-chain verification and database work.

### 2. Health check still treated WalletConnect as mandatory

Evidence:

- `app/api/health/route.ts` required `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` even though the wallet flow now disables WalletConnect gracefully when no valid project id is configured.
- Active deployment docs and env examples also described WalletConnect as required.

Impact:

Deployments with MetaMask/Coinbase/injected wallets working correctly, but WalletConnect intentionally omitted, could be marked unhealthy/degraded by `/api/health`. This contradicted the intended three-option wallet flow where WalletConnect is optional when not configured.

Fix:

Removed WalletConnect from the required health env list and documented that it is optional. Updated `__tests__/api/health.test.ts` with a regression that health remains OK without `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Updated active README/docs/env examples to describe WalletConnect as optional QR/mobile pairing support.

### 3. Lint warning in initcode chunk script

Evidence:

Initial lint reported an unused caught error in `scripts/card-bound-vault-initcode-chunks.ts`.

Fix:

Renamed `catch (error)` to `catch (_error)` to satisfy the repository lint convention for intentionally unused caught errors.

## Reviewed but not changed

### API scan false positives

`app/api/indexer/poll/route.ts` was listed by the broad scan as missing auth/rate-limit, but manual inspection showed it requires `CRON_SECRET` and compares the bearer token using `timingSafeEqual`; no change was made.

### Browser global / client boundary scan

The browser-global scan produced many candidate lines. Manual inspection confirmed representative files were client components or guarded utilities, including `components/receipts/WhatsAppReceipt.tsx`, `components/onboarding/OnboardingSystem.tsx`, navigation components, QR/social components, `lib/i18n.ts`, and storage helpers. No confirmed server/client boundary defect was found.

### Component/hook HTML/listener scan

`components/security/SecurityProvider.tsx` reads script `innerHTML` only for development security monitoring; `components/identity/Identicon.tsx` clears a ref container before mounting Jazzicon DOM; listener-heavy hooks include cleanup. No confirmed component defect was found.

### Library/script scans

Secret references were environment reads rather than secret logging. Shell execution in inspected scripts used fixed commands or fixed in-script paths; no user-controlled shell injection was confirmed.

### Contracts/migrations/blockchain harnesses

High-signal Solidity patterns such as delegatecall, assembly, unchecked blocks, and low-level calls were reviewed. Matches were primarily documented facet architecture, vendored Uniswap math, mocks/legacy files, or already-guarded call patterns. No new contract defect was confirmed in this pass.

### Tests and CI

No focused `.only` tests were found. Skipped tests were mostly deprecated/removed feature tests or opt-in live/security suites. CI soft gates inspected were either artifact upload tolerances, explicitly informational checks, or followed by hard enforcement steps.

## Verification performed

- `CI=true npx jest __tests__/api/social-payment-rate-limit.test.ts --runInBand --silent=false`
- `CI=true npx jest __tests__/api/health.test.ts --runInBand --silent=false --detectOpenHandles`
- `npm run typecheck`
- `npm run lint`
- Baseline route/i18n gates captured under `audit/deep-line-audit/checks/`

## Notes

The repository is large; this report separates confirmed defects from broad-scan false positives to avoid risky churn. The branch intentionally applies targeted fixes only where the audit produced concrete evidence.
