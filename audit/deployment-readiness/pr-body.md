## Summary

Deployment-readiness ownership pass for VFIDE focused on active health checks, production env validation alignment, CI deployment stubs, and deployment docs.

## Confirmed issue fixed

`/api/health` on `main` required `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and stale `NEXT_PUBLIC_CONTRACT_ADDRESS`, but runtime and production validation already treat WalletConnect as optional and use canonical `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` for deployed token configuration.

This could make a valid deployment without WalletConnect report degraded health and pushed operators toward a stale env key solely to satisfy health checks.

## Changes

- Updated `/api/health` to require only `NEXT_PUBLIC_CHAIN_ID` and `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`.
- Added health regression coverage proving WalletConnect is optional for liveness.
- Aligned `.env*` examples, README, Vercel guide, and CI health stubs with canonical `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`.
- Reclassified WalletConnect env docs as optional/recommended for WalletConnect/mobile wallet support.
- Fixed the existing lint warning in `scripts/card-bound-vault-initcode-chunks.ts` so deployment static checks pass cleanly.
- Added deployment-readiness audit evidence under `audit/deployment-readiness/`.

## Verification

```text
CI=true npx jest __tests__/api/health.test.ts --runInBand --silent=false
PASS __tests__/api/health.test.ts
Test Suites: 1 passed, 1 total
Tests:       1 skipped, 9 passed, 10 total

npm run typecheck
STATUS:0
> tsc --noEmit

npm run lint
STATUS:0
> eslint . --ext .ts,.tsx --cache --cache-location .eslintcache
```
