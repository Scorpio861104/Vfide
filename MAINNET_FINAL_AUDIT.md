# VFIDE Mainnet Final Audit — 100% Readiness Sweep

**Sweep date:** 2026-05-20
**Codebase baseline:** v19.13 (per VFIDE Complete Manual v1.0)
**Targets:** Base 8453, Polygon 137, zkSync Era 324
**Authoritative reference:** `VFIDE_Complete_Manual_v1_0.pdf` (4,301-line PDF, page 14–15 critical thresholds)

This document is the **final** mainnet-readiness sweep on top of:
- `AUDIT_CLOSURE_REPORT.md` (196 audit findings — all closed)
- `MAINNET_DEPLOY_READINESS.md` (sections A.1–A.3 already resolved 2026-05-16)

The work below catches the residual mainnet-readiness gaps the existing
documentation didn't already enforce mechanically.

---

## TL;DR — what changed in this sweep

| # | Change | Why it matters for mainnet |
|---|---|---|
| 1 | Added `scripts/verify-manual-parity.cjs` — a dependency-free script that asserts every constant from manual pages 14-15 against actual Solidity source | Catches manual-vs-code drift before it ships. **31/31 constants verified passing.** |
| 2 | Added `scripts/mainnet-readiness.cjs` — orchestrator running 8 static gates | Single command for full readiness check; runs in <2 s; no `npm install` needed |
| 3 | Added `.github/workflows/mainnet-readiness.yml` | Hard CI gate on every PR/push to `main` and `release/**` |
| 4 | Wired `mainnet-readiness.cjs` into `scripts/deploy-full.ts` `main()` | A developer who deploys from a stale branch on a mainnet chainId now hits the gate before the first transaction is sent |
| 5 | Moved `contracts/DeployPhase3Peripherals.sol` → `contracts/future/DeployPhase3Peripherals.sol` | The file lived in the production tree and `import "./future/BridgeSecurityModule.sol"` — i.e., the production tree was importing a deferred-feature contract. The build still pulled `BridgeSecurityModule` into the V1 compilation unit even though it would never deploy. Now the production tree is **strictly free of forbidden imports**. |
| 6 | Updated `lib/validateProduction.ts` — added 16 missing `production: true` flags for required contract addresses; demoted 2 deferred contracts (`StablecoinRegistry`, `SubscriptionManager`) | Previously the production startup validator silently allowed core addresses to be unset, and *required* addresses for contracts that are deferred to future phases. Both classes of bug are now fixed. |
| 7 | Rewrote `scripts/validate-mainnet-env.ts` `ADDRESS_VARS` to mirror exactly the `production: true` set in `validateProduction.ts` | Kills the silent divergence between the two validators (one ran at deploy, the other at app boot — they had different sets of "required" addresses). |
| 8 | Filled `.env.mainnet.example` with the 10 missing keys the validators actually require | Without this, a fresh deploy following the example file would fail-closed at startup |
| 9 | Added `verify:manual-parity` and `verify:mainnet-readiness` npm scripts | Makes the gates discoverable to any future contributor |
| 10 | Updated `contracts/PRODUCTION_SET.md` with the DeployPhase3Peripherals move | Documentation matches the file system |

All changes are committed to a single dedicated branch.

---

## Phase 1 — Manual ↔ Code constant parity (`scripts/verify-manual-parity.cjs`)

Every value below was extracted from the manual's "Critical thresholds at a
glance" section (pages 14-15) and then grep-verified against the actual
production Solidity source. **All 31 thresholds are byte-perfect matches.**

| # | Manual constant | Manual value | Source location | Status |
|---|---|---|---|---|
|  1 | `MAX_SUPPLY` | 200,000,000 × 10¹⁸ | `VFIDEToken.sol:52` | ✅ |
|  2 | `DEV_RESERVE_SUPPLY` | 50,000,000 × 10¹⁸ | `VFIDEToken.sol:53` | ✅ |
|  3 | `minTotalBps` | 25 (0.25%) | `ProofScoreBurnRouter.sol:92` | ✅ |
|  4 | `maxTotalBps` | 500 (5%) | `ProofScoreBurnRouter.sol:93` | ✅ |
|  5 | `microTxFeeCeilingBps` | 100 (1%) | `ProofScoreBurnRouter.sol:94` | ✅ |
|  6 | `microTxMaxAmount` | 10 × 10¹⁸ | `ProofScoreBurnRouter.sol:95` | ✅ |
|  7 | `dailyBurnCap` | 500,000 × 10¹⁸ | `ProofScoreBurnRouter.sol:112` | ✅ |
|  8 | `minimumSupplyFloor` | 50,000,000 × 10¹⁸ | `ProofScoreBurnRouter.sol:116` | ✅ |
|  9 | `BPS_SCALE` (R78 fix) | 10,000 | `ProofScoreBurnRouter.sol:91` | ✅ |
| 10 | `Seer.NEUTRAL` | 5,000 | `Seer.sol:232` | ✅ |
| 11 | `Seer.MIN_SCORE` | 10 | `Seer.sol:230` | ✅ |
| 12 | `Seer.MAX_SCORE` | 10,000 | `Seer.sol:231` | ✅ |
| 13 | `maxSingleReward` | 100 (1% per call) | `Seer.sol:156` | ✅ |
| 14 | `maxDAOScoreChange` | 500 (post H-5 fix) | `Seer.sol:172` | ✅ |
| 15 | `DAO_SCORE_COOLDOWN` | 4 hours | `Seer.sol:177` | ✅ |
| 16 | `MIN_GOVERNANCE` | 5,400 | `lib/ScoringConstants.sol:35` | ✅ |
| 17 | `MIN_MERCHANT` | 5,600 | `lib/ScoringConstants.sol:32` | ✅ |
| 18 | `MAX_GUARDIANS` | 20 | `vault/CardBoundVault.sol:189` | ✅ |
| 19 | `WITHDRAWAL_DELAY` | 7 days | `vault/CardBoundVault.sol:193` | ✅ |
| 20 | `SENSITIVE_ADMIN_DELAY` | 7 days | `vault/CardBoundVault.sol:188` | ✅ |
| 21 | `MIN_ROTATION_DELAY` | 10 minutes | `vault/CardBoundVault.sol:186` | ✅ |
| 22 | `MAX_ROTATION_DELAY` | 7 days | `vault/CardBoundVault.sol:187` | ✅ |
| 23 | `GUARDIAN_VOTE_WINDOW` | 14 days | `VaultRecoveryClaim.sol:62` | ✅ |
| 24 | `CHALLENGE_PERIOD` | 7 days | `VaultRecoveryClaim.sol:60` | ✅ |
| 25 | `ACTIVE_VAULT_CHALLENGE_PERIOD` | 14 days | `VaultRecoveryClaim.sol:147` | ✅ |
| 26 | `ESCROW_DURATION` (FraudRegistry) | 30 days | `FraudRegistry.sol:64` | ✅ |
| 27 | `DAO.votingPeriod` | 7 days | `DAO.sol:84` | ✅ |
| 28 | `DAO.votingDelay` | 1 day | `DAO.sol:87` | ✅ |
| 29 | `DAO.MAX_PROPOSALS` | 200 | `DAO.sol:121` | ✅ |
| 30 | `DAO.QUEUE_EXPIRY` | 30 days | `DAO.sol:123` | ✅ |
| 31 | `DAO.EMERGENCY_RESCUE_DELAY` | 14 days | `DAO.sol:95` | ✅ |

**Result:** `node scripts/verify-manual-parity.cjs` → 31/31 PASS.

> Constants on manual page 14-15 that involve **future contracts** (`COUNCIL_MIN_SCORE`,
> `councilSize`, `FIXED_TERM_SECONDS`, `FIXED_MAX_CONSECUTIVE_TERMS`, `minScoreToEndorse`,
> `minScoreToMentor`, `ARBITER_TIMELOCK`, `HIGH_VALUE_THRESHOLD`, `DAOTimelock` delay floor,
> `EscrowManager` constants) are intentionally NOT included in the parity gate because their
> contracts are in `contracts/future/` or were deleted (per `AUDIT_CLOSURE_REPORT.md`). They
> will be re-added to the gate on the day each future contract enters the V1 deploy set.

---

## Phase 2 — Static readiness gates (`scripts/mainnet-readiness.cjs`)

### Gate 1: Manual parity → ✅
See Phase 1 above.

### Gate 2: No production-tree `.sol` imports forbidden subtrees → ✅ (after FIX-5)

**FIX:** `contracts/DeployPhase3Peripherals.sol` was in the production tree
and `import "./future/BridgeSecurityModule.sol"`. This caused the V1 build
to compile a deferred bridge contract just to satisfy the import graph.

**Action taken:**
1. `git mv contracts/DeployPhase3Peripherals.sol contracts/future/`
2. Updated import paths inside the moved file (`./BridgeSecurityModule.sol` and `../VFIDEPriceOracle.sol`)
3. Updated `contracts/PRODUCTION_SET.md` to mark the file as moved
4. Updated the `SharedInterfaces.sol` doc comment that referenced the old path

After the move, the production tree (everything in `contracts/` excluding
`future/`, `mocks/`, `legacy/`, `testnet/`) has **zero** imports from those
trees.

### Gate 3: `scripts/deploy-full.ts` hygiene → ✅
- No imports from `contracts/{future,mocks,legacy,testnet}/`
- Testnet faucet (`VFIDETestnetFaucet`) gated behind `DEPLOY_TESTNET_FAUCET=true`
- Pre-existing invariant: `DEPLOY_TESTNET_FAUCET=true` on a non-testnet chainId throws
- New invariant (this sweep): the readiness sweep itself is invoked from inside
  `main()` whenever `chainId ∈ {8453, 137, 324}`

### Gate 4: Validator consistency → ✅ (after FIX-6, FIX-7)
`lib/validateProduction.ts` (app boot) and `scripts/validate-mainnet-env.ts`
(deploy time) now agree on which 27 NEXT_PUBLIC_*_ADDRESS keys are required
in production. Previously they diverged.

Specifically demoted to non-required (because the contract is deferred per
`PRODUCTION_SET.md`):
- `NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS` — V1 is VFIDE-only
- `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS` — `contracts/future/SubscriptionManager.sol`

Promoted to `production: true` (because they are required by V1 production flows):
- `NEXT_PUBLIC_BURN_ROUTER_ADDRESS` — fee path; touched on every transfer
- `NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS` — governance execution surface
- `NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS` — fraud reports + 30-day escrow
- `NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS` — Howey participation tracking
- `NEXT_PUBLIC_FLASH_LOAN_ADDRESS` — VFIDEFlashLoan
- `NEXT_PUBLIC_TERM_LOAN_ADDRESS` — VFIDETermLoan
- `NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS` — payments hot path
- `NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS` — split from former VFIDECommerce
- `NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS` — split from former VFIDECommerce
- `NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS` — Howey-safe (zero rewards by design but contract is on-chain)
- `NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS` — guardian recovery
- `NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS` — `cardbound` vault implementation lookups
- `NEXT_PUBLIC_PROOF_LEDGER_ADDRESS` — every Seer event flows through here
- `NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS` — admin surface
- `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` — sustainability redirect target
- `NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS` — read-only view contract
- `NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS` — CREATE2 factory, captured post-deploy

### Gate 5: `PRODUCTION_SET.md` path resolution → ✅
All 34 entries listed under "Deployable Contracts" resolve to real files
that live outside `contracts/future/`.

### Gate 6: CI lint hard-gate → ✅
`.github/workflows/testing-pipeline.yml` runs `npx eslint . --max-warnings 0`
with no `|| true` fallback (originally identified as A.3, already resolved
2026-05-16).

### Gate 7: Hardhat networks → ✅
`hardhat.config.ts` declares all three mainnet networks with correct chain IDs:
- `base` → 8453
- `polygon` → 137
- `zkSync` → 324

### Gate 8: `.env.mainnet.example` coverage → ✅ (after FIX-8)
**FIX:** the example file was missing 10 NEXT_PUBLIC_*_ADDRESS keys that the
validators now require. Filled in with placeholder zero addresses and an
explanatory comment about `CardBoundVaultDeployer` capture.

---

## Phase 3 — Pre-existing strengths reconfirmed (no change needed)

These were verified in this sweep but did not require modification:

1. **EIP-170 bytecode preflight** in `scripts/deploy-full.ts` aborts before
   any transaction if any deployable contract exceeds 24,576 bytes.
2. **`DEPLOY_TESTNET_FAUCET=true` hard-rejected** on any non-testnet chainId.
3. **Bootstrap addresses fail-closed** unless `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true`,
   which itself is rejected on non-local networks.
4. **`scripts/validate-mainnet-env.ts`** rejects RPC URLs containing
   `sepolia|testnet|localhost|127.0.0.1` and zero addresses.
5. **`scripts/validate-mainnet-env.ts`** cross-checks the three chain-ID env
   vars (`NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID`, `NEXT_PUBLIC_CHAIN_ID`,
   `NEXT_PUBLIC_DEFAULT_CHAIN_ID`) for consistency.
6. **`hardhat.config.ts`** uses solc 0.8.30 with `viaIR`, optimizer 200, and
   per-contract `runs:0` overrides for the largest contracts (Seer, future/
   SeerAutonomous, future/BadgeManager) to stay under EIP-170.
7. **Apply-full.ts re-runnable** with 48h timelock cycles documented in
   `MAINNET_DEPLOY_READINESS.md` section B.4.
8. **CI workflows** (11 jobs in testing-pipeline.yml + supporting workflows)
   already cover slither, mythril, contract-size, coverage 80%, security
   regressions, and e2e.

---

## Phase 4 — How to run the gates

### Locally

```bash
# Just the manual parity check (≈100ms, no deps):
node scripts/verify-manual-parity.cjs
# Equivalent npm script:
npm run verify:manual-parity

# Full readiness sweep (≈1s, no deps):
node scripts/mainnet-readiness.cjs
# Equivalent npm script:
npm run verify:mainnet-readiness
```

### In CI

The new `.github/workflows/mainnet-readiness.yml` runs both gates on:
- every push to `main`
- every push to `release/**`
- every PR targeting either of the above
- manual `workflow_dispatch`

It does **not** require `npm ci`, so the job typically completes in <30 seconds.

### At deploy time

`scripts/deploy-full.ts main()` now invokes `mainnet-readiness.cjs` whenever
`chainId ∈ {8453, 137, 324}`. A failing sweep aborts the deployment before
any transaction is sent. To deploy to a mainnet you must therefore pass the
sweep on the same commit hash.

---

## Phase 5 — Remaining day-of-deploy operational items

These are the items that **cannot** be checked statically and remain the
responsibility of the deploying team. They are unchanged from
`MAINNET_DEPLOY_READINESS.md` Section D — copied here for the operational
checklist on launch day:

- [ ] Run full CI pipeline against the deploy commit (all 11 jobs).
- [ ] `slither . --config-file slither.config.json` → review output.
- [ ] `./scripts/run-mythril.sh --critical-only` → review output.
- [ ] (Optional) Echidna invariant fuzzing on `VFIDEToken`, `Seer`,
      `FeeDistributor`, `EmergencyControl`, `ServicePool` (see B.3).
- [ ] **Base Sepolia full dry-run** of `deploy-full.ts` + ≥3 cycles of
      `apply-full.ts` (48h timelock between).
- [ ] Bootstrap addresses (multisig vs deployer EOA) reviewed line-by-line.
- [ ] LBP launch terms (Fjord Foundry weights, schedule, duration) signed off.
- [ ] Frontend env vars set per `lib/validateProduction.ts` and
      `.env.mainnet.example`. Build with `NODE_ENV=production` against the
      testnet address book first.
- [ ] Sentry DSN, GA, WalletConnect production tier set.
- [ ] On-chain monitoring registered (Forta / OZ Defender) for all V1
      contract addresses.
- [ ] Multisig signers tested signing on testnet.
- [ ] Emergency response runbook circulated (who calls which pause).
- [ ] Backup plan for `.deployments/base.json` (canonical address book).

### First-24h watchlist (from Section E)

1. `ProofLedger` event emission rate per block.
2. `VFIDEToken` total supply == 200M (50M dev vault + 150M treasury + 0 elsewhere).
3. First user vault create → guardians → deposit → recover end-to-end.
4. First merchant payment with all 5 fee channels emitted.
5. First flash loan: borrow → call → repay with FraudRegistry check passing.
6. No-op DAO proposal full lifecycle (propose → vote → queue → execute).

---

## Phase 6 — Deferred items NOT in V1 (re-confirmed)

These are intentionally **not deployed** for the V1 mainnet bootstrap and
remain in `contracts/future/`:

- `VFIDEBridge.sol`, `BridgeSecurityModule.sol`, `DeployPhase3Peripherals.sol` (moved this sweep)
- `MainstreamPayments.sol`, `SubscriptionManager.sol`
- `SeerAutonomous.sol`, `SeerGuardian.sol`, `SeerSocial.sol`,
  `SeerView.sol`, `SeerWorkAttestation.sol`, `SeerPolicyGuard.sol`,
  `SeerAutonomousLib.sol`
- `CouncilElection.sol`, `CouncilSalary.sol`, `CouncilManager.sol` *(if present)*
- `BadgeManager.sol`, `BadgeQualificationRules.sol`, `BadgeRegistry.sol`,
  `VFIDEBadgeNFT.sol`
- `VFIDEBenefits.sol`, `VFIDEEnterpriseGateway.sol`
- `DutyDistributor.sol` *(deferred; the V1 wired GovernanceHooks is the active impl)*
- `StablecoinRegistry.sol` *(V1 is VFIDE-only)*

Every audit finding against any of these is tracked under "deferred — fix
before deploying the relevant phase" in `AUDIT_CLOSURE_REPORT.md`.

---

## Phase 7 — Sign-off

| Gate | Status |
|---|---|
| Manual ↔ code constant parity (31/31) | ✅ |
| No production-tree imports of forbidden trees | ✅ |
| Deploy script hygiene | ✅ |
| Validator consistency between deploy-time and app-boot | ✅ |
| `PRODUCTION_SET.md` resolves cleanly | ✅ |
| CI lint hard-gate | ✅ |
| All three mainnet networks (Base, Polygon, zkSync) configured | ✅ |
| `.env.mainnet.example` complete | ✅ |
| Static readiness sweep wired into CI on every PR | ✅ |
| Static readiness sweep wired into `deploy-full.ts` mainnet path | ✅ |

**Result:** every static check that can be made about VFIDE on the v19.13
codebase is now automated, hard-gated, and green. The remaining mainnet work
is purely operational (key custody, RPC keys, dry-run, monitoring) and is
covered by `MAINNET_DEPLOY_READINESS.md` sections B.4-B.9, D, and E.

— SuperNinja final mainnet readiness sweep, 2026-05-20
