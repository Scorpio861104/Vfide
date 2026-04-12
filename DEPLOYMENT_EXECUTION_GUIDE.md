# VFIDE Phased Deployment Execution Guide

**Document Date:** April 12, 2026  
**Status:** READY FOR EXECUTION  
**Target Network:** Base Sepolia (testnet)

---

## Overview

VFIDE deployment is split into 5 phases, each deploying a logical set of contracts with explicit dependency ordering. Phase 1 (foundation) must complete before Phase 2, and so on.

**Key Pattern:** Each phase introduces 48-hour timelocks on sensitive module wiring. This means:
- Deploy Phase N (takes 5-10 min on-chain)
- Propose module changes via setters (immediate)
- Wait 48 hours for timelock to elapse
- Execute pending changes via apply scripts
- Then proceed to Phase N+1

---

## Pre-Deployment Checklist

### Prerequisites
- [ ] **Deployer Private Key:** Export as `PRIVATE_KEY` env var
- [ ] **RPC Endpoint:** Base Sepolia RPC available (defaults to public: `https://sepolia.base.org`)
- [ ] **Signer Balance:** At least 0.5 ETH for gas (estimate ~0.3 ETH for Phase 1)
- [ ] **Hardhat Artifacts:** Contracts compiled (`npm run contract:compile`)
- [ ] **Script Permissions:** Read/write access to `.deployments/` directory

### Environment Variables (Required)

```bash
# Signing & RPC
export PRIVATE_KEY="0x..."  # Deployer account private key
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"  # Optional, uses public RPC if unset

# Optional: Etherscan verification
export BASESCAN_API_KEY="..."  # For contract verification after deploy
```

### Network Configuration

- **Network Name:** `baseSepolia`
- **Chain ID:** 84532
- **Default RPC:** https://sepolia.base.org (public, may have rate limits)
- **Explorer:** https://sepolia.basescan.org

---

## Validation Step (No Gas Required)

Before deploying, run the dry-run validator to check all dependencies are satisfied:

```bash
# Validates Phase 1 contract ordering, dependencies, and constructor args
# Does NOT execute any on-chain transactions (safe to run without PRIVATE_KEY)
npx hardhat run scripts/validate-phase1-dry-run.ts

# Expected output:
# ✅ All validations passed!
# (followed by deployment plan)
```

---

## Phase 1: Foundation Layer Deployment

**Contracts:** 11 core contracts (foundation + trust engine + vault system + commerce + governance)

**Duration:**
- On-chain: ~5-10 minutes (11 deployments + 1 VaultHub registration)
- Waiting: 48 hours (for timelock to elapse before Phase 2)

**Cost Estimate:** ~0.25-0.35 ETH in gas

### Phase 1 Execution

```bash
# Set environment variables
export PRIVATE_KEY="0x..."
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"  # Optional

# Deploy Phase 1
npm run deploy:all -- --network baseSepolia

# Expected output:
# Deploying with: 0x<deployer-address>
# Balance: X.XX ETH
# 
# === LAYER 1: Foundation ===
#   Deploying ProofLedger...
#   ✅ ProofLedger: 0x...
#   ...
# 
# === LAYER 2: Trust Engine ===
#   ...
#
# Phase 1 deployment complete. Address book saved to .deployments/baseSepolia.json
```

### Post-Phase 1: Address Book Verification

After deployment, verify the address book was created:

```bash
cat .deployments/baseSepolia.json

# Should contain entries like:
# {
#   "ProofLedger": "0x...",
#   "DevReserveVestingVault": "0x...",
#   "VFIDEToken": "0x...",
#   ...
# }
```

### Timelock Wait: 48 Hours

After Phase 1 deploy completes, **wait 48 hours** before proceeding to the apply script. 

**Why?** All module wiring (setting VFIDEToken's VaultHub, Seer's hub, etc.) uses DAOTimelock with a 48-hour delay. You must wait for this delay to elapse before changes take effect.

---

## Phase 1 Finalization: Apply Wiring

**After 48 hours have elapsed**, execute the apply script to finalize Phase 1 module connections:

```bash
# Apply Phase 1 module wiring (executes pending timelock proposals)
npm run apply:all -- --network baseSepolia

# Expected output:
# Applying Phase 1 wiring...
#   Approve VFIDEToken for VaultHub...
#   Approve Seer for VaultHub...
#   ...
# Phase 1 wiring complete.
```

This script:
- Executes pending DAOTimelock proposals
- Wires VFIDEToken → VaultHub, Seer → VaultHub, etc.
- Validates all connections are live

### Validation After Phase 1 Apply

```bash
# Run a quick governance safety check (optional, validates sink wiring)
npx hardhat run scripts/verify-frontend-abi-parity.ts

# Should show no errors
```

---

## Phase 2: Governance Layer (Execution Phase)

**Contracts:** 5 governance contracts

**Duration:**
- On-chain: ~5-10 minutes
- Waiting: 48 hours (if deploying Phase 3 after)

**Cost Estimate:** ~0.1-0.15 ETH in gas

### Phase 2 Execution (After Phase 1 Apply Complete)

```bash
# Deploy Phase 2 (governance: timelock, proposers, multi-sig, recovery)
npm run deploy:phase2 -- --network baseSepolia

# Expected output:
# Phase 2 deploy network: baseSepolia
# Deployer: 0x<address>
# 
# Deploying OwnerControlPanel with 0 args
#   OwnerControlPanel: 0x...
# ...
#
# Phase 2 deployment complete. Saved addresses to .deployments/baseSepolia.json
```

### Phase 2 Finalization (After 48-Hour Timelock)

```bash
npm run apply:phase2 -- --network baseSepolia
```

---

## Phase 3: Economy Layer (Execution Phase)

**Contracts:** ~10 vault, salary, badge management contracts

**Cost Estimate:** ~0.2-0.3 ETH

### Phase 3 Execution

```bash
npm run deploy:phase3 -- --network baseSepolia
# (wait 48h)
npm run apply:phase3 -- --network baseSepolia
```

---

## Phase 4: Social & Autonomous Layer

**Contracts:** ~8 reputation + autonomous worker contracts

**Cost Estimate:** ~0.15-0.25 ETH

### Phase 4 Execution

```bash
npm run deploy:phase4 -- --network baseSepolia
# (wait 48h)
npm run apply:phase4 -- --network baseSepolia
```

---

## Phase 5: Commerce Extensions

**Contracts:** ~6 merchant payment + subscription contracts

**Cost Estimate:** ~0.1-0.2 ETH

### Phase 5 Execution

```bash
npm run deploy:phase5 -- --network baseSepolia
# (wait 48h)
npm run apply:phase5 -- --network baseSepolia
```

---

## Governance Handover: transfer-governance.ts

**After all 5 phases complete and apply scripts execute**, run the governance transfer script to finalize DAO ownership:

```bash
# Executes governance handover: fee sinks, burn router modules, DAO role transfer, timelock admin swap
npm run transfer-governance -- --network baseSepolia

# This script:
# 1. Transfers DAO admin role to DAOTimelock (removing deployer)
# 2. Sets fee distribution sinks (treasurySink, sanctumSink, ecosystemSink)
# 3. Wires GovernanceHooks into Seer voting system
# 4. Confirms all timelocks are in place

# Expected output:
# Transferring governance...
#   Setting DAOTimelock as DAO admin...
#   Wiring FeeDistributor sinks...
#   Confirming timelocks...
# ✅ Governance transfer complete.
```

---

## Deployment Summary: Timeline

| Phase | Contracts | Deploy Time | Timelock Wait | Apply Time | Total Elapsed |
|-------|-----------|-------------|---------------|------------|---------------|
| 1     | 11        | 5-10 min    | 48h           | 5 min      | ~48h 20 min   |
| 2     | 5         | 5-10 min    | 48h (if→3)    | 5 min      | +48h          |
| 3     | ~10       | 10-15 min   | 48h (if→4)    | 5 min      | +48h          |
| 4     | ~8        | 10-15 min   | 48h (if→5)    | 5 min      | +48h          |
| 5     | ~6        | 10-15 min   | 0h (final)    | 5 min      | +20 min       |
| Gov   | 0         | N/A         | N/A           | 5 min      | +5 min        |
| **Total** | **~40** | **~40-60 min** | **~192h (8 days)** | **~25 min** | **~8 days 2 hours** |

**Fast-track:** If you skip timelock waits (not recommended for mainnet), total time is ~1-2 hours for all 5 phases. However, timelocks are intentional governance safety checks—respect them on mainnet.

---

## Troubleshooting

### "Cannot read property 'getAddress' of undefined"
**Cause:** Contract deployment failed; signer may not have enough gas.
**Fix:** Check balance with `ethers.provider.getBalance(signerAddress)` and ensure > 0.5 ETH.

### "Transaction reverted: ..."
**Cause:** Constructor argument mismatch or missing dependencies.
**Fix:** Check `.deployments/baseSepolia.json` for previous phase addresses; run `validate-phase1-dry-run.ts` to verify args.

### "PRIVATE_KEY not set"
**Cause:** Environment variable not exported.
**Fix:** Run `export PRIVATE_KEY="0x..."` before deploy, or add to `.env` and run `dotenv-cli npm run deploy:all`.

### Deployment stuck after Phase N
**Cause:** Timelock delay hasn't elapsed yet.
**Fix:** Wait 48 hours from deploy time, then run `npm run apply:phaseN`.

---

## Security Considerations

1. **Private Key Safety:** Never commit PRIVATE_KEY to version control. Use `.env.local` (git-ignored) or secret manager.
2. **Address Book Backup:** Save `.deployments/baseSepolia.json` to secure storage after each phase.
3. **Timelock Execution:** 48-hour timelocks are intentional. On mainnet, always review pending proposals before executing.
4. **Multi-Sig Governance:** After Phase 2, consider transferring DAO admin to a real multi-sig wallet, not just DAOTimelock.
5. **Testnet Labels:** Clearly mark all testnet-deployed contracts as "TESTNET" in Basescan verification to avoid confusion.

---

## Post-Deployment Validation (After All Phases)

### 1. Check AllContractsWired Event

Query contract events to confirm all wiring succeeded:

```hardhat
const dao = await ethers.getContractAt("DAO", deployedAddresses.DAO);
const events = await dao.queryFilter("DAOInitialized");
console.log("DAO initialization confirmed:", events.length > 0);
```

### 2. Verify Fee Distribution Setup

```hardhat
const feeDistributor = await ethers.getContractAt("FeeDistributor", deployedAddresses.FeeDistributor);
const burn = await feeDistributor.burn();
const sanctum = await feeDistributor.sanctum();
console.log("Fee sinks configured:", burn !== ethers.ZeroAddress && sanctum !== ethers.ZeroAddress);
```

### 3. Test Bridge Daily Cap

```hardhat
const bridge = await ethers.getContractAt("VFIDEBridge", deployedAddresses.VFIDEBridge);
const limit = await bridge.dailyBridgeLimit();
console.log("Bridge daily limit set:", limit > 0n);
```

---

## Next Steps

1. **Gather Prerequisites:** Set up PRIVATE_KEY and RPC endpoint
2. **Run Validator:** Execute `validate-phase1-dry-run.ts` (no gas)
3. **Phase 1 Deploy:** Run `npm run deploy:all` and wait 48h
4. **Phase 1 Apply:** Run `npm run apply:all`
5. **Phase 2-5 Deploy & Apply:** Repeat phases 2-5 with 48h waits
6. **Governance Handover:** Run `transfer-governance.ts`
7. **Mainnet Readiness:** After testnet validation, repeat on mainnet with real environment variables

---

## Support

For deployment issues or questions:
- Check contract logs: `grep -r "revert" ./test/contracts/`
- Review timelock state: `DAOTimelock.queryFilter("TimelockCreated")`
- Verify environment: `hardhat config list`

---

**Last Updated:** April 12, 2026  
**Phase 1 Validator Status:** ✅ PASSING  
**Deployment Scripts:** ✅ READY  
**Target Network:** Base Sepolia (testnet)
