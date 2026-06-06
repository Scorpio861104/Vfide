# Vfide Deployment Readiness Report

Branch: `production-readiness/cardbound-no-worries`

## Summary

This branch moves Vfide closer to a deployable production posture by replacing fragile monolithic `CardBoundVault` deployment assumptions with chunked initcode guardrails, synchronizing frontend ABIs with compiled artifacts, hardening local verifier startup, and adding evidence-backed contract and frontend readiness gates.

The repository is not ready for irreversible mainnet deployment without final production secrets, deployment manifests, and one remaining contract-size reduction: `CardBoundVault` still exceeds the EIP-170 runtime bytecode limit and is tracked under an explicit temporary ceiling rather than considered production-safe for networks that enforce the hard limit.

## Changes made

- Added a TypeScript `CardBoundVault` initcode chunk generator/checker and wired stale-chunk checks into contract verification.
- Generated `CardBoundVaultInitCodeChunk0..3` from current compiled creation bytecode.
- Updated deployment/verifier flows for chunked initcode, `CardBoundVaultDeployer`, `VaultHub`, and cloneable vault manager dependencies.
- Hardened local Hardhat verifier wrappers to wait for a real JSON-RPC `eth_blockNumber` result before running verifiers.
- Updated frontend ABI files from Hardhat artifacts and verified frontend ABI parity.
- Updated contract size policy comments so only current acknowledged over-limit contracts are tracked.
- Preserved frontend-only/testnet-safe environment validation for sandbox validation while documenting missing production addresses/secrets.

## Verification evidence

### Contract gates

Passed:

- `npm run -s contract:initcode-chunks:check`
  - `CardBoundVault` creation bytecode: `31571` bytes.
  - Chunk sizes: `[8000,8000,8000,7571]`.
- `npm run -s contract:verify:card-bound-vault:local`
  - `CardBoundVault security verification passed`.
- `npm run -s contract:verify:vault-hub-cardbound:local`
  - `VaultHub CardBound integration verification passed`.
- Static/guardrail suite captured in `static-gates.log`:
  - Contract typecheck passed.
  - Scoped Prettier check passed.
  - EIP-1271 guard passed.
  - Deployment graph verifier skipped because no deployment manifest was provided.

Known contract deployment blocker:

- `CardBoundVault` runtime remains above EIP-170 and is tracked under the acknowledged ceiling in `scripts/verify-contract-size-buffer.ts`. It must be reduced below `24,576` runtime bytes before production deployment to networks enforcing EIP-170.

### Frontend gates

Passed in `frontend-light-gates.log`:

- `npm run -s typecheck`
- `npm run -s check:routes`
  - Route alignment check passed.
- `npm run -s check:abi-parity`
  - ABI filename parity passed.
- `npm run -s contract:verify:frontend-abi-parity`
  - ABI parity passed for 54 mapped frontend ABIs.
- `npm run -s contract:verify:frontend-guardrails`
  - Frontend contract guardrails passed.
- `npm run -s lint`
- `npm run -s test:frontend:critical-routes`
  - 60 passed test suites, 3 skipped.
  - 170 passed tests, 9 skipped.

Production env validation:

- Passed in frontend-only/testnet-safe mode with:
  - `FRONTEND_SELF_CONTAINED=true`
  - `APP_ORIGIN=http://localhost:3000`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `NEXT_PUBLIC_IS_TESTNET=true`

Frontend build status:

- `next build` was attempted multiple times in this sandbox.
- Without swap, the process reached high memory pressure and was killed with `EXIT=137` while Turbopack was creating the optimized production build.
- With limited swap, the filesystem filled and Turbopack panicked in infrastructure code before producing an application stack trace.
- This is documented as a sandbox resource/filesystem blocker, not a proven application compile failure. A production CI runner with more memory and disk should run `npm run build` before deployment approval.

## Remaining deployment requirements

- Reduce `CardBoundVault` below EIP-170 runtime size before production deployment on enforcing networks.
- Run `npm run build` successfully on a larger CI/deployment runner.
- Provide real production environment variables, contract addresses, RPC URLs, and secrets.
- Provide a real deployment manifest and run deployment graph verification with `DEPLOYMENT_FILE=<path>`.
- Perform an explicit deployment approval step before any live-network transaction.

## Deployment recommendation

Do not execute irreversible live deployment from this branch yet. Merge only after review if the goal is to land the safety, verifier, ABI, and frontend-readiness improvements. Treat the remaining production deployment blockers above as release-gating items.
