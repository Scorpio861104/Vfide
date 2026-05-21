# Vfide Full Mainnet Readiness — Continuation TODO

## Current PR
- Branch: `mainnet-readiness/full-slither-clean`
- HEAD: `b161430` (EIP-3860 plan + CI gate)
- PR: #235 OPEN

## Already Complete in PR #235
- [x] Slither: 0 findings across all severities (HIGH/MED/LOW/INFO/OPT)
- [x] CI: zero-findings enforcement (security.yml + testing-pipeline.yml)
- [x] CI: EIP-3860 initcode size verification gate (intentionally failing → blocks merge until fixed)
- [x] Hardhat tests: 74 passing / 1 pre-existing VaultHub initcode failure (documented)
- [x] EIP170_SIZE_REFACTOR_PLAN.md (phased deferral plan)

## Uncommitted In Working Tree
- [x] `package.json`: react/react-dom unified to 19.2.5 (fixes peer dep mismatch → unlocked +2,126 jest passing)
- [x] `lib/abis/*` (33 files): synced to live contract source via scripts/sync-abis.ts
- [x] `components/wallet/QuickWalletConnect.tsx`: new component + `selectPrimaryConnector` helper (3 dedicated tests pass)

## Active Work (this session)
- [ ] Re-verify baselines: typecheck, lint (no --fix!), abi-parity, slither
- [ ] Frontend jest sweep — current 6,880 passing / 1,425 failing
  - [ ] Create `lib/auth/validation.ts` exposing `validateBody`, `validateQueryParams`, `validateParams` (24 API tests need it)
  - [ ] Identify and `describe.skip` orphan tests pointing at definitively deleted modules (~30 tests)
  - [ ] Patch abi-parity.test.ts false positives (static parser sees literal `'approve'` and assumes PayrollManager target instead of erc20Abi)
- [ ] Commit + push working tree to PR #235
- [ ] Re-run jest to measure improvement

## Deferred (by design — needs human + audit)
- CardBoundVault + VaultHub size refactor (storage-slot risk on user funds)
- PR-A (SeerAutonomous +0.3% / VFIDEToken +3%) — small enough to attempt, schedule next
- PR-B (EcosystemVault +4% / MerchantPortal +6%) — schedule after PR-A

## DO NOT RUN
- `npm run lint -- --fix` — strips `// eslint-disable-next-line` directives
- Touch CardBoundVault.sol or VaultHub.sol storage layout unsupervised
