## Summary

This PR contains the repository-wide deep audit follow-up on `deep-repo-line-audit-2026-06`. The audit covered tracked source, config, tests, contracts/migrations, CI, scripts, and active documentation, with evidence recorded under `audit/deep-line-audit/`.

Confirmed fixes:

- Added explicit rate limiting to authenticated/public social and payment-adjacent API routes before expensive verification/database work:
  - `app/api/messages/tip/route.ts`
  - `app/api/social/content-access/route.ts`
  - `app/api/social/content-purchases/route.ts`
  - `app/api/social/tips/route.ts`
  - `app/api/community/stories/route.ts`
- Added a regression suite proving rate-limit short-circuit behavior for payment/social APIs.
- Aligned `/api/health` with runtime WalletConnect behavior: WalletConnect Project ID is optional, while chain/contract env remains required.
- Added a health regression proving the app remains healthy when WalletConnect is intentionally unset.
- Updated README, deployment/security docs, and env examples so WalletConnect is documented as optional QR/mobile pairing only.
- Fixed the remaining lint warning in `scripts/card-bound-vault-initcode-chunks.ts`.
- Recorded audit findings, reviewed false positives, and command/check evidence in `audit/deep-line-audit/`.

## Verification

Final focused verification was rerun after the last env-template cleanup:

```text
CI=true npx jest __tests__/api/health.test.ts __tests__/api/social-payment-rate-limit.test.ts --runInBand --silent=false --detectOpenHandles
PASS __tests__/api/health.test.ts
PASS __tests__/api/social-payment-rate-limit.test.ts
Test Suites: 2 passed, 2 total
Tests:       1 skipped, 12 passed, 13 total

npm run typecheck
> tsc --noEmit

npm run lint
> eslint . --ext .ts,.tsx --cache --cache-location .eslintcache
```

Notes:

- The health test intentionally logs warnings when simulating missing required env vars; those warnings are expected and the suite passes.
- Final status review found no generated/cache artifacts staged or committed.
