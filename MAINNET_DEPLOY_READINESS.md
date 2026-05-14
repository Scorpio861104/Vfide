# VFIDE Mainnet Deploy Readiness

**As of:** 2026-05-14
**Target:** Base mainnet (chainId 8453)
**Recommended dry-run target:** Base Sepolia (chainId 84532)

This document is the deploy-readiness companion to `AUDIT_CLOSURE_REPORT.md`. The audit is closed; this is the punch-list of things that still need attention before signing the mainnet deploy transaction.

---

## A. Blockers (must address)

These are real gaps that will cause a broken mainnet deploy if not resolved.

### A.1 `PRODUCTION_SET.md` lists contracts that aren't deployed by any script

Cross-referencing `contracts/PRODUCTION_SET.md` (42 deployable entries) against `scripts/deploy-full.ts` (the canonical mainnet path), **the following concrete deployable contracts are listed in PRODUCTION_SET.md but not deployed by deploy-full.ts**:

- `AdminMultiSig` — *actually deployed (Layer 1, line 190); false positive in my earlier diff*
- `CardBoundVault` *(deployed dynamically via `CardBoundVaultDeployer`, not part of bootstrap)*
- `CardBoundVaultDeployer` — **MISSING from deploy-full.ts**. The CREATE2 factory for `CardBoundVault` instances must be deployed before any user creates a vault.
- `CircuitBreaker` — **MISSING**. Concrete contract (extends `VFIDEAccessControl`).
- `DeployPhase3Peripherals` — only needed if you actually call `deployPeripherals()`; it's a deploy-helper. See A.2 below.
- `DutyDistributor` — **MISSING**. Concrete `IGovernanceHooks` implementation.
- `EcosystemVaultLib`, `EcosystemVaultView` — `EcosystemVaultView` IS in deploy-full.ts (Layer 9). The Lib is a Solidity library, deployed implicitly.
- `EscrowManager` — **MISSING**. Concrete. Possibly superseded by `CommerceEscrow` (which IS deployed in Layer 11) — confirm before deciding.
- `RevenueSplitter` — **MISSING**. Concrete.
- `StablecoinRegistry` — **MISSING**. Concrete.
- `VFIDEAccessControl` — base contract; deployed implicitly as a parent of other contracts. Not standalone.
- `VFIDEFinance` — **MISLEADING ENTRY**. The file is `contracts/VFIDEFinance.sol` but the actual contract declaration inside is `EcoTreasuryVault`. Rename the production_set entry or the file.
- `VFIDEPriceOracle` — **MISSING from deploy-full.ts** but deployable via `DeployPhase3Peripherals.deployPeripherals()`. Note: that helper ALSO deploys `BridgeSecurityModule` (a deferred future contract). See A.2.
- `VFIDESecurity` — **STALE ENTRY**. File is at `contracts/legacy/VFIDESecurity.sol`. Remove from production set or move out of legacy/.
- `VaultInfrastructure` — **MISSING**. Concrete.
- `VaultRecoveryClaim` — *actually deployed (Layer 8); false positive in my earlier diff*

**Action:** Before mainnet, Vanta must decide for each unmapped contract:
1. **Add to `deploy-full.ts`** in the correct layer.
2. **Remove from `PRODUCTION_SET.md`** if it's not actually needed at mainnet bootstrap.
3. **Move under `contracts/future/`** if it's a phase-2+ contract.

Recommended quick triage:
- `CardBoundVaultDeployer` — add to Layer 3 (Vault System); needed before any user vault exists.
- `StablecoinRegistry` — add to Layer 4 (Commerce); MerchantPortal/CommerceEscrow check token allowlist against it.
- `VFIDEPriceOracle` — add to Layer 6 (Finance); flash/term loan use price feed.
- `CircuitBreaker`, `DutyDistributor`, `EscrowManager`, `RevenueSplitter`, `VaultInfrastructure` — Vanta's call on whether V1 needs them. If not, remove from production_set.
- `VFIDESecurity` — almost certainly remove (it's in `legacy/`).
- `VFIDEFinance` — rename entry to `EcoTreasuryVault` (or rename the file to match).

### A.2 `DeployPhase3Peripherals` pulls in a deferred contract

`contracts/DeployPhase3Peripherals.sol:4` imports `./future/BridgeSecurityModule.sol`. The helper's `deployPeripherals()` method deploys both `BridgeSecurityModule` (deferred — bridge isn't in V1) AND `VFIDEPriceOracle` (needed in V1).

**Action:** Either
- Refactor `DeployPhase3Peripherals` to drop the BSM deploy (or split into two helpers), OR
- Add `VFIDEPriceOracle` directly to `deploy-full.ts` Layer 6 with its constructor args, and stop using this helper at mainnet.

The second option is cleaner.

### A.3 CI lint job soft-fails ESLint

`.github/workflows/testing-pipeline.yml:311`:
```yaml
- run: npx eslint . --ext .ts,.tsx || true
```

The `|| true` masks ESLint failures. This was likely added during a transition to suppress legacy warnings, but for a mainnet-release branch this should be a hard gate.

**Action:** Either
- Remove `|| true` and clear any remaining ESLint errors (preferred), OR
- Replace with `npx eslint . --ext .ts,.tsx --max-warnings 0` (hard gate with explicit warning budget), OR
- Add a `// TODO before mainnet` comment so it isn't forgotten.

---

## B. Recommended pre-deploy checks (not blockers)

### B.1 Run the full CI pipeline against the current snapshot

The 11-job pipeline in `.github/workflows/testing-pipeline.yml` covers:

| Job | Status check |
|---|---|
| `contract-tests` | Hardhat unit + integration + gas report |
| `coverage` | 80% threshold on statements/branches/functions/lines |
| `contract-size` | 24KB EIP-170 limit + size-buffer headroom |
| `slither` | Static analysis with SARIF + JSON output |
| `mythril` | Symbolic execution on critical contracts (main-branch push only) |
| `api-tests` | API routes with Postgres + Redis services |
| `frontend-tests` | Jest + RTL component tests |
| `infra-tests` | Docker + migration configuration tests |
| `security-regressions` | 44-finding regression suite |
| `e2e-tests` | Playwright (PR + main only) |
| `lint` | Solhint + Prettier (ESLint soft-gated, see A.3) |

Plus supporting workflows: `security.yml` (npm-audit, CodeQL, eslint-security, secrets-scan, slither, trivy), `governance-safety.yml`, `release-gate.yml`, `seer-watcher.yml`, `security-replay-monitor.yml`, `codecov.yml`.

**Action:** Run all of these on the v20 snapshot. Anything red is a blocker. The mythril gate runs only on `push` to `main`; if mainnet deploy is from a release branch, temporarily enable mythril on that branch too.

### B.2 Slither + Mythril manual sweep (defense in depth)

Even though both run in CI, run them locally once with verbose output:

```bash
slither . --config-file slither.config.json
./scripts/run-mythril.sh --critical-only
```

Treat any informational finding involving the Layer 1 contracts (`VFIDEToken`, `Seer`, `VaultHub`, `DAO`, `DAOTimelock`) as worth a read-through even if low-severity.

### B.3 Echidna invariant fuzzing — optional but valuable

Not currently in the CI pipeline. The contracts most worth fuzzing for invariants:

- `VFIDEToken` — total supply conservation, vault-to-owner resolution
- `Seer` — score never exceeds 10_000, score never drops below 0
- `FeeDistributor` — sum of channel splits ≤ 100%
- `EmergencyControl` — threshold ≤ memberCount after every member transition
- `ServicePool` (abstract; test concrete pools) — payout never exceeds `MAX_PAYOUT_CEILING`

If you have an afternoon before mainnet, this catches the failure modes static analysis misses.

### B.4 Base Sepolia dry-run

Before mainnet, do a full dry-run:

```bash
npx hardhat run scripts/deploy-full.ts --network baseSepolia
# wait 48h
npx hardhat run scripts/apply-full.ts --network baseSepolia
# re-run apply-full.ts every 48h until it reports "All wiring complete"
```

The wiring (token module setters, system-exemptions, DAO role transfers, ProofLedger logger registrations) is timelocked to 48h on the production path. Verify on testnet that:

- Resume-from-crash works: kill the script mid-run, restart, confirm `.deployments/<network>.json` is honored and no contracts re-deploy.
- VFIDETestnetFaucet deploys when `DEPLOY_TESTNET_FAUCET=true` on testnet, skips otherwise.
- Each propose-then-apply cycle (48h) completes without revert.
- Etherscan verification succeeds for every contract address in `.deployments/baseSepolia.json`.

### B.5 Bootstrap addresses

`scripts/deploy-full.ts` reads from a `bootstrap` object: `dao`, `admin`, `beneficiary`, `treasurySink`, `ledgerAdmin`, `poolAdmin`, `sanctumSink`, `burnSink`, `ecosystemSink`, `feeSink`, `faucetOwner`. Each must be the right multisig / EOA at mainnet time. Common mistakes:

- `bootstrap.dao` set to the deployer address (the script auto-rewires later — confirm `apply-full.ts` actually completes the rewire).
- `bootstrap.admin` is the same as `bootstrap.dao` (intended for some flows, but verify per contract).
- Sinks pointing to a personal EOA instead of the AdminMultiSig.

Read `bootstrap` resolution logic in `deploy-full.ts` and confirm every value is intentional.

### B.6 Token launch path

The userMemories record token launch via **Liquidity Bootstrapping Pool (Fjord Foundry)**, not a fixed-price presale (presale was removed). Before mainnet:

- Confirm the LBP terms are signed off (initial weights, weight-shift schedule, duration).
- The deployer-held 50M dev reserve goes into `DevReserveVestingVault` (Layer 1, line 200). Confirm vesting cliff + schedule match the public commitment.
- The 150M system allocation goes to `bootstrap.treasury` (`AdminMultiSig`). Confirm.

### B.7 Frontend env variables

After mainnet contract addresses are known, every `NEXT_PUBLIC_*_ADDRESS` env var listed in `lib/validateProduction.ts` must be set. The startup validator fails-closed in production for blockchain addresses (`production: true` flag). Run the frontend in `NODE_ENV=production` against the mainnet address book before going live to confirm no validation errors.

### B.8 Monitoring + alerting

The repo has `security-replay-monitor.yml` (scheduled) and `seer-watcher.yml`. Verify before mainnet:

- Sentry DSN is set (`SENTRY_DSN`); the `beforeSend` hook scrubs `SENSITIVE_HEADERS` (verified in `sentry.server.config.ts`).
- The webhook-replay-metrics endpoint has a machine token configured for the monitor.
- Set up an external uptime monitor (UptimeRobot, BetterStack, etc.) hitting `/api/health` from outside your infrastructure.
- For on-chain monitoring, register the deployed addresses with Forta / OpenZeppelin Defender (or equivalent) for anomaly detection.

### B.9 Post-deploy Etherscan source verification

After every contract deploys on mainnet, verify source on Basescan:

```bash
npx hardhat verify --network base <address> <constructor args...>
```

For `CardBoundVault` instances spawned per-user via the CREATE2 factory, each new vault address needs verification — this is unusual but documented in `PRODUCTION_SET.md` under "Per-Vault Auxiliary Contracts". Consider automating this via a Basescan API integration that runs whenever a new vault address is observed.

---

## C. Soft observations (worth a look but not required)

- **`scripts/deploy-all.ts` vs `scripts/deploy-full.ts`** — both exist and overlap. `deploy-all.ts` covers Layers 1-7 (18 contracts); `deploy-full.ts` covers Layers 1-11 (~25 contracts) plus more wiring. For clarity, consider deleting `deploy-all.ts` (or marking it deprecated) so there's one canonical deploy path. Right now a future contributor could reasonably pick the wrong one.

- **DAO bootstrap timing** — `deploy-full.ts` passes `bootstrap.dao` to most constructors that need a DAO reference, then transfers ownership to the real DAO via `setDAO()` after the DAO contract itself is deployed. This works, but means the deployer EOA holds temporary DAO-equivalent privilege for the duration of the deploy. Audit step: confirm there's no window where the deployer can perform an action that survives the rewire (e.g., setting a malicious oracle that the DAO can't easily reverse).

- **`apply-full.ts` re-runnability** — the script is documented as "re-run every 48h until it reports 'All wiring complete'". Verify on testnet that this is actually idempotent — a re-run after partial completion shouldn't propose duplicate timelocks or revert.

---

## D. Sign-off checklist

Before signing the mainnet deploy transaction, confirm:

- [ ] All A.1 / A.2 / A.3 blockers resolved.
- [ ] CI pipeline green on the deploy commit (all 11 jobs + supporting workflows).
- [ ] Slither + Mythril manual sweeps reviewed.
- [ ] Base Sepolia dry-run completed successfully (deploy + multiple apply cycles + frontend integration).
- [ ] Bootstrap addresses (B.5) reviewed line-by-line against signed governance doc.
- [ ] LBP launch terms (B.6) signed off.
- [ ] Frontend env vars (B.7) prepared and tested against testnet first.
- [ ] Monitoring + alerting (B.8) live and tested.
- [ ] Etherscan verification plan (B.9) ready, with API key in place.
- [ ] Multisig signers confirmed and have tested signing on testnet.
- [ ] Emergency response: who has authority to call which pause / DAO-recovery function, documented and rehearsed.
- [ ] Backup of `.deployments/base.json` plan after each contract — that file is the canonical address book; if it's lost mid-deploy, recovery is painful.

---

## E. Post-deploy first-24h watchlist

In the first 24 hours after mainnet:

1. **Block-by-block:** Monitor `ProofLedger` event emission rate. Silence = something is mis-wired (a logger not registered).
2. **Hourly:** Confirm `VFIDEToken` total supply matches expected (`50M dev + 150M treasury + 0 elsewhere = 200M`). Any deviation requires immediate investigation.
3. **First user vault creation:** Walk a test user through the full flow (create vault → set guardians → deposit → recover). The CREATE2 vault factory is the most user-facing new contract; UX issues here will be the loudest if they exist.
4. **First merchant payment:** Watch `MerchantPortal.processPayment` succeed end-to-end including fee distribution to all 5 channels and Seer reward emissions.
5. **First flash loan:** Watch `VFIDEFlashLoan` complete a borrow-call-repay cycle with the fraud registry check passing.
6. **DAO proposal:** File a no-op DAO proposal (e.g., `setMinForGovernance(5400)` — same value, just to exercise the path). Confirm proposing, voting, queuing, and execution all work.

If all six of the above succeed in the first 24h, the mainnet bootstrap is healthy.

---

**Last reviewed:** 2026-05-14, end of audit-closure session.
