/**
 * Deploy VaultHubLite - Lightweight vault system for VFIDE
 * 
 * VaultHubLite constructor: (address _vfide, address _ledger)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-vault-hub-lite.js --network baseSepolia
 *   npx hardhat run scripts/deploy-vault-hub-lite.js --network base
 */

const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying VaultHubLite...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Required addresses - set via environment or use placeholders for initial deploy
  const VFIDE_TOKEN = process.env.VFIDE_TOKEN || ethers.ZeroAddress;
  const PROOF_LEDGER = process.env.PROOF_LEDGER || ethers.ZeroAddress;

  if (VFIDE_TOKEN === ethers.ZeroAddress) {
    console.log("⚠️  VFIDE_TOKEN not set - using zero address (configure after deployment)");
  }
  if (PROOF_LEDGER === ethers.ZeroAddress) {
    console.log("⚠️  PROOF_LEDGER not set - using zero address (configure after deployment)");
  }

  console.log("\nConstructor Arguments:");
  console.log("  vfideToken:", VFIDE_TOKEN);
  console.log("  proofLedger:", PROOF_LEDGER);

  // Deploy VaultHubLite
  console.log("\n📦 Deploying VaultHubLite...");
  const VaultHubLite = await ethers.getContractFactory("VaultHubLite");
  const vaultHub = await VaultHubLite.deploy(VFIDE_TOKEN, PROOF_LEDGER);
  await vaultHub.waitForDeployment();
  
  console.log("✅ VaultHubLite deployed to:", vaultHub.target);

  // Post-deployment setup instructions
  console.log("\n📋 Post-Deployment Steps:");
  console.log("═══════════════════════════════════════════════════════════════");
  
  if (VFIDE_TOKEN === ethers.ZeroAddress) {
    console.log("1. Set VFIDE Token:");
    console.log("   await vaultHub.setVfideToken(<token_address>)");
  }
  
  if (PROOF_LEDGER === ethers.ZeroAddress) {
    console.log("2. Set ProofLedger:");
    console.log("   await vaultHub.setProofLedger(<ledger_address>)");
  }

  console.log("\n3. Configure in VFIDETrust (Seer):");
  console.log("   await seer.setVaultHub(<vaultHub_address>)");
  
  console.log("\n4. Configure in VFIDEToken:");
  console.log("   await token.setVaultHub(<vaultHub_address>)");

  console.log("\n5. Verify on Explorer:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${vaultHub.target} "${VFIDE_TOKEN}" "${PROOF_LEDGER}"`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("🎉 Deployment Complete!");
  
  return {
    vaultHubLite: vaultHub.target,
    vfideToken: VFIDE_TOKEN,
    proofLedger: PROOF_LEDGER,
  };
}

main()
  .then((result) => {
    console.log("\nDeployment Summary:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
