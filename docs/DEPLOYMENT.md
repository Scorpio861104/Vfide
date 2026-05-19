# VFIDE Deployment Instructions

End-to-end reference for deploying the VFIDE contract suite to any network.

---

## Prerequisites

Before running any deploy script, ensure:

1. **Deployer wallet** has enough gas (estimate: ~0.1 ETH on mainnet, a few cents on Base Sepolia).
2. **`.env` file** is populated with all required addresses and keys (see [ENV_CONTRACT_ADDRESS_MATRIX.md](./ENV_CONTRACT_ADDRESS_MATRIX.md)).
3. Solidity contracts are compiled:
   ```bash
   npx hardhat compile
   ```
   > First run downloads the solc compiler — network access required.
4. 5 council member addresses are ready (hardware wallets recommended for mainnet).

---

## Step 1 — Deploy All Contracts

```bash
npx hardhat run scripts/deploy-full.ts --network baseSepolia
```

Deploys all contracts in dependency order across every layer and wires them together.
After this script completes, **save every deployed address** — addresses are persisted to `.deployments/<network>.json` automatically (resume-from-crash supported), and you will need them as env vars before running any subsequent script.

> **⚠️ 48-hour timelock:** All module setter calls made by `deploy-full.ts` are timelocked.
> You **must wait 48 hours** before running `apply-full.ts`. Re-run `apply-full.ts` every 48 h until it reports `All wiring complete`.

---

## Step 2 — Apply Module Confirmations (after 48 h)

```bash
npx hardhat run scripts/apply-full.ts --network baseSepolia
```

Executes all pending timelocked setter calls queued in Step 1.

---

## Step 3 — Phase-Specific Deploys (if required)

Run only the phases that are needed for the target deployment tier:

```bash
# Deploy
npx hardhat run scripts/future/deploy-phase2.ts --network baseSepolia
npx hardhat run scripts/future/deploy-phase3.ts --network baseSepolia
npx hardhat run scripts/future/deploy-phase4.ts --network baseSepolia
npx hardhat run scripts/future/deploy-phase5.ts --network baseSepolia

# Apply (after 48 h each)
npx hardhat run scripts/future/apply-phase2.ts --network baseSepolia
npx hardhat run scripts/future/apply-phase3.ts --network baseSepolia
```

See [DEPLOYMENT_MANIFEST.md](./DEPLOYMENT_MANIFEST.md) for which contracts each phase deploys.

---

## Step 4 — Transfer Governance

> Run **after** all apply scripts have completed and all addresses are in `.env`.

```bash
npx hardhat run scripts/transfer-governance.ts --network baseSepolia
```

This script performs the following in order:

| Action | Detail |
|--------|--------|
| `FraudRegistry.setDAO(dao)` | DAO Safe becomes fraud registry admin |
| `Seer.proposeDAOChange(dao)` | 48 h timelock on Seer DAO change |
| `GovernanceHooks.setDAO(dao)` | DAO Safe becomes hooks admin |
| `MerchantPortal.setDAO(dao)` | DAO Safe becomes merchant admin |
| `VFIDEToken.setTreasurySink(feeDistributor)` | Fee sink wired (48 h) |
| `VFIDEToken.setSanctumSink(sanctumVault)` | Sanctum sink wired (48 h, optional) |
| `BurnRouter.proposeModules(...)` | Burn module wiring (48 h) |
| `VFIDEToken.transferOwnership(ocp)` | 2-step: OCP must call `acceptOwnership()` within 7 days |
| `DAOTimelock.schedule(setAdmin, dao)` | Timelock admin queued for DAO |

### Required env vars for this step

```
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS
NEXT_PUBLIC_VAULT_HUB_ADDRESS
NEXT_PUBLIC_SEER_ADDRESS
NEXT_PUBLIC_BURN_ROUTER_ADDRESS
NEXT_PUBLIC_DAO_ADDRESS              ← Set to your Gnosis Safe address
NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS
NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS
NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS
NEXT_PUBLIC_FLASH_LOAN_ADDRESS
NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS
NEXT_PUBLIC_OCP_ADDRESS              ← OwnerControlPanel
NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS    (optional)
NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS  (optional)
NEXT_PUBLIC_TERM_LOAN_ADDRESS        (optional)
```

---

## Step 5 — Apply Remaining Timelocked Changes (after 48 h)

After waiting 48 hours from Step 4:

```bash
# Token sinks
token.applyTreasurySink()
token.applySanctumSink()       # if SanctumVault deployed

# BurnRouter modules
burnRouter.applyModules()

# Seer DAO change
seer.applyDAOChange()

# DAOTimelock admin
timelock.execute(setAdminTxId)
```

---

## Step 6 — Validate Deployment

```bash
npx hardhat run scripts/validate-deployment.ts --network baseSepolia
```

Checks all wired addresses, role assignments, and timelock states are correct.

---

## Step 7 — Verify Contracts on Block Explorer

```bash
# Verify a single contract
npx hardhat verify --network baseSepolia <address> <constructor-args>

# Verify all at once (addresses must be in .env)
npx hardhat run scripts/verify-all.ts --network baseSepolia
```

---

## Local Contract Verification (Pre-Deploy Checks)

Run these locally before any live deployment to validate contract invariants:

```bash
npm run contract:verify:ocp-guardrails:local          # OwnerControlPanel guardrails
npm run contract:verify:chain-of-return:local          # Recovery timelock
npm run contract:verify:governance-safety:local        # Combined governance safety
npm run contract:verify:next-of-kin:local              # Inheritance flow
npm run contract:verify:proofscore-trust:local         # ProofScore/Trust consistency
npm run contract:verify:fee-burn-router:local          # Fee/burn router invariants
npm run contract:verify:ecosystem-work-rewards:local   # Work reward invariants
npm run contract:verify:merchant-payment-escrow:local  # Merchant escrow invariants
npm run contract:verify:bridge-governance:local        # Bridge timelock
```

Each command auto-starts a temporary local Hardhat node, runs its checks, and cleans up on exit.

---

## Key Notes

- **`renounceOwnership()` is permanently disabled** on `VFIDEToken`. Ownership must be transferred — never abandoned.
- `OwnerControlPanel` uses 2-step ownership: `transferOwnership()` → `acceptOwnership()`. OCP must accept within **7 days**.
- `NEXT_PUBLIC_DAO_ADDRESS` must point to a **Gnosis Safe**, not an EOA. See [GOVERNANCE_HANDOVER.md](./GOVERNANCE_HANDOVER.md) for details.
- After 6 months of stable operation, run `SystemHandover` for full protocol decentralisation handoff.

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [DEPLOYMENT_MANIFEST.md](./DEPLOYMENT_MANIFEST.md) | Which script deploys which contract |
| [ENV_CONTRACT_ADDRESS_MATRIX.md](./ENV_CONTRACT_ADDRESS_MATRIX.md) | Full env var reference |
| [GOVERNANCE_HANDOVER.md](./GOVERNANCE_HANDOVER.md) | DAO Safe setup and member rotation |
| [DEPLOY_PHASE1_INSTRUCTIONS.md](./DEPLOY_PHASE1_INSTRUCTIONS.md) | Phase 1 detail (token + security) |

---

## Deploying to Multiple Chains (v19.10 DOCS-2)

VFIDE supports deployment to Base mainnet, Polygon mainnet, and zkSync Era mainnet (plus their respective testnets). Each chain is a **separate deployment**: contracts must be deployed on every chain you want to support, and the frontend must be configured with chain-scoped envvars to route transactions correctly.

### Per-chain deploy procedure

Repeat for each target chain:

```bash
# Set the deployer's RPC/keys for THIS chain
export PRIVATE_KEY=...
export RPC_URL=https://<chain-rpc-url>

# 1. Run the standard deploy script
npx hardhat run scripts/deploy-full.ts --network <chain-name>

# 2. Capture the deployed addresses (deploy-full.ts checkpoints to .deployments/<chain>.json per OP-2)
cat .deployments/<chain-name>.json

# 3. Verify contracts on the chain's block explorer
npm run -s verify -- --network <chain-name>

# 4. Verify admin role topology — fails fast if DEFAULT_ADMIN_ROLE
#    is held by anyone other than the configured expectedAdmin (v19.11 COMP-1).
npx hardhat run scripts/verify-admin-roles.ts --network <chain-name>

# 5. Run post-deploy validation
npm run -s validate:deploy -- --network <chain-name>
```

### Chain-scoped frontend configuration

After deploying to all target chains, populate the frontend env with chain-scoped addresses. See `ENV_CONTRACT_ADDRESS_MATRIX.md` for the full list and pattern.

Minimum required envvars for multi-chain frontend:

```bash
NEXT_PUBLIC_SUPPORTED_CHAIN_IDS=8453,137  # whichever chains you launch on

# For EACH contract, EACH chain:
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453=0x...   # Base
NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_137=0x...    # Polygon
# (repeat for ~25 contracts × N chains)
```

Run `npm run -s validate:env -- --multi-chain` before deploying the frontend.

### Indexer configuration

The off-chain indexer ships in two modes:

1. **Multi-chain supervisor** (recommended for multi-chain): `lib/indexer/multiChain.ts` (v19.11 XCHAIN-2). Spawns one indexer child per chain in `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS`, with chain-tagged log streams and per-chain confirmation depth (Polygon defaults to 20, others to 2). Run as: `node lib/indexer/multiChain.js`.

2. **Single-chain mode**: the original `lib/indexer/service.ts` continues to work for single-chain deploys. Set `NEXT_PUBLIC_CHAIN_ID` to the target chain.

### Chain-specific gotchas

- **zkSync Era** uses a different CREATE2 formula than other EVM chains. `CardBoundVaultDeployer.predict()` reverts on chain IDs 324 and 300 by design. Use `lib/crypto/zkSyncAddress.ts` for off-chain prediction on zkSync.
- **Polygon** has aggressive reorg behavior near the head. The multi-chain supervisor sets `INDEXER_CONFIRMATION_DEPTH=20` for Polygon-specific instances by default.
- **Base** uses Optimism's sequencer model. There is no MEV at the sequencer level today, but this may change. Use `eth_getLogs` for indexer event reads (works correctly across reorgs); avoid `eth_subscribe` based event streams.

### Single-chain to multi-chain migration

If VFIDE is currently single-chain and you want to add a second chain:

1. Deploy to the new chain (same procedure as above).
2. Add the chain ID to `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS`.
3. Add chain-scoped envvars for the existing chain in addition to the new one. Both must be present.
4. Update the frontend deploy. Because envvars are validated at deploy-time, the deploy will fail-fast if any contract is missing for any chain.
5. Update `INDEXER_CONFIRMATION_DEPTH_<chainId>` and any other chain-specific tuning.
6. Communicate the addition publicly. Document the new chain in `KEY_MANAGEMENT_PLAN.md` (each chain has its own deployer and admin role chain-of-custody).

### What does NOT carry across chains

Each of these is **per-chain** and does NOT migrate when a user moves between chains:

- ProofScore (chain-local; users start at NEUTRAL=5000 on a new chain — XCHAIN-5)
- Merchant identity (chain-local; same wallet on Base and Polygon are two separate registrations — XCHAIN-6)
- Vault address (chain-local; CREATE2 produces a different address per chain on zkSync per XCHAIN-4)
- Permits, signed pay intents, signed transfer intents (chain-bound by EIP-712 domain separator + intent.chainId field)

These are intentional architectural choices, not bugs. They are documented here so operators don't promise users that their reputation/identity moves automatically.
