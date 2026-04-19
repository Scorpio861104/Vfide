/**
 * VFIDE Wiring Finalization — Phase 4 (Seer Modules)
 *
 * Run AFTER deploy-phase4.ts.
 * Registers SeerAutonomous, SeerGuardian, and SeerSocial with the core Seer
 * contract, authorizes them as operators, and proposes SeerGuardian as a
 * recovery approver on VaultHub (48h timelock — call applyRecoveryApprover()
 * after 48h).
 *
 * Run: npx hardhat run scripts/apply-phase4.ts --network baseSepolia
 */

import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Phase 4 (Seer modules) wiring with:", deployer.address);

  const seerAddr = process.env.NEXT_PUBLIC_SEER_ADDRESS;
  const seerAutoAddr = process.env.NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS;
  const seerGuardianAddr = process.env.NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS;
  const seerSocialAddr = process.env.NEXT_PUBLIC_SEER_SOCIAL_ADDRESS;
  const ledgerAddr = process.env.NEXT_PUBLIC_PROOF_LEDGER_ADDRESS;
  const hubAddr = process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS;

  if (!seerAddr) throw new Error("Set NEXT_PUBLIC_SEER_ADDRESS in .env");

  const seer = await ethers.getContractAt("Seer", seerAddr);

  // ══════════════════════════════════════════════
  //  Register SeerAutonomous
  // ══════════════════════════════════════════════
  if (seerAutoAddr) {
    console.log("\n═══ Registering SeerAutonomous ═══");

    try {
      await seer.setSeerAutonomous(seerAutoAddr);
      console.log("  ✅ Seer.setSeerAutonomous → SeerAutonomous");
    } catch (e: any) {
      console.log("  ⏭️  setSeerAutonomous:", e.reason || e.message);
    }

    try {
      await seer.setOperator(seerAutoAddr, true);
      console.log("  ✅ Seer.setOperator(SeerAutonomous, true)");
    } catch (e: any) {
      console.log("  ⏭️  setOperator(SeerAutonomous):", e.reason || e.message);
    }

    if (ledgerAddr) {
      const ledger = await ethers.getContractAt("ProofLedger", ledgerAddr);
      try {
        await ledger.setLogger(seerAutoAddr, true);
        console.log("  ✅ ProofLedger: SeerAutonomous registered as logger");
      } catch (e: any) {
        console.log("  ⏭️  ledger.setLogger(SeerAutonomous):", e.reason || e.message);
      }
    }
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS not set — skipping");
  }

  // ══════════════════════════════════════════════
  //  Register SeerGuardian
  // ══════════════════════════════════════════════
  if (seerGuardianAddr) {
    console.log("\n═══ Registering SeerGuardian ═══");

    try {
      await seer.setOperator(seerGuardianAddr, true);
      console.log("  ✅ Seer.setOperator(SeerGuardian, true)");
    } catch (e: any) {
      console.log("  ⏭️  setOperator(SeerGuardian):", e.reason || e.message);
    }

    // Propose SeerGuardian as recovery approver (48h timelock)
    if (hubAddr) {
      const hub = await ethers.getContractAt("VaultHub", hubAddr);
      try {
        await hub.setRecoveryApprover(seerGuardianAddr, true);
        console.log("  ✅ VaultHub.setRecoveryApprover(SeerGuardian) proposed → wait 48h then call applyRecoveryApprover()");
      } catch (e: any) {
        console.log("  ⏭️  hub.setRecoveryApprover(SeerGuardian):", e.reason || e.message);
      }
    }
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS not set — skipping");
  }

  // ══════════════════════════════════════════════
  //  Register SeerSocial
  // ══════════════════════════════════════════════
  if (seerSocialAddr) {
    console.log("\n═══ Registering SeerSocial ═══");
    try {
      await seer.setSeerSocial(seerSocialAddr);
      console.log("  ✅ Seer.setSeerSocial → SeerSocial");
    } catch (e: any) {
      console.log("  ⏭️  setSeerSocial:", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_SEER_SOCIAL_ADDRESS not set — skipping");
  }

  console.log("\n✅ Phase 4 wiring complete.");
  if (seerGuardianAddr && hubAddr) {
    console.log("⚠️  Wait 48h then call: vaultHub.applyRecoveryApprover()");
  }
}

main().catch(console.error);
