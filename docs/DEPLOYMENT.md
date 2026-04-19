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
npx hardhat run scripts/deploy-all.ts --network baseSepolia
```

Deploys all contracts in dependency order and wires them together.
After this script completes, **save every deployed address** — you will need them as env vars before running any subsequent script.

> **⚠️ 48-hour timelock:** All module setter calls made by `deploy-all.ts` are timelocked.
> You **must wait 48 hours** before running `apply-all.ts`.

---

## Step 2 — Apply Module Confirmations (after 48 h)

```bash
npx hardhat run scripts/apply-all.ts --network baseSepolia
```

Executes all pending timelocked setter calls queued in Step 1.

---

## Step 3 — Phase-Specific Deploys (if required)

Run only the phases that are needed for the target deployment tier:

```bash
# Deploy
npx hardhat run scripts/deploy-phase2.ts --network baseSepolia
npx hardhat run scripts/deploy-phase3.ts --network baseSepolia
npx hardhat run scripts/deploy-phase4.ts --network baseSepolia
npx hardhat run scripts/deploy-phase5.ts --network baseSepolia

# Apply (after 48 h each)
npx hardhat run scripts/apply-phase2.ts --network baseSepolia
npx hardhat run scripts/apply-phase3.ts --network baseSepolia
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
