# CI Fix Todo - All Pre-existing Failures

## Completed
- [x] ESLint / TypeScript
- [x] Prettier

## Remaining Failures - Action Plan

### H. Trivy container scan (QUICK FIX)
- [ ] Add `output: 'standalone'` to next.config.ts so Docker build succeeds

### B. Duplicate artifacts HHE1001 (QUICK FIX)
- [ ] Rename BadgeQualificationRules in contracts/future/ to avoid duplicate artifact names
- [ ] VFIDEBridge is identical in contracts/ and contracts/future/ - remove one

### A. Contract Size (CardBoundVaultDeployer + CardBoundVault + MerchantPortal)
- [ ] The deployer embeds full CardBoundVault creation bytecode - refactor to bytecode provider pattern
- [ ] Create ICardBoundVaultBytecodeProvider interface + separate CardBoundVaultBytecodeProvider contract
- [ ] Update CardBoundVaultDeployer to use external bytecode provider
- [ ] Update VaultHub to deploy bytecode provider separately
- [ ] Verify MerchantPortal is under 24576 bytes (needs size check)

### D. Slither zero-findings (testing-pipeline.yml)
- [ ] slither.config.json missing `output` key — causes KeyError: 'output'
- [ ] Fix slither args to work correctly

### E. Governance Safety verifiers
- [ ] VaultHub CardBound integration - gas cap exceeded → fixed by reducing deployer size (A)
- [ ] Seer watcher - REQUIRE_SEER_RUNTIME_REASON_CODES=true causes failure when Seer too large
  - [ ] Fix: update script to not require runtime checks or ensure contract fits

### C. Contracts Unit + Integration (depends on A+B)
- [ ] HHE1001 fixes (same as B)
- [ ] Contract size fixes (same as A)
