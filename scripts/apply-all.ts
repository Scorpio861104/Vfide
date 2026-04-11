/**
 * VFIDE Wiring Finalization Script
 * 
 * Run AFTER 48 hours following deploy-all.ts to apply all pending module proposals.
 * Run: npx hardhat run scripts/apply-all.ts --network baseSepolia
 * 
 * Requires the deployed addresses from deploy-all.ts output in .env
 */

import hre from "hardhat";

const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Applying pending proposals with:", deployer.address);

  const tokenAddr = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // Apply token module proposals
  console.log("\n═══ Applying Token Module Proposals ═══");

  try {
    await token.applyVaultHub();
    console.log("  ✅ VaultHub applied");
  } catch (e: any) {
    console.log("  ⏭️  VaultHub:", e.reason || e.message);
  }

  try {
    await token.applyBurnRouter();
    console.log("  ✅ BurnRouter applied");
  } catch (e: any) {
    console.log("  ⏭️  BurnRouter:", e.reason || e.message);
  }

  try {
    await token.applyLedger();
    console.log("  ✅ Ledger applied");
  } catch (e: any) {
    console.log("  ⏭️  Ledger:", e.reason || e.message);
  }

  try {
    await token.applyFraudRegistry();
    console.log("  ✅ FraudRegistry applied");
  } catch (e: any) {
    console.log("  ⏭️  FraudRegistry:", e.reason || e.message);
  }

  // Apply system exemptions
  console.log("\n═══ Applying System Exemptions ═══");

  const feeDistAddr = process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS;
  if (feeDistAddr) {
    try {
      await token.applySystemExempt(feeDistAddr);
      console.log("  ✅ FeeDistributor systemExempt applied");
    } catch (e: any) {
      console.log("  ⏭️  FeeDistributor exempt:", e.reason || e.message);
    }
  }

  const flashLoanAddr = process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS;
  if (flashLoanAddr) {
    try {
      await token.applySystemExempt(flashLoanAddr);
      console.log("  ✅ FlashLoan systemExempt applied");
    } catch (e: any) {
      console.log("  ⏭️  FlashLoan exempt:", e.reason || e.message);
    }
  }

  console.log("\n✅ Wiring finalization complete.");
  console.log("⚠️  Next: Transfer all contract ownership to your multisig.");
}

main().catch(console.error);
