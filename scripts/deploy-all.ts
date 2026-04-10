/**
 * VFIDE Unified Deployment Script
 * 
 * Deploys ALL contracts in dependency order and wires them together.
 * Run: npx hardhat run scripts/deploy-all.ts --network baseSepolia
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
  
  const proofLedger = await deploy("ProofLedger", deployer.address);
  
  // DevReserveVestingVault must exist before token
  const devVault = await deploy("DevReserveVestingVault",
    deployer.address, // beneficiary
    deployer.address, // admin
    ethers.ZeroAddress, // token (set after)
    ethers.ZeroAddress, // securityHub
    365 * 24 * 3600, // 1 year vest
    90 * 24 * 3600,  // 3 month cliff
  );
  
  const token = await deploy("VFIDEToken",
    deployed.DevReserveVestingVault,
    deployer.address,  // treasury
    ethers.ZeroAddress, // vaultHub (set after)
    deployed.ProofLedger,
    deployer.address,  // treasurySink (temp, update later)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 2: Trust Engine
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 2: Trust Engine ═══");
  
  const seer = await deploy("Seer", deployer.address, deployed.ProofLedger, ethers.ZeroAddress);
  const burnRouter = await deploy("ProofScoreBurnRouter",
    deployed.VFIDEToken,
    deployed.Seer,
    deployer.address,  // sanctumSink (temp)
    deployer.address,  // ecosystemSink (temp)
    deployer.address,  // burnSink
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 3: Vault System
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 3: Vault System ═══");
  
  const vaultHub = await deploy("VaultHub", deployer.address, deployed.VFIDEToken);
  
  // ══════════════════════════════════════════════
  //  LAYER 4: Commerce
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 4: Commerce ═══");
  
  const feeDistributor = await deploy("FeeDistributor",
    deployed.VFIDEToken,
    deployer.address, // burn
    deployer.address, // sanctum
    deployer.address, // daoPayroll
    deployer.address, // merchantPool
    deployer.address, // headhunterPool
  );

  const merchantPortal = await deploy("MerchantPortal",
    deployed.VFIDEToken,
    deployed.VaultHub,
    deployed.Seer,
    deployed.ProofLedger,
    deployer.address, // dao
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 5: Governance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 5: Governance ═══");
  
  const daoTimelock = await deploy("DAOTimelock", deployer.address, deployed.ProofLedger);
  const dao = await deploy("DAO", deployed.DAOTimelock, deployed.Seer, deployed.VaultHub, deployed.ProofLedger);
  
  // ══════════════════════════════════════════════
  //  LAYER 6: Finance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 6: Finance ═══");
  
  const flashLoan = await deploy("VFIDEFlashLoan", deployed.VFIDEToken, deployer.address);
  const termLoan = await deploy("VFIDETermLoan", deployed.VFIDEToken, deployed.Seer, deployed.VaultHub, deployer.address);
  
  // ══════════════════════════════════════════════
  //  NEW: Fraud Registry + Faucet
  // ══════════════════════════════════════════════
  console.log("\n═══ Fraud Registry + Faucet ═══");
  
  const fraudRegistry = await deploy("FraudRegistry", deployer.address, deployed.Seer, deployed.VFIDEToken);
  const faucet = await deploy("VFIDETestnetFaucet", deployed.VFIDEToken, deployer.address);
  
  // ══════════════════════════════════════════════
  //  WIRING (48h timelocks — these are proposals)
  // ══════════════════════════════════════════════
  console.log("\n═══ WIRING ═══");
  console.log("NOTE: All setters have 48h timelocks.");
  console.log("Run apply* functions after 48 hours.\n");
  
  const tokenContract = await ethers.getContractAt("VFIDEToken", deployed.VFIDEToken);
  
  // These are propose calls — need apply after 48h
  await tokenContract.setVaultHub(deployed.VaultHub);
  console.log("  Proposed: VaultHub on Token");
  
  await tokenContract.setBurnRouter(deployed.ProofScoreBurnRouter);
  console.log("  Proposed: BurnRouter on Token");
  
  await tokenContract.setFraudRegistry(deployed.FraudRegistry);
  console.log("  Proposed: FraudRegistry on Token");
  
  // System exemptions (48h timelock each)
  await tokenContract.proposeSystemExempt(deployed.FeeDistributor, true);
  console.log("  Proposed: FeeDistributor as systemExempt");

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
  console.log(`NEXT_PUBLIC_FAUCET_ADDRESS=${deployed.VFIDETestnetFaucet}`);
  
  console.log("\n⚠️  IMPORTANT: Run apply* functions after 48 hours to finalize wiring.");
}

main().catch(console.error);
