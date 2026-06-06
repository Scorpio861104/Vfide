# VFIDE Deployment Readiness Ownership Findings

Branch: `deployment-readiness-ownership-2026-06`  
Base: latest `main` at audit start  
Scope: active deployment/runtime gates, health checks, environment examples, CI deployment stubs, and public deployment documentation.

## Confirmed finding: liveness health required stale/non-runtime env keys

`app/api/health/route.ts` treated `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_CONTRACT_ADDRESS` as required liveness inputs. That did not match the deployed runtime model:

- `lib/wagmi.ts` explicitly treats WalletConnect project IDs as optional. When neither `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` nor `NEXT_PUBLIC_WAGMI_PROJECT_ID` is present, WalletConnect is disabled while injected-browser wallets remain available.
- `lib/validateProduction.ts` marks both WalletConnect keys as optional and validates the canonical token address under `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`, not `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- Active examples and CI stubs still described WalletConnect as required and kept `NEXT_PUBLIC_CONTRACT_ADDRESS` solely so `/api/health` would return 200.

Impact: a valid deployment without WalletConnect would report degraded health, and operators were instructed to set a stale contract key rather than the canonical VFIDE token address used by production validation and contract config.

Fix applied:

- `/api/health` now requires `NEXT_PUBLIC_CHAIN_ID` and `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` only.
- Health tests now use `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` and include regression coverage proving WalletConnect is optional for health.
- Active env examples, README, Vercel guide, and CI health stubs were aligned to the canonical token env key.
- WalletConnect docs now describe the key as optional/recommended for WalletConnect/mobile wallet support rather than deployment-required.

## Gate audit notes

- Release gate still runs typecheck, contract typecheck, lint, route alignment, Jest CI, env validation, runbook/rollback/backup/dual-approval/stop-go gates, and contract invariant checks.
- The release-gate Lighthouse performance step remains `continue-on-error: true` by design and is documented as informational because CI runs frontend-only without live backend services.
- `/api/health/ready` remains the dependency-aware readiness probe for database/Redis/indexer checks. `/api/health` remains cheap liveness and should not block on optional WalletConnect.

## Verification completed

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

