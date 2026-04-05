/**
 * Deploy P2P Lending Contracts — VFIDEFlashLoan + VFIDETermLoan
 *
 * Prerequisites:
 *   - VFIDEToken deployed and address known
 *   - Seer deployed and address known
 *   - VaultHub deployed and address known
 *   - FeeDistributor deployed and address known
 *   - DAO address (deployer initially, transferred after handover)
 *
 * Post-deployment:
 *   1. Register both contracts as systemExempt on VFIDEToken (48h timelock)
 *   2. Register both contracts as Seer operators
 *   3. Fund FlashLoan pool (if DAO wants protocol-owned liquidity alongside P2P)
 *   4. Set TermLoan score tiers if defaults need adjustment
 *
 * Usage:
 *   VFIDE_TOKEN=0x... SEER=0x... VAULT_HUB=0x... FEE_DIST=0x... \
 *   npx hardhat run scripts/deploy-lending.ts --network base
 */

import hre from "hardhat";

const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying lending contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Read addresses from environment
  const VFIDE_TOKEN = process.env.VFIDE_TOKEN;
  const SEER = process.env.SEER || ethers.ZeroAddress;
  const VAULT_HUB = process.env.VAULT_HUB || ethers.ZeroAddress;
  const FEE_DIST = process.env.FEE_DIST || ethers.ZeroAddress;
  const DAO = process.env.DAO || deployer.address;

  if (!VFIDE_TOKEN) {
    throw new Error("VFIDE_TOKEN environment variable required");
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Configuration");
  console.log("═══════════════════════════════════════════════════");
  console.log("  VFIDEToken:      ", VFIDE_TOKEN);
  console.log("  Seer:            ", SEER);
  console.log("  VaultHub:        ", VAULT_HUB);
  console.log("  FeeDistributor:  ", FEE_DIST);
  console.log("  DAO:             ", DAO);

  // ── Deploy VFIDEFlashLoan ──────────────────────────────────────────────
  console.log("\n1. Deploying VFIDEFlashLoan...");
  const FlashLoan = await ethers.getContractFactory("VFIDEFlashLoan");
  const flashLoan = await FlashLoan.deploy(VFIDE_TOKEN, DAO, SEER, FEE_DIST);
  await flashLoan.waitForDeployment();
  const flashLoanAddr = await flashLoan.getAddress();
  console.log("   VFIDEFlashLoan deployed to:", flashLoanAddr);

  // ── Deploy VFIDETermLoan ───────────────────────────────────────────────
  console.log("\n2. Deploying VFIDETermLoan...");
  const TermLoan = await ethers.getContractFactory("VFIDETermLoan");
  const termLoan = await TermLoan.deploy(VFIDE_TOKEN, DAO, SEER, VAULT_HUB, FEE_DIST);
  await termLoan.waitForDeployment();
  const termLoanAddr = await termLoan.getAddress();
  console.log("   VFIDETermLoan deployed to:", termLoanAddr);

  // ── Post-deployment instructions ───────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  POST-DEPLOYMENT STEPS (manual)");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("  Step 1: Register as systemExempt on VFIDEToken");
  console.log("  (48-hour timelock for each)");
  console.log(`    OwnerControlPanel.proposeSystemExempt("${flashLoanAddr}")`);
  console.log(`    OwnerControlPanel.proposeSystemExempt("${termLoanAddr}")`);
  console.log("    ... wait 48 hours ...");
  console.log(`    OwnerControlPanel.executeSystemExempt("${flashLoanAddr}")`);
  console.log(`    OwnerControlPanel.executeSystemExempt("${termLoanAddr}")`);
  console.log("");
  console.log("  Step 2: Register as Seer operators");
  console.log(`    Seer.addOperator("${flashLoanAddr}")`);
  console.log(`    Seer.addOperator("${termLoanAddr}")`);
  console.log("");
  console.log("  Step 3: Verify on block explorer");
  console.log(`    npx hardhat verify --network base ${flashLoanAddr} "${VFIDE_TOKEN}" "${DAO}" "${SEER}" "${FEE_DIST}"`);
  console.log(`    npx hardhat verify --network base ${termLoanAddr} "${VFIDE_TOKEN}" "${DAO}" "${SEER}" "${VAULT_HUB}" "${FEE_DIST}"`);
  console.log("");
  console.log("  Step 4 (optional): Increase Seer operator limits for TermLoan");
  console.log("  Default max per call: 100 (= -10.0 ProofScore)");
  console.log("  Default max per day: 200 (= -20.0 ProofScore)");
  console.log("  Full default uses 2x100 = 200 in one transaction.");
  console.log("  If higher penalties needed:");
  console.log(`    Seer.setOperatorLimits("${termLoanAddr}", maxSingle, maxDaily)`);
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("  VFIDEFlashLoan:", flashLoanAddr);
  console.log("  VFIDETermLoan: ", termLoanAddr);

  // Write addresses to file for reference
  const fs = await import("fs");
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      VFIDEFlashLoan: flashLoanAddr,
      VFIDETermLoan: termLoanAddr,
    },
    dependencies: {
      VFIDEToken: VFIDE_TOKEN,
      Seer: SEER,
      VaultHub: VAULT_HUB,
      FeeDistributor: FEE_DIST,
      DAO: DAO,
    },
  };
  fs.writeFileSync(
    `deployments/lending-${deployment.chainId}-${Date.now()}.json`,
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n  Deployment record saved to deployments/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
