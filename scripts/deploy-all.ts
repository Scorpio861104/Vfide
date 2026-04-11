/**
 * VFIDE Unified Deployment Script
 * 
 * Deploys ALL contracts in dependency order and wires them together.
 * Run: npx hardhat run scripts/deploy-all.ts --network baseSepolia
 * 
 * IMPORTANT: All module setters use 48h timelocks.
 * After deploy, wait 48h then run: npx hardhat run scripts/apply-all.ts --network baseSepolia
 */

import hre from "hardhat";

const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  const deployed: Record<string, string> = {};
  
  async function deploy(name: string, ...args: any[]) {
    console.log(`\n  Deploying ${name}...`);
    const Factory = await ethers.getContractFactory(name);
    const contract = await Factory.deploy(...args);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    deployed[name] = addr;
    console.log(`  ✅ ${name}: ${addr}`);
    return contract;
  }
  
  // ══════════════════════════════════════════════
  //  LAYER 1: Foundation
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 1: Foundation ═══");
  
  // ProofLedger(admin)
  await deploy("ProofLedger",
    deployer.address,             // admin
  );
  
  // DevReserveVestingVault(vfide, beneficiary, vaultHub, ledger, allocation, dao)
  // vfide and vaultHub are zero at deploy — wired after token exists
  await deploy("DevReserveVestingVault",
    ethers.ZeroAddress,           // _vfide (set after token deploy)
    deployer.address,             // _beneficiary
    ethers.ZeroAddress,           // _vaultHub (set after)
    ethers.ZeroAddress,           // _ledger (set after)
    ethers.parseEther("50000000"),// _allocation (50M VFIDE)
    deployer.address,             // _dao (temp, transfer to DAO later)
  );
  
  // VFIDEToken(devReserve, treasury, vaultHub, ledger, treasurySink)
  await deploy("VFIDEToken",
    deployed.DevReserveVestingVault, // devReserveVestingVault
    deployer.address,                // treasury (receives 150M)
    ethers.ZeroAddress,              // _vaultHub (set after via timelock)
    deployed.ProofLedger,            // _ledger
    deployer.address,                // _treasurySink (temp, update later)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 2: Trust Engine
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 2: Trust Engine ═══");
  
  // Seer(dao, ledger, hub)
  await deploy("Seer",
    deployer.address,             // _dao (temp)
    deployed.ProofLedger,         // _ledger
    ethers.ZeroAddress,           // _hub (set after VaultHub)
  );
  
  // ProofScoreBurnRouter(seer, sanctumSink, burnSink, ecosystemSink)
  await deploy("ProofScoreBurnRouter",
    deployed.Seer,                // _seer
    deployer.address,             // _sanctumSink (temp)
    deployer.address,             // _burnSink (temp)
    deployer.address,             // _ecosystemSink (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 3: Vault System
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 3: Vault System ═══");
  
  // VaultHub(vfideToken, ledger, dao)
  await deploy("VaultHub",
    deployed.VFIDEToken,          // _vfideToken
    deployed.ProofLedger,         // _ledger
    deployer.address,             // _dao (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 4: Commerce
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 4: Commerce ═══");
  
  // FeeDistributor(token, burn, sanctum, daoPayroll, merchantPool, headhunterPool, admin)
  await deploy("FeeDistributor",
    deployed.VFIDEToken,          // _token
    deployer.address,             // _burn (temp)
    deployer.address,             // _sanctum (temp)
    deployer.address,             // _daoPayroll (temp)
    deployer.address,             // _merchantPool (temp)
    deployer.address,             // _headhunterPool (temp)
    deployer.address,             // _admin
  );

  // MerchantPortal(dao, vaultHub, seer, ledger, feeSink)
  await deploy("MerchantPortal",
    deployer.address,             // _dao (temp)
    deployed.VaultHub,            // _vaultHub
    deployed.Seer,                // _seer
    deployed.ProofLedger,         // _ledger
    deployer.address,             // _feeSink (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 5: Governance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 5: Governance ═══");
  
  // DAOTimelock(admin)
  await deploy("DAOTimelock",
    deployer.address,             // _admin
  );

  // GovernanceHooks(ledger, seer, dao)
  await deploy("GovernanceHooks",
    deployed.ProofLedger,         // _ledger
    deployed.Seer,                // _seer
    deployer.address,             // _dao (temp)
  );
  
  // DAO(admin, timelock, seer, hub, hooks)
  await deploy("DAO",
    deployer.address,             // _admin (temp)
    deployed.DAOTimelock,         // _timelock
    deployed.Seer,                // _seer
    deployed.VaultHub,            // _hub
    deployed.GovernanceHooks,     // _hooks
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 6: Finance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 6: Finance ═══");
  
  // VFIDEFlashLoan(vfideToken, dao, seer, feeDistributor)
  await deploy("VFIDEFlashLoan",
    deployed.VFIDEToken,          // _vfideToken
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.FeeDistributor,      // _feeDistributor
  );
  
  // VFIDETermLoan(token, dao, seer, vaultHub, feeDist)
  await deploy("VFIDETermLoan",
    deployed.VFIDEToken,          // _token
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.VaultHub,            // _vaultHub
    deployed.FeeDistributor,      // _feeDist
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 7: Safety
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 7: Safety ═══");
  
  // FraudRegistry(dao, seer, vfideToken)
  await deploy("FraudRegistry",
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.VFIDEToken,          // _vfideToken
  );
  
  // VFIDETestnetFaucet(vfideToken, owner) — testnet only
  await deploy("VFIDETestnetFaucet",
    deployed.VFIDEToken,          // _vfideToken
    deployer.address,             // _owner
  );
  
  // ══════════════════════════════════════════════
  //  WIRING (48h timelocks — these are proposals)
  // ══════════════════════════════════════════════
  console.log("\n═══ WIRING (proposals — apply after 48h) ═══");
  
  const tokenContract = await ethers.getContractAt("VFIDEToken", deployed.VFIDEToken);
  
  // Token module proposals (48h timelocks)
  await tokenContract.setVaultHub(deployed.VaultHub);
  console.log("  Proposed: VaultHub → Token");
  
  await tokenContract.setBurnRouter(deployed.ProofScoreBurnRouter);
  console.log("  Proposed: BurnRouter → Token");
  
  await tokenContract.setFraudRegistry(deployed.FraudRegistry);
  console.log("  Proposed: FraudRegistry → Token");
  
  // System exemptions (48h timelock each)
  await tokenContract.proposeSystemExempt(deployed.FeeDistributor, true);
  console.log("  Proposed: FeeDistributor as systemExempt");
  
  await tokenContract.proposeSystemExempt(deployed.VFIDEFlashLoan, true);
  console.log("  Proposed: FlashLoan as systemExempt");

  // ══════════════════════════════════════════════
  //  OUTPUT
  // ══════════════════════════════════════════════
  console.log("\n═══ DEPLOYED ADDRESSES ═══");
  for (const [name, addr] of Object.entries(deployed)) {
    console.log(`  ${name}: ${addr}`);
  }
  
  console.log("\n═══ .env VALUES ═══");
  console.log(`NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=${deployed.VFIDEToken}`);
  console.log(`NEXT_PUBLIC_VAULT_HUB_ADDRESS=${deployed.VaultHub}`);
  console.log(`NEXT_PUBLIC_SEER_ADDRESS=${deployed.Seer}`);
  console.log(`NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS=${deployed.MerchantPortal}`);
  console.log(`NEXT_PUBLIC_BURN_ROUTER_ADDRESS=${deployed.ProofScoreBurnRouter}`);
  console.log(`NEXT_PUBLIC_DAO_ADDRESS=${deployed.DAO}`);
  console.log(`NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS=${deployed.DAOTimelock}`);
  console.log(`NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS=${deployed.FraudRegistry}`);
  console.log(`NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${deployed.FeeDistributor}`);
  console.log(`NEXT_PUBLIC_FAUCET_ADDRESS=${deployed.VFIDETestnetFaucet}`);
  
  console.log("\n⚠️  IMPORTANT: Wait 48 hours, then run apply-all.ts to finalize wiring.");
  console.log("⚠️  IMPORTANT: Transfer ownership to multisig before mainnet announcement.");
}

main().catch(console.error);
