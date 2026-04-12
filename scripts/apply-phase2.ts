/**
 * VFIDE Wiring Finalization — Phase 2
 * 
 * Run 48 hours after apply-all.ts (Phase 1).
 * Confirms FraudRegistry exemption, proposes FlashLoan exemption.
 * Wait 48h then run apply-phase3.ts.
 * 
 * Run: npx hardhat run scripts/apply-phase2.ts --network baseSepolia
 */

import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Phase 2 — applying with:", deployer.address);

  const tokenAddr = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  const flashLoanAddr = process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS;
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // 1. Confirm FraudRegistry systemExempt (proposed in Phase 1)
  try {
    await token.confirmSystemExempt();
    console.log("  ✅ FraudRegistry systemExempt confirmed");
  } catch (e: any) {
    console.log("  ⏭️  confirmSystemExempt:", e.reason || e.message);
  }

  // 2. Propose FlashLoan systemExempt
  if (flashLoanAddr) {
    try {
      await token.proposeSystemExempt(flashLoanAddr, true);
      console.log("  ✅ FlashLoan systemExempt proposed → confirm in apply-phase3.ts (48h)");
    } catch (e: any) {
      console.log("  ⏭️  proposeSystemExempt(FlashLoan):", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  FLASH_LOAN_ADDRESS not set");
  }

  console.log("\n✅ Phase 2 complete. Wait 48h then run apply-phase3.ts.");
}

main().catch(console.error);
