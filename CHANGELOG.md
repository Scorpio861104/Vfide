# Changelog

## 2026-05-10

### Testnet Readiness — Deployment Pipeline Consolidation

Goal: deploy the same contract set + wiring on testnet that we'd ship to
mainnet, with no parallel scripts to maintain and no silent runtime gaps.

#### Deployment scripts
- **Made `scripts/deploy-full.ts` the canonical deploy path.** Added
  `TESTNET_CHAIN_IDS` constant matching `_isSupportedTestnetChain` in
  `contracts/testnet/VFIDETestnetFaucet.sol`, and gated the faucet
  deployment behind `isTestnetChain && DEPLOY_TESTNET_FAUCET=true`.
  `DEPLOY_TESTNET_FAUCET=true` on a mainnet chain now throws fast with a
  clear error instead of relying on the faucet constructor revert.
- **Wired the faucet to EcosystemVault.** Previously every faucet claim
  silently lost its referral inside a try/catch because
  `EcosystemVault.registerUserReferral` is `onlyManager` and the faucet
  was never registered. Deploy now calls `setManager(faucet, true)` (which
  queues a 2-day timelock) and `faucet.setEcosystemVault(ecoAddr)`.
- **Added missing module DAO transfer finalizations to `apply-full.ts`.**
  `MerchantPortal.applyDAO`, `VFIDEFlashLoan.applyDAO`,
  `VFIDETermLoan.applyDAO`, and `FraudRegistry.applyDAO_FR` are all
  48h-timelocked and were queued by `deploy-full.ts` but never executed.
  Without this fix the deployer remained DAO of all four modules forever.
- **Added `EcosystemVault.executeManagerChange()` to `apply-full.ts`** so
  the faucet manager grant queued at deploy time actually takes effect.
- **Deleted `scripts/deploy-all.ts` and `scripts/apply-all.ts`** — the
  partial duplicate of `deploy-full.ts`/`apply-full.ts` that only covered
  18 of the 28+ production contracts.
- **Removed nine dead script entries from `package.json`** that pointed at
  `.broken` files: `contract:deploy`, `deploy:apply-wiring:{mainnet,sepolia}`,
  `deploy:solo:{base,mainnet,sepolia}`, `deploy:wizard`, `deploy:all`, `apply:all`.

#### New scripts (all idempotent, chain-guarded)
- `scripts/fund-faucet.ts` — funds the testnet faucet with VFIDE + ETH,
  with pre-flight balance check and optional operator registration. Refuses
  to run on non-testnet chains. Reads `.deployments/<network>.json` so no
  hand-typed addresses.
- `scripts/sync-abis.ts` — copies fresh ABIs from `artifacts/contracts/`
  into `lib/abis/` after `hardhat compile`. `--check` mode for CI.
  Fixes the recurring "function not in ABI" wagmi runtime errors.
- `scripts/validate-testnet-ready.ts` — single-shot pre-flight that checks
  chain id, deployment book completeness, token total supply (200 M),
  token module wiring, faucet balance + ecosystem vault wiring,
  EcosystemVault.isManager(faucet), all six module DAO ownerships, and
  parity between `NEXT_PUBLIC_*_ADDRESS` env vars and the deployment book.
  Exits non-zero on any failure for CI gating.

#### hardhat.config.ts
- Removed three phantom Solidity overrides for files that don't exist:
  `contracts/DeployPhases3to6.sol`, `contracts/DeployPhase1.sol`,
  `contracts/DeployPhase1Governance.sol`.
- Corrected the path for `BadgeManager.sol` and `SeerAutonomous.sol` to
  `contracts/future/` (where they actually live).
- Added testnet networks: `zkSyncSepolia` (300), `arbitrumSepolia` (421614),
  `optimismSepolia` (11155420) — all in the faucet's allowlist but
  previously unreachable from `--network ...`.
- Added matching mainnet networks: `arbitrum` (42161), `optimism` (10).
- Extended etherscan config with `ARBISCAN_API_KEY` and
  `OPTIMISTIC_ETHERSCAN_API_KEY` plus custom-chain endpoints for all four
  new networks.

#### Faucet API
- `app/api/faucet/claim/route.ts` — replaced hardcoded `baseSepolia`
  imports/usages with a `resolveTestnetChain()` helper that maps
  `NEXT_PUBLIC_DEFAULT_CHAIN_ID` to its viem chain definition + default
  RPC URL. Supports Base Sepolia, Polygon Amoy, zkSync Sepolia, Ethereum
  Sepolia, Arbitrum Sepolia, and Optimism Sepolia. Returns 503
  "Unsupported testnet chain" if `NEXT_PUBLIC_DEFAULT_CHAIN_ID` is set to
  anything not in the testnet allowlist.

#### Doc / env hygiene
- Updated `.env.example` and `.env.staging.example` references from the
  deleted `deploy-all.ts` to `deploy-full.ts`. Added
  `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` to the canonical post-deploy block.
- Updated stale references in `scripts/verify-admin-roles.ts` and
  `scripts/future/apply-phase2.ts`.

#### Known follow-ups (not fixed in this pass)
- ABI drift inventory: `FraudRegistry` is missing 8 functions from
  `lib/abis/FraudRegistry.json`; `CardBoundVault` is missing 9 (including
  `executeQueuedPayment` and `cancelQueuedPayment` — both needed for the
  withdrawal-queue UI). Run `npx hardhat compile && npm run sync-abis`
  after this drop to repair.
- Hardhat compile was not run in the prep environment (no solc binary
  available); a clean compile + `hardhat size-contracts` should be the
  next gate.

## 2026-04-13

### Security And Reliability Remediation

- Finalized deep audit remediations across token, vault, escrow, governance, and router flows.
- Added testnet chain guard for the faucet to block deployment on major production chains.
- Enforced timelocked whale-limit exemption application flow and aligned related tests.
- Hardened fee-routing, score fallback, whitelist enforcement, and anti-whale accounting behavior.
- Standardized compiler configuration and interface surface updates for safer operations.

### Release

- Commit: `8e18922e`
- Branch: `main`
- Validation: `hardhat compile` clean; representative Jest regression suite passing.
