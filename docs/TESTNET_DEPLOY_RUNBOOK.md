# VFIDE Testnet Deploy Runbook
**Version:** v19.13+ (updated 2026-05-27)  **Network:** Base Sepolia (chainId 84532)

> **Purpose:** Step-by-step operator guide for running `deploy-full.ts` against a testnet.
> All production contracts are EIP-170 compliant. This document covers environment setup,
> constructor-arg wiring, deploy execution, and post-deploy verification.
>
> **Change log (2026-05-27):**
> - §4 contract count updated: 47 → **50 production** + 1 testnet-only = 51 total
> - §4 layer structure updated: Layer 11 now includes SubscriptionManager; Layer 12 (Ecosystem Satellites) added
> - §6 MerchantPortal constructor: **4 args** (dao, vaultHub, seer, ledger) — `feeSink` removed (PR #255)
> - §7 new wiring steps: CommerceEscrow.setSeer, SubscriptionManager.setDAO, SubscriptionManager.setFraudRegistry
> - §9 post-deploy manual steps: CommerceEscrow.setSeer is now automated; Council Election GOV-D1 step retained
> - §10 new cast verification checks for CommerceEscrow and SubscriptionManager

---

## 0. Prerequisites

| Requirement | Detail |
|---|---|
| Node.js | ≥ 20.x |
| Yarn / npm | `npm ci` in repo root |
| Solidity compiler | 0.8.30 — downloaded automatically by Hardhat on first compile |
| Funded deployer wallet | Needs testnet ETH. Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet |
| 10 sink/bootstrap addresses | Can all be the same address on testnet (see §2) |
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
  ✓ AdminMultiSig           → 0x…
  ✓ ProofLedger             → 0x…
  ✓ DevReserveVestingVault  → 0x…
  ✓ VFIDEToken              → 0x…
  ✓ VFIDETokenViewer        → 0x…
...
═══ LAYER 11: Commerce Suite ═══
  ✓ MerchantRegistry        → 0x…
  ✓ CommerceEscrow          → 0x…
  ✓ SubscriptionManager     → 0x…
...
═══ LAYER 12: Ecosystem Satellites ═══
  ✓ BadgeManager            → 0x…
  ✓ SeerAutonomous          → 0x…
  ✓ SeerGuardian            → 0x…
...
✅ All 50 contracts deployed. EIP-170 runtime gate: PASS
```

---

## 4. Run the Deploy

```bash
# Base Sepolia
npx hardhat run scripts/deploy-full.ts --network baseSepolia
```

The script will:
1. Run the EIP-170 bytecode preflight gate (rejects oversized contracts before spending gas)
2. Deploy all **50 production contracts** (+ 1 testnet faucet if `DEPLOY_TESTNET_FAUCET=true`) in dependency order across Layers 1–12
3. Execute all automated post-deploy wiring calls (see §7)
4. Print the full `DeploymentBook` — the map of contract name → deployed address
5. Optionally verify on BaseScan if `VERIFY_CONTRACTS=true`

**Estimated gas cost:** ~42M gas total across all contracts. At 0.01 gwei base fee (typical on Base Sepolia testnet) this costs negligible testnet ETH.

### Canonical deploy order (50 production contracts)

| Layer | Contracts |
|---|---|
| **1 — Foundation** | AdminMultiSig, ProofLedger, DevReserveVestingVault, VFIDEToken, VFIDETokenViewer |
| **2 — Trust Engine** | Seer, ProofScoreBurnRouter |
| **3 — Vault System** | CardBoundVaultAdminFacet, CardBoundVaultSubManagerDeployer, CardBoundVaultBytecodeProvider, CardBoundVaultDeployer, VaultHub |
| **4 — Commerce Core** | DAOPayrollPool, MerchantCompetitionPool, HeadhunterCompetitionPool, FeeDistributor, MerchantPortal, MerchantPortalViewer |
| **5 — Governance** | DAOTimelock, GovernanceHooks, DAO |
| **6 — Finance** | VFIDEFlashLoan, VFIDETermLoan, VFIDEPriceOracle |
| **7 — Safety** | FraudRegistry |
| **8 — Governance Helpers** | VFIDEAccessControl, OwnerControlPanel, VaultRecoveryClaim, SystemHandover, EmergencyControl |
| **9 — Ecosystem / Badges** | SanctumVault, EcosystemVaultAdminFacet, EcosystemVault, EcosystemVaultView, VaultRegistry, PayrollManager, LiquidityIncentives |
| **11 — Commerce Suite** | MerchantRegistry, CommerceEscrow, SubscriptionManager |
| **12 — Ecosystem Satellites** | BadgeManager, VFIDEBadgeNFT, CouncilElection, CouncilSalary, SeerAutonomousAdminFacet, SeerAutonomous, SeerGuardian, SeerPolicyGuard, SeerSocial, SeerWorkAttestation, VFIDEBenefits, VFIDEEnterpriseGateway, MainstreamPayments |

> Layer 10 is intentionally absent — it was the deferred-phase placeholder. All contracts that were previously in layers 10+ have been folded into 11 and 12.

---

## 5. Layer 9 — EcosystemVault (special note)

`EcosystemVault` requires a 4th constructor argument: the `EcosystemVaultAdminFacet` address.
The deploy script handles this automatically:

```
Layer 9 deploy order:
  1. SanctumVault             (dao + ProofLedger + Seer — auto-injected from book; no ARGS_ var needed)
  2. EcosystemVaultAdminFacet (no constructor args)
  3. EcosystemVault           (vfide, seer, operationsWallet, adminFacet ← auto-injected)
  4. EcosystemVaultView, VaultRegistry, PayrollManager, LiquidityIncentives
```

If you supply `ARGS_ECOSYSTEMVAULT` manually, pass all 4 args. If you pass only 3, the
script injects the facet address as the 4th automatically.

> **Note:** All calls to `EcosystemVaultAdminFacet` functions go through the `EcosystemVault`
> address (via its `fallback()` dispatcher). Do NOT call `EcosystemVaultAdminFacet` directly.

---

## 6. Layer 4 — MerchantPortal constructor (4 args, PR #255)

As of PR #255, `protocolFeeBps` is an **immutable constant of 0**. The `feeSink` constructor
argument has been permanently removed. `MerchantPortal` now takes exactly **4 arguments**:

```
MerchantPortal(address _dao, address _vaultHub, address _seer, address _ledger)
```

If your `.env` has a stale `ARGS_MERCHANTPORTAL` with 5 entries, remove the 5th (`feeSink`) arg.
The deploy script auto-injects from `book` when no `ARGS_MERCHANTPORTAL` env var is set.

### MerchantPortal.setViewer (DAO signer requirement)

`MerchantPortal.setViewer` is gated by `_checkDAO()`. During `deploy-full.ts` it calls:

```typescript
const mp = await ethers.getContractAt("MerchantPortal", book.MerchantPortal,
  await ethers.getSigner(bootstrap.dao).catch(() => undefined));
await mp.setViewer(book.MerchantPortalViewer);
```

On testnet this works if `BOOTSTRAP_DAO_ADDRESS` == the deployer. On mainnet, if
`getSigner(bootstrap.dao)` fails (Safe multisig), the `call()` helper logs a warning and
continues — you must call `setViewer` manually via the Safe UI.

**Manual fallback (mainnet):**
```
Contract: MerchantPortal
Function: setViewer(address _viewer)
Args:      <MerchantPortalViewer address from deployment book>
Signer:    DAO multisig (bootstrap.dao)
```

---

## 7. Automated Post-Deploy Wiring

`deploy-full.ts` executes all of the following automatically after deploying contracts.
These are listed so you can verify them in the transaction history and confirm none were
skipped due to a missing `book` address.

| Wiring call | Contract | Notes |
|---|---|---|
| ProofLedger.setLogger × 24 | All loggers | All deployed contracts registered |
| GovernanceHooks.setDAO | GovernanceHooks | Immediate |
| FraudRegistry.setDAO | FraudRegistry | Immediate |
| MerchantPortal.setDAO | MerchantPortal | Immediate |
| MerchantPortal.setViewer | MerchantPortal | Requires DAO signer (see §6) |
| VFIDEToken.setViewer | VFIDEToken | Immediate |
| SubscriptionManager.setDAO | SubscriptionManager | SM-GOV1: immediate, no timelock |
| SubscriptionManager.setFraudRegistry | SubscriptionManager | 24h queued via applyFraudRegistry |
| VFIDEFlashLoan.setDAO | VFIDEFlashLoan | Immediate |
| VFIDETermLoan.setDAO | VFIDETermLoan | Immediate |
| VaultHub.setRecoveryApprover(VaultRecoveryClaim) | VaultHub | Immediate |
| MerchantRegistry.setAuthorizedEscrow(CommerceEscrow) | MerchantRegistry | Immediate |
| **CommerceEscrow.setSeer(Seer)** | CommerceEscrow | **New (PR #271)** — enables score-tiered dispute locks |
| Seer.setSeerSocial | Seer | Immediate |
| Seer.setSeerAutonomous | Seer | Immediate |
| VFIDEToken.setVaultHub | VFIDEToken | 48h queued proposal |
| VFIDEToken.setSeerAutonomous | VFIDEToken | 48h queued proposal |

> CE-GOV1 NOTE: `CommerceEscrow` has no `setDAO()`. The DAO address passed at construction
> is permanent. CommerceEscrow's DAO-gated functions are limited to bounded parameter updates
> (`setMinDisputeAmountForPenalty`, `setSeer`). Track as a known limitation for CommerceEscrow v2.

---

## 8. Post-Deploy Verification Checklist

After the script completes, run these checks:

```bash
RPC=https://sepolia.base.org

# Verify all deployed addresses are non-zero
npx hardhat run scripts/verify-deployment-book.ts --network baseSepolia

# ── Token ────────────────────────────────────────────────────────────────────
# Confirm total supply = 200,000,000 VFIDE (200M × 1e18)
cast call <VFIDEToken> "totalSupply()" --rpc-url $RPC
# Expected: 200000000000000000000000000

# ── MerchantPortal ───────────────────────────────────────────────────────────
# Confirm merchant fee is immutably zero (not just zero by default)
cast call <MerchantPortal> "protocolFeeBps()" --rpc-url $RPC
# Expected: 0

# Confirm viewer is wired
cast call <MerchantPortal> "viewer()" --rpc-url $RPC
# Expected: <MerchantPortalViewer address> (not 0x000…000)

# ── VaultHub ─────────────────────────────────────────────────────────────────
# Confirm CardBoundVaultDeployer is wired
cast call <VaultHub> "cardBoundVaultDeployer()" --rpc-url $RPC
# Expected: <CardBoundVaultDeployer address>

# ── EcosystemVault ───────────────────────────────────────────────────────────
# Confirm adminFacet is wired
cast call <EcosystemVault> "adminFacet()" --rpc-url $RPC
# Expected: <EcosystemVaultAdminFacet address>

# ── CommerceEscrow ───────────────────────────────────────────────────────────
# Confirm Seer is wired (enables score-tiered dispute locks)
cast call <CommerceEscrow> "seer()" --rpc-url $RPC
# Expected: <Seer address> (not 0x000…000)
# If this returns 0x0, call: CommerceEscrow.setSeer(<Seer>) as DAO

# Confirm LOCK_TRUSTED / LOCK_NEUTRAL / LOCK_LOW_TRUST constants
cast call <CommerceEscrow> "LOCK_TRUSTED()" --rpc-url $RPC   # Expected: 259200  (3 days)
cast call <CommerceEscrow> "LOCK_NEUTRAL()" --rpc-url $RPC   # Expected: 604800  (7 days)
cast call <CommerceEscrow> "LOCK_LOW_TRUST()" --rpc-url $RPC # Expected: 1209600 (14 days)

# Confirm HIGH_VALUE_THRESHOLD
cast call <CommerceEscrow> "HIGH_VALUE_THRESHOLD()" --rpc-url $RPC
# Expected: 10000000000000000000000 (10,000 VFIDE × 1e18)

# ── SubscriptionManager ──────────────────────────────────────────────────────
# Confirm DAO is set
cast call <SubscriptionManager> "dao()" --rpc-url $RPC
# Expected: <DAO address>

# ── Seer / ProofScore curve ──────────────────────────────────────────────────
# Confirm immutable fee curve (score 0 → ~10000 bps, score 5000 → ~3820 bps)
cast call <Seer> "computeFeeBps(uint16)" 0 --rpc-url $RPC
cast call <Seer> "computeFeeBps(uint16)" 5000 --rpc-url $RPC
```

---

## 9. Update Frontend `.env`

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
| `SubscriptionManager` | `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS` |
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
| `BadgeManager` | `NEXT_PUBLIC_BADGE_MANAGER_ADDRESS` |
| `CouncilElection` | `NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS` |
| `SeerAutonomous` | `NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS` |
| `SeerGuardian` | `NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS` |

---

## 10. Known Post-Deploy Manual Steps

These **cannot** be automated in `deploy-full.ts` — they require multisig signers, queued
timelocks, or are post-handover governance actions:

| Step | Contract | Function | Who signs | Notes |
|---|---|---|---|---|
| Wire VaultHub in VFIDEToken (apply) | `VFIDEToken` | `applyVaultHub()` | Owner (48h after deploy) | Queued automatically; apply after delay |
| Wire SeerAutonomous in VFIDEToken (apply) | `VFIDEToken` | `applySeerAutonomous()` | Owner (48h after delay) | Queued automatically; apply after delay |
| Set EcosystemVault reward token | `EcosystemVaultAdminFacet` (via EcosystemVault) | `setRewardToken(token)` | Owner | Not wired at deploy; set when rewards launch |
| Set EcosystemVault operationsWallet post-timelock | `EcosystemVaultAdminFacet` (via EcosystemVault) | `applyOperationsWalletChange()` | Owner (after 2-day delay) | Queue first, apply 2 days later |
| Enable MerchantPortal for live merchants | `MerchantPortal` | `setActive(true)` | DAO signer | Testnet: call once merchants are ready |
| Wire CouncilElection into DAO (GOV-D1) | `DAOTimelock` | `queueTx → DAO.setCouncilElection` | Bootstrap admin | See §11 below |

---

## 11. GOV-D1 — Wire CouncilElection into DAO (post-deploy, timelocked)

`DAO.setCouncilElection()` is `onlyTimelock`, so it cannot be called directly in
`deploy-full.ts`. After running `apply-full.ts` (48h delay), the bootstrap admin
must queue this via `DAOTimelock.queueTx()`:

```typescript
// Run once, 48h after initial deploy:
const iface = new ethers.Interface(["function setCouncilElection(address)"]);
const data  = iface.encodeFunctionData("setCouncilElection", [book.CouncilElection]);
await timelock.queueTx(book.DAO, 0n, data);
// Wait 48h, then:
await timelock.execute(timelockId);
```

Without this, `DAO.councilElection == address(0)` and `syncQuorumToCouncil()` reverts.
The DAO remains fully functional for proposals and voting — this only affects dynamic
quorum-profile syncing from council elections.

---

## 12. Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `Missing required env: Bootstrap admin address` | `BOOTSTRAP_ADMIN_ADDRESS` not set | Add to `.env` |
| `VFIDEPriceOracle requires ARGS_VFIDEPRICEORACLE` | Env var missing or wrong length | Set `ARGS_VFIDEPRICEORACLE='["0x..","0x0..","0x0..","0x.."]'` |
| `ECO_Zero()` revert in EcosystemVault deploy | `_adminFacet` arg is zero | Upgrade to deploy script ≥ commit `4fb3fdd` — it auto-injects |
| `EIP-170 violation: MerchantPortal: XXXXX bytes` | Wrong compiler profile | Check `hardhat.config.ts` override for MerchantPortal uses `runs:0, revertStrings:'strip', bytecodeHash:'none'` |
| `Transaction underpriced` | Testnet RPC congestion | Add `BASE_SEPOLIA_RPC_URL` pointing to a private Alchemy/Infura key |
| `getSigner is not a function` | DAO address != deployer | Set `BOOTSTRAP_DAO_ADDRESS` to deployer on testnet, or call `setViewer` manually |
| `MERCH_InvalidConfig()` in MerchantPortal deploy | Stale 5-arg `ARGS_MERCHANTPORTAL` env var | Remove `feeSink` (5th arg) — constructor is now 4 args (PR #255) |
| `COM_Zero()` in CommerceEscrow deploy | Zero address in constructor | Confirm `book.MerchantRegistry` is non-zero before Layer 11 |
| `CommerceEscrow.seer()` returns 0x0 after deploy | `setSeer` wiring call skipped | Manually call `CommerceEscrow.setSeer(<Seer>)` as DAO — verify `book.Seer` was set before wiring ran |

---

## 13. Mainnet Delta (for reference)

When you move from testnet to mainnet, the following must change:

- [ ] **Remove** `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true`
- [ ] **Separate** all 10 bootstrap addresses into distinct multisigs / hardware wallets
- [ ] **Set** `DEPLOY_TESTNET_FAUCET=false`
- [ ] **Supply** real `ARGS_VFIDEPRICEORACLE` with live Chainlink and Uniswap V3 pool
- [ ] **DAO signer** must be available to sign `MerchantPortal.setViewer` within the deploy session
- [ ] **Verify** all contracts on BaseScan (`VERIFY_CONTRACTS=true`)
- [ ] **Audit** the full `DeploymentBook` against this document's address table
- [ ] **Schedule** the 180-day SystemHandover key-burn countdown from deploy block
- [ ] **Transfer** `VFIDEEnterpriseGateway.merchantWallet` from deployer to ops multisig
- [ ] **Queue** GOV-D1 (CouncilElection → DAO) within 48h of deploy (see §11)

---

*This runbook is the canonical pre-testnet operator reference. Update whenever constructor
signatures, deploy-layer ordering, or post-deploy wiring changes.*
