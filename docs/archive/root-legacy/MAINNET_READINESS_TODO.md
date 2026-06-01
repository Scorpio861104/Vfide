# Mainnet Readiness — Active Todo

## C) Verify PR #235 safety
- [ ] Run `npx hardhat test` on `mainnet-readiness/full-slither-clean`
- [ ] Capture pass/fail summary, skipped tests, gas report
- [ ] If any failures: triage (regression vs pre-existing) and fix
- [ ] Save full test log to `/workspace/hardhat_test_run.log`

## D1) Lock in the Slither gain — CI gate
- [ ] Create `.github/workflows/slither.yml`
- [ ] Job: install Node 22, npm ci, install slither + solc-select, run slither
- [ ] Fail on any non-zero finding count
- [ ] Push as new branch + PR (so it lands AFTER #235)

## D2) EIP-170 size refactor — `CardBoundVaultDeployer`
- [ ] Identify all 6 oversized contracts and their sizes
- [ ] Decompose `CardBoundVaultDeployer` (55,334 bytes) — primary target
- [ ] Strategy: extract initialization helpers into libraries; split deployer
      into a thin "factory" + a "config-binder" library
- [ ] Verify per-contract bytecode <= 24,576 bytes after refactor
- [ ] Verify initcode <= 49,152 bytes
- [ ] Run `npx hardhat compile` — no size warnings
- [ ] Run `npx hardhat test` — must still pass
- [ ] Run slither — must still be 0 findings
- [ ] New branch, new PR (separate from #235)

## D3) Optional follow-ups (not blocking)
- [ ] Recommend audit firms list
- [ ] Suggest fuzz / invariant test targets (Foundry / Echidna)
- [ ] Document operational setup (multisig, timelock) checklist
