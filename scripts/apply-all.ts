/**
 * VFIDE Wiring Finalization — Phase 1
 * 
 * Run 48 hours after deploy-all.ts.
 * 
 * System exemptions can only be proposed ONE AT A TIME on VFIDEToken.
 * This script confirms FeeDistributor (proposed in deploy-all) and
 * proposes FraudRegistry. Wait 48h then run apply-phase2.ts.
 * 
 * Run: npx hardhat run scripts/apply-all.ts --network baseSepolia
 */

import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Applying pending proposals with:", deployer.address);

  const tokenAddr = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  const fraudAddr = process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS;
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // ══════════════════════════════════════════════
  //  Apply Token Module Timelocks
  // ══════════════════════════════════════════════
  console.log("\n═══ Applying Token Module Proposals ═══");

  for (const fn of ["applyVaultHub", "applyBurnRouter", "applyLedger", "applyFraudRegistry"]) {
    try {
      await token[fn]();
      console.log(`  ✅ ${fn} applied`);
    } catch (e: any) {
      console.log(`  ⏭️  ${fn}: ${e.reason || e.message}`);
    }
  }

  // ══════════════════════════════════════════════
  //  System Exemptions — Phase 1
  //  Only ONE can be pending at a time.
  // ══════════════════════════════════════════════
  console.log("\n═══ System Exemptions (Phase 1) ═══");

  // 1. Confirm FeeDistributor (proposed in deploy-all.ts)
  try {
    await token.confirmSystemExempt();
    console.log("  ✅ FeeDistributor systemExempt confirmed");
  } catch (e: any) {
    console.log("  ⏭️  confirmSystemExempt:", e.reason || e.message);
  }

  // 2. Propose FraudRegistry (CRITICAL — without this, releaseEscrow charges fees + re-escrows)
  if (fraudAddr) {
    try {
      await token.proposeSystemExempt(fraudAddr, true);
      console.log("  ✅ FraudRegistry systemExempt proposed → confirm in apply-phase2.ts (48h)");
    } catch (e: any) {
      console.log("  ⏭️  proposeSystemExempt(FraudRegistry):", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  FRAUD_REGISTRY_ADDRESS not set — MUST be exempted before mainnet!");
  }

  // ══════════════════════════════════════════════
  //  Seer DAO Change (48h timelock, proposed in deploy-all)
  // ══════════════════════════════════════════════
  console.log("\n═══ Seer DAO Transfer ═══");

  const seerAddr = process.env.NEXT_PUBLIC_SEER_ADDRESS;
  if (seerAddr) {
    const seer = await ethers.getContractAt("Seer", seerAddr);
    try {
      await seer.applyDAOChange();
      console.log("  ✅ Seer.dao → DAO confirmed");
    } catch (e: any) {
      console.log("  ⏭️  Seer.applyDAOChange:", e.reason || e.message);
    }
  }

  console.log("\n✅ Phase 1 complete.");
  console.log("⚠️  Wait 48h then run: npx hardhat run scripts/apply-phase2.ts");
}

main().catch(console.error);
