# VFIDE Mainnet Deploy Readiness

**Original as of:** 2026-05-14
**Last updated:** 2026-05-17 (Tier 2 closure)
**Target:** Base mainnet (chainId 8453)
**Recommended dry-run target:** Base Sepolia (chainId 84532)

This document is the deploy-readiness companion to `AUDIT_CLOSURE_REPORT.md`. The audit is closed; this is the punch-list of things that still need attention before signing the mainnet deploy transaction.

> **2026-05-16 status update.** Operations Phase reconciled this document against the actual repo state and closed all Section A blockers. **A.1 ✓ RESOLVED, A.2 ✓ RESOLVED, A.3 ✓ RESOLVED.** Section B (pre-deploy checks) and Section D (sign-off checklist) remain for testnet/mainnet day-of work.

> **2026-05-17 status update.** Tier 2 (frontend sample-data conversion) COMPLETE. All 11 in-scope tabs now read from real contracts; council pages have honest V1-deferral copy; 2 new detail routes (`/sanctum/charities/[id]`, `/governance/proposal/[id]`) shipped. CreateTab supports 10 DAO templates with URL-param deep-linking from any surface. See VFIDE_TIER2_PLAN.md for the per-phase record. Frontend is ready for the testnet dry-run.

---

## A. Blockers (must address)

These are real gaps that will cause a broken mainnet deploy if not resolved.

### A.1 `PRODUCTION_SET.md` lists contracts that aren't deployed by any script

**Status (2026-05-16, Operations Phase Turn 4): RESOLVED.** All 10 originally flagged items now have explicit dispositions:
- ✓ `VFIDEPriceOracle` — deployed directly in `deploy-full.ts` line 353 (see A.2)
- ✓ `CardBoundVaultDeployer` — constructor-spawned by VaultHub at deploy time (false positive in original audit; always deployed implicitly)
- ✓ `EscrowManager` — file deleted in Phase 3e (2026-05-15); PRODUCTION_SET.md retains "REMOVED" record
- ✓ `VFIDESecurity` — entry was already a transparent legacy classification ("Not deployed at V1"). The misleading reference in `EmergencyControl.sol` header was the real issue, fixed 2026-05-16
- ✓ `VFIDEFinance` — file renamed to `EcoTreasuryVault.sol` 2026-05-16; build scripts, test files, source-read assertions updated
- ✓ `CircuitBreaker` — moved to `contracts/legacy/` 2026-05-16. V1's actual circuit breaker is the token-level `VFIDEToken.setCircuitBreaker` flag
- ✓ `VaultInfrastructure` — moved to `contracts/legacy/` 2026-05-16. VaultHub's public mappings provide the lookup surface VaultRegistry needs
- ✓ `DutyDistributor` — deferred to future 2026-05-16. Howey story load-bears on FeeDistributor + ServicePool architecture; this is a nice-to-have alternative IGovernanceHooks impl. Frontend marketing trimmed.
- ✓ `StablecoinRegistry` — deferred to future 2026-05-16. V1 is VFIDE-only by architectural decision. API routes already gracefully degrade.
- ✓ `RevenueSplitter` — kept in production_set as user-deployable template (each merchant deploys their own instance with payee config). Not a bootstrap singleton; same pattern as `CardBoundVault`.

Cross-referencing `contracts/PRODUCTION_SET.md` against `scripts/deploy-full.ts` (the canonical mainnet path):

Original flagged items from 2026-05-14 audit:

- `AdminMultiSig` — *actually deployed (Layer 1, line 190); false positive in original diff*
- `CardBoundVault` *(deployed dynamically via `CardBoundVaultDeployer`, not part of bootstrap)*
- `CardBoundVaultDeployer` — **STILL MISSING from deploy-full.ts**. The CREATE2 factory for `CardBoundVault` instances must be deployed before any user creates a vault. **(Pending triage)**
- `CircuitBreaker` — **STILL MISSING**. Concrete contract (extends `VFIDEAccessControl`). **(Pending triage)**
- `DeployPhase3Peripherals` — only needed if you actually call `deployPeripherals()`; A.2 fix means it's no longer called.
- `DutyDistributor` — **STILL MISSING**. Concrete `IGovernanceHooks` implementation. **(Pending triage)**
- `EcosystemVaultLib`, `EcosystemVaultView` — `EcosystemVaultView` deployed in Layer 9. The Lib is a Solidity library, deployed implicitly.
- `EscrowManager` — ✓ RESOLVED. Deleted in Phase 3e (2026-05-15) after audit confirmed createEscrow was a revert stub and no function populated the escrows mapping. PRODUCTION_SET.md retains a "REMOVED" record for traceability.
- `RevenueSplitter` — **STILL MISSING**. Concrete. **(Pending triage — likely redundant with FeeDistributor)**
- `StablecoinRegistry` — **STILL MISSING**. Concrete. **(Pending triage)**
- `VFIDEAccessControl` — base contract; deployed implicitly as a parent of other contracts. Not standalone.
- `VFIDEFinance` — ✓ RESOLVED. File renamed to `EcoTreasuryVault.sol` 2026-05-16; references updated across build scripts, test files, and PRODUCTION_SET.md.
- `VFIDEPriceOracle` — ✓ RESOLVED. Deployed directly at `deploy-full.ts:353` (see A.2 below).
- `VFIDESecurity` — ✓ RESOLVED (different from originally proposed). PRODUCTION_SET.md entry is a correct transparent legacy classification, NOT a stale entry. Real issue was the misleading "you have in VFIDESecurity.sol" comment in `EmergencyControl.sol:15`, fixed 2026-05-16 to clarify the breaker is wired generically via `setModules`.
- `VaultInfrastructure` — **STILL MISSING**. Concrete. **(Pending triage)**
- `VaultRecoveryClaim` — *actually deployed (Layer 8); false positive in original diff*

**Remaining action:** Vanta must decide for each of the 6 pending-triage contracts:
1. **Add to `deploy-full.ts`** in the correct layer.
2. **Remove from `PRODUCTION_SET.md`** if it's not actually needed at mainnet bootstrap.
3. **Move under `contracts/future/`** if it's a phase-2+ contract.

### A.2 `DeployPhase3Peripherals` pulls in a deferred contract

**Status (2026-05-16): RESOLVED.** `VFIDEPriceOracle` is now deployed directly in `scripts/deploy-full.ts` line 353 with constructor args from `ARGS_VFIDEPRICEORACLE` env. The comment block at line 334 documents this is the "A.2 FIX (MAINNET_DEPLOY_READINESS.md)." The `DeployPhase3Peripherals.deployPeripherals()` helper is no longer called by `deploy-full.ts` (only referenced in an explanatory comment). `BridgeSecurityModule` is therefore not dragged into V1 deployment.

The helper file (`contracts/DeployPhase3Peripherals.sol`) remains in the repo but is not in the V1 deploy path. Decision on whether to delete the helper outright is a documentation/cleanliness call; it does not affect mainnet behavior.

Historical context (preserved):

> `contracts/DeployPhase3Peripherals.sol:4` imports `./future/BridgeSecurityModule.sol`. The helper's `deployPeripherals()` method deploys both `BridgeSecurityModule` (deferred — bridge isn't in V1) AND `VFIDEPriceOracle` (needed in V1). Resolved by inlining the `VFIDEPriceOracle` deploy into `deploy-full.ts` directly.

### A.3 CI lint job soft-fails ESLint

**Status (2026-05-16): RESOLVED.** `.github/workflows/testing-pipeline.yml` line 311 now reads:

```yaml
- run: npx eslint . --ext .ts,.tsx --max-warnings 0
```

No `|| true` soft-fail; ESLint is a hard gate. Historical `|| true` was found in `.github/workflows/security.yml:100` but on inspection that is a different job (security tooling fallback, intentional graceful-degrade pattern, not a lint mask).

Historical context (preserved):

> Earlier the workflow read `npx eslint . --ext .ts,.tsx || true` which masked ESLint failures. This was likely added during a transition to suppress legacy warnings, but for a mainnet-release branch this needed to be a hard gate. Resolved by removing the `|| true` and confirming the lint suite passes.

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

## F. Frontend readiness (added 2026-05-17)

Tier 2 closed 2026-05-17 with all sample-data surfaces converted to real on-chain data. The frontend is ready for testnet integration testing.

**What changed in Tier 2:**
- 11 tabs across `/sanctum`, `/treasury`, `/enterprise`, `/council` converted to real reads
- 2 new detail routes: `/sanctum/charities/[id]` and `/governance/proposal/[id]`
- 2 new foundation hooks: `useSanctumVault` (296+88 LOC), `useEnterpriseTreasury` (~280 LOC)
- EcoTreasuryVault address mapping wired through `lib/contracts.ts` + `lib/validateProduction.ts`
- CreateTab gained 5 new DAO templates (3 SanctumVault + 2 EcoTreasuryVault) on top of the 5 from Tier 1
- URL-param deep-linking protocol established for cross-surface DAO routing

**What is intentionally NOT live on the frontend at V1:**
- Council pages (`app/council/*`) display preview content with explicit "Coming in a future release" copy. The CouncilManager / CouncilSalary / CouncilElection contracts live in `contracts/future/` and require `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED=true` to activate. Pages stay in nav as preview surfaces.
- Cross-contract event timelines (e.g. "Recent Distributions" panel on `/treasury/overview`). Per-channel histories exist at `/sanctum/history` and `/treasury/revenue`; a unified protocol-wide timeline is a Tier 3 indexer concern.
- Multi-token treasury display (USDC, ETH, etc balances). EcoTreasuryVault supports `getMultiTokenBalances(tokens[])`, but which tokens to display is an operator config decision logged as a Tier 3 followup.
- /developer page no longer shows the SampleDataBanner — it's documentation/SDK reference, not data.

**Pre-mainnet frontend checklist:**
- [ ] All env vars set per `NEXT_PUBLIC_*` mappings in `lib/contracts.ts` (including the new `NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS`)
- [ ] Verify each converted tab loads against the testnet deployment (visual smoke test)
- [ ] Verify each DAO template's URL-param prefill works end-to-end (e.g. open `/governance?template=rejectDisbursement&prefill=...` from `/sanctum?tab=disbursements`)
- [ ] Verify `/sanctum/charities/[id]` resolves for a real registered charity address
- [ ] Verify `/governance/proposal/[id]` resolves for a real proposal ID
- [ ] Verify Council pages render correctly when `NEXT_PUBLIC_FUTURE_FEATURES_ENABLED=false` (the default at V1)

---

**Last reviewed:** 2026-05-17, end of Tier 2 closure session.

## G. R78 / R78-fix — Contract fixes + frontend wiring (2026-05-18)

All remaining contract audit findings re-applied (after git checkout clobbered R77):

**Contract fixes (all verified compiling with solc 0.8.30, zero errors):**
- `VFIDETermLoan.sol`: TL-EDGE-01/02/03/04 — changed `>` → `>=` and `<=` → `<` for deadline/grace period boundary comparisons
- `ProofScoreBurnRouter.sol`: Added `uint16 constant BPS_SCALE = 10_000`; replaced all 4 magic-number `10000` literals
- `VaultHub.sol`: Added `cardBoundVaultDeployer() external view returns (address)` for deployer address introspection
- `FraudRegistry.sol`: Cached `.length` in all 3 loops; added explicit braces to single-statement `if` bodies
- `CardBoundVaultPaymentQueueManager.sol`: `cancelLargePaymentThreshold()` — completes apply+cancel symmetry
- `CardBoundVault.sol`: Interface method + event + delegating wrapper for `cancelLargePaymentThreshold`
- `MerchantPortal.sol`: `refundId` as first indexed param in `RefundInitiated`; public mappings; getters

**ABI regen:** All 40 ABIs regenerated from fixed contracts via `regen_abis.py`.

**ABI index:** Added `CardBoundVaultInheritanceManagerABI`, `CardBoundVaultWithdrawalQueueManagerABI`, `CardBoundVaultDeployerABI` to `lib/abis/index.ts`.

**Frontend wiring:**
- `VaultContent.tsx`: `useVaultTransactions` wired; real event-log data passed to `TransactionHistory`
- `TransactionHistory.tsx`: `VaultTransaction` type imported from hook (eliminates parallel type definition)
- `ClaimFlowModal.tsx`: `useChallengePeriodPreview` wired; challenge period label shown dynamically in UI

**Deploy script:**
- `scripts/deploy-full.ts`: Captures `CardBoundVaultDeployer` address via `hub.cardBoundVaultDeployer()` post-deploy
- Added `NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS` to `.env` output block

**TypeScript:**
- Resolved TS1261/TS1149 file-casing conflicts (`Card.tsx`/`card.tsx`, `Button.tsx`/`button.tsx`)
- `ButtonVfide.tsx` created (preserves custom VFIDE variants: `primary`, `leftIcon`, `fullWidth`)
- Zero TS1xxx syntax errors remain; all remaining errors are pre-existing TS2xxx semantic errors

**Commits:** R78 → `f57e1354`, casing fix → `55705ba1`, ABI index + ClaimFlowModal → in progress

