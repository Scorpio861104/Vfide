# VFIDE Testnet Deploy Runbook
**Version:** v19.13+  **Date:** 2026-05-27  **Network:** Base Sepolia (chainId 84532)

> **Purpose:** Step-by-step operator guide for running `deploy-full.ts` against a testnet.
> All production contracts are EIP-170 compliant as of commit `4fb3fdd`. This document
> covers environment setup, constructor-arg wiring, deploy execution, and post-deploy
> verification.

---

## 0. Prerequisites

| Requirement | Detail |
|---|---|
| Node.js | ≥ 20.x |
| Yarn / npm | `npm ci` in repo root |
| Solidity compiler | 0.8.30 — downloaded automatically by Hardhat on first compile |
| Funded deployer wallet | Needs testnet ETH. Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet |
| 6 sink addresses | Can all be the same address on testnet (see §2) |
| `ARGS_VFIDEPRICEORACLE` | 4 addresses — see §2. Use `address(0)` for chainlink/uniswap on testnet |

---

## 1. Recommended Chain

**Base Sepolia** (`baseSepolia`, chainId 84532) is the recommended testnet. It has:
- Fast block times (≈ 2s)
- Cheap gas (negligible on testnet ETH)
- A BaseScan explorer for contract verification
- No native LINK required for Chainlink (pass `address(0)`)
- Public RPC: `https://sepolia.base.org` (no API key needed for testing)

Alternatively: Sepolia (`sepolia`, chainId 11155111) or Polygon Amoy (`polygonAmoy`, 80002).

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in the following. Every value marked **REQUIRED** will
cause the deploy to fail-fast if absent.

### 2a. Wallet

```bash
# REQUIRED — deployer private key (no 0x prefix)
PRIVATE_KEY=<your_testnet_private_key>
```

### 2b. Bootstrap addresses

On testnet these can all point to a single test wallet (the deployer itself is fine).
On mainnet they must be separate multisigs.

```bash
# REQUIRED — all 0x… addresses
BOOTSTRAP_ADMIN_ADDRESS=<deployer_or_multisig>
BOOTSTRAP_DAO_ADDRESS=<deployer_or_dao_safe>
BOOTSTRAP_BENEFICIARY_ADDRESS=<dev_reserve_beneficiary>
BOOTSTRAP_TREASURY_SINK_ADDRESS=<treasury_wallet>
BOOTSTRAP_SANCTUM_SINK_ADDRESS=<sanctum_fund_wallet>
BOOTSTRAP_BURN_SINK_ADDRESS=<burn_wallet>
BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS=<ecosystem_wallet>
BOOTSTRAP_POOL_ADMIN_ADDRESS=<pool_admin_wallet>
BOOTSTRAP_FAUCET_OWNER_ADDRESS=<faucet_owner>
BOOTSTRAP_LEDGER_ADMIN_ADDRESS=<proof_ledger_admin>
```

> **Testnet shortcut:** You can set all 10 to the deployer address for a single-signer
> testnet run. `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true` must also be set (see §2e).

### 2c. VFIDEPriceOracle args

```bash
# REQUIRED — JSON array of 4 addresses
# On testnet set chainlinkFeed and uniswapPool to address(0)
ARGS_VFIDEPRICEORACLE='["0x<quoteToken_eg_USDC>","0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x<owner>"]'
```

### 2d. Testnet faucet

```bash
# OPTIONAL — deploy the VFIDETestnetFaucet contract (testnet chains only)
DEPLOY_TESTNET_FAUCET=true
```

### 2e. Testnet bootstrap override

```bash
# OPTIONAL — allows bootstrap addresses to equal the deployer
ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true
```

### 2f. Optional RPC override

```bash
# Optional — defaults to https://sepolia.base.org if unset
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 2g. Optional contract verification

```bash
# Optional — verifies all contracts on BaseScan after deploy
VERIFY_CONTRACTS=true
BASESCAN_API_KEY=<your_basescan_api_key>
```

### Full minimal `.env` for a testnet run

```bash
PRIVATE_KEY=<key>
BOOTSTRAP_ADMIN_ADDRESS=<addr>
BOOTSTRAP_DAO_ADDRESS=<addr>
BOOTSTRAP_BENEFICIARY_ADDRESS=<addr>
BOOTSTRAP_TREASURY_SINK_ADDRESS=<addr>
BOOTSTRAP_SANCTUM_SINK_ADDRESS=<addr>
BOOTSTRAP_BURN_SINK_ADDRESS=<addr>
BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS=<addr>
BOOTSTRAP_POOL_ADMIN_ADDRESS=<addr>
BOOTSTRAP_FAUCET_OWNER_ADDRESS=<addr>
BOOTSTRAP_LEDGER_ADMIN_ADDRESS=<addr>
ARGS_VFIDEPRICEORACLE='["0x<usdc_addr>","0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x<owner>"]'
ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true
DEPLOY_TESTNET_FAUCET=true
```

---

## 3. Pre-Deploy Checklist

```bash
# 1. Install deps
npm ci

# 2. Confirm solc 0.8.30 is available (auto-downloaded on first compile)
npx hardhat compile --quiet

# 3. EIP-170 preflight — all contracts must be under 24,576 bytes
npx hardhat run scripts/verify-contract-size-buffer.ts

# 4. Dry-run on local hardhat node first
npx hardhat run scripts/deploy-full.ts --network hardhat

# 5. Check your wallet has testnet ETH
#    Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
```

Expected output from step 4 (truncated):
```
═══ LAYER 1: Foundation ═══
  ✓ AdminMultiSig     → 0x…
  ✓ ProofLedger       → 0x…
  ✓ DevReserveVestingVault → 0x…
  ✓ VFIDEToken        → 0x…
  ✓ VFIDETokenViewer  → 0x…
...
═══ LAYER 9: Ecosystem / Badges ═══
  ✓ SanctumVault      → 0x…
  ✓ EcosystemVaultAdminFacet → 0x…
  ✓ EcosystemVault    → 0x…
...
✅ All 47 contracts deployed. EIP-170 runtime gate: PASS
```

---

## 4. Run the Deploy

```bash
# Base Sepolia
npx hardhat run scripts/deploy-full.ts --network baseSepolia
```

The script will:
1. Run the EIP-170 bytecode preflight gate (rejects oversized contracts before spending gas)
2. Deploy all 47 production contracts in dependency order across 11 layers
3. Wire post-deploy references (VaultHub ↔ VaultRecoveryClaim, MerchantPortal.setViewer, etc.)
4. Print the full `DeploymentBook` — the map of contract name → deployed address
5. Optionally verify on BaseScan if `VERIFY_CONTRACTS=true`

**Estimated gas cost:** ~35M gas total across all contracts. At 0.01 gwei base fee (typical on Base Sepolia testnet) this costs negligible testnet ETH.

---

## 5. Layer 9 — EcosystemVault (special note)

As of commit `4fb3fdd`, `EcosystemVault` requires a 4th constructor argument: the
`EcosystemVaultAdminFacet` address. The deploy script handles this automatically:

```
Layer 9 deploy order:
  1. SanctumVault             (dao + ProofLedger + Seer — auto-injected from book; no ARGS_ var needed)
  2. EcosystemVaultAdminFacet (no constructor args)
  3. EcosystemVault           (vfide, seer, operationsWallet, adminFacet ← auto-injected)
  4. EcosystemVaultView, VaultRegistry, PayrollManager, LiquidityIncentives
```

If you supply `ARGS_ECOSYSTEMVAULT` manually, pass all 4 args. If you pass only 3, the
script injects the facet address as the 4th automatically.

---

## 6. Layer 4 — MerchantPortal.setViewer (DAO signer requirement)

`MerchantPortal.setViewer` is gated by `_checkDAO()`. During deploy-full.ts it calls:

```typescript
const mp = await ethers.getContractAt("MerchantPortal", book.MerchantPortal,
  await ethers.getSigner(bootstrap.dao).catch(() => undefined));
await mp.setViewer(book.MerchantPortalViewer);
```

On testnet this works if `BOOTSTRAP_DAO_ADDRESS` == the deployer (which the testnet
shortcut provides). On mainnet, `bootstrap.dao` must be a funded signer in `accounts`.
If `getSigner(bootstrap.dao)` fails (Safe multisig), the `call()` helper logs a warning
and continues — you must call `setViewer` manually via the Safe UI.

**Manual fallback (mainnet):**
```
Contract: MerchantPortal
Function: setViewer(address _viewer)
Args:      <MerchantPortalViewer address from deployment book>
Signer:    DAO multisig (bootstrap.dao)
```

---

## 7. Post-Deploy Verification Checklist

After the script completes, run these checks:

```bash
# Verify all deployed addresses are non-zero
npx hardhat run scripts/verify-deployment-book.ts --network baseSepolia

# Confirm EcosystemVault adminFacet is wired
cast call <EcosystemVault_addr> "adminFacet()" --rpc-url https://sepolia.base.org
# Should return the EcosystemVaultAdminFacet address

# Confirm VFIDEToken supply = 200,000,000 VFIDE
cast call <VFIDEToken_addr> "totalSupply()" --rpc-url https://sepolia.base.org
# Returns: 200000000000000000000000000 (200M × 1e18)

# Confirm merchant fee is zero
cast call <MerchantPortal_addr> "protocolFeeBps()" --rpc-url https://sepolia.base.org
# Returns: 0

# Confirm MerchantPortal has viewer wired
cast call <MerchantPortal_addr> "viewer()" --rpc-url https://sepolia.base.org
# Should return MerchantPortalViewer address (not 0x0)

# Confirm CardBoundVaultDeployer is wired in VaultHub
cast call <VaultHub_addr> "cardBoundVaultDeployer()" --rpc-url https://sepolia.base.org
# Should return CardBoundVaultDeployer address

# Confirm ProofScore immutable curve (score 0 → fee basis ~10000, score 5000 → ~3820)
cast call <Seer_addr> "computeFeeBps(uint16)" 0 --rpc-url https://sepolia.base.org
cast call <Seer_addr> "computeFeeBps(uint16)" 5000 --rpc-url https://sepolia.base.org
```

---

## 8. Update Frontend `.env`

After deploy, populate the frontend env from the `DeploymentBook` printed at the end of
the deploy run. Key mappings:

| Deploy Book Key | Frontend Env Var |
|---|---|
| `VFIDEToken` | `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` |
| `VaultHub` | `NEXT_PUBLIC_VAULT_HUB_ADDRESS` |
| `Seer` | `NEXT_PUBLIC_SEER_ADDRESS` |
| `MerchantPortal` | `NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS` |
| `MerchantPortalViewer` | (internal — no direct frontend use) |
| `ProofScoreBurnRouter` | `NEXT_PUBLIC_BURN_ROUTER_ADDRESS` |
| `DAO` | `NEXT_PUBLIC_DAO_ADDRESS` |
| `DAOTimelock` | `NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS` |
| `FeeDistributor` | `NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS` |
| `ProofLedger` | `NEXT_PUBLIC_PROOF_LEDGER_ADDRESS` |
| `EcosystemVault` | `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` |
| `EcosystemVaultAdminFacet` | (internal — not needed by frontend) |
| `CommerceEscrow` | `NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS` |
| `MerchantRegistry` | `NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS` |
| `SanctumVault` | `NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS` |
| `VaultRegistry` | `NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS` |
| `FraudRegistry` | `NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS` |
| `VaultRecoveryClaim` | `NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS` |
| `VFIDEFlashLoan` | `NEXT_PUBLIC_FLASH_LOAN_ADDRESS` |
| `VFIDETermLoan` | `NEXT_PUBLIC_TERM_LOAN_ADDRESS` |
| `GovernanceHooks` | `NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS` |
| `PayrollManager` | `NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS` |
| `LiquidityIncentives` | `NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS` |
| `VFIDETestnetFaucet` | `NEXT_PUBLIC_FAUCET_ADDRESS` |
| `CardBoundVaultDeployer` | `NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS` |

---

## 9. Known Post-Deploy Manual Steps

These cannot be automated in `deploy-full.ts` because they require multisig signers or
are post-deploy DAO actions:

| Step | Contract | Function | Who signs |
|---|---|---|---|
| Wire Seer hub address | `Seer` | `setHub(VaultHub)` | Owner |
| Wire VaultHub in VFIDEToken | `VFIDEToken` | `setVaultHub(VaultHub)` | Owner (via Timelock on mainnet) |
| Wire VaultHub in DevReserveVestingVault | `DevReserveVestingVault` | `setVaultHub(VaultHub)` | Owner |
| Wire ProofLedger in DevReserveVestingVault | `DevReserveVestingVault` | `setLedger(ProofLedger)` | Owner |
| Set EcosystemVault reward token | `EcosystemVaultAdminFacet` (via EcosystemVault) | `setRewardToken(token)` | Owner |
| Set EcosystemVault operationsWallet post-timelock | `EcosystemVaultAdminFacet` (via EcosystemVault) | `applyOperationsWalletChange()` | Owner (after 2-day delay) |
| Wire VaultHub into Seer (if not in constructor) | `Seer` | `setHub(address)` | Owner |
| Enable MerchantPortal for live merchants | `MerchantPortal` | `setActive(true)` | DAO signer |

> Note: All calls to `EcosystemVaultAdminFacet` functions go through the `EcosystemVault`
> address (via its `fallback()` dispatcher). You do NOT call `EcosystemVaultAdminFacet` directly.

---

## 10. Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `Missing required env: Bootstrap admin address` | `BOOTSTRAP_ADMIN_ADDRESS` not set | Add to `.env` |
| `VFIDEPriceOracle requires ARGS_VFIDEPRICEORACLE` | Env var missing or wrong length | Set `ARGS_VFIDEPRICEORACLE='["0x..","0x0..","0x0..","0x.."]'` |
| `ECO_Zero()` revert in EcosystemVault deploy | `_adminFacet` arg is zero | Upgrade to deploy script ≥ commit `4fb3fdd` — it auto-injects |
| `EIP-170 violation: MerchantPortal: XXXXX bytes` | Wrong compiler profile | Check `hardhat.config.ts` override for MerchantPortal uses `runs:0, revertStrings:'strip'` |
| `Transaction underpriced` | Testnet RPC congestion | Add `BASE_SEPOLIA_RPC_URL` pointing to a private Alchemy/Infura key |
| `getSigner is not a function` | DAO address != deployer | Set `BOOTSTRAP_DAO_ADDRESS` to deployer on testnet, or call `setViewer` manually |

---

## 11. Mainnet Delta (for reference)

When you move from testnet to mainnet, the following must change:

- [ ] **Remove** `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true`
- [ ] **Separate** all 10 bootstrap addresses into distinct multisigs / hardware wallets
- [ ] **Set** `DEPLOY_TESTNET_FAUCET=false`
- [ ] **Supply** real `ARGS_VFIDEPRICEORACLE` with live Chainlink and Uniswap V3 pool
- [ ] **DAO signer** must be available to sign `MerchantPortal.setViewer` within the deploy session
- [ ] **Ownable2Step** migration (post-testnet hardening item — see issue tracker)
- [ ] **Verify** all contracts on Basescan/Etherscan (`VERIFY_CONTRACTS=true`)
- [ ] **Audit** the full `DeploymentBook` against this document's address table
- [ ] **Schedule** the 180-day SystemHandover key-burn countdown from deploy block

---

*This runbook is the canonical pre-testnet operator reference. Update whenever
constructor signatures or deploy-layer ordering changes.*
