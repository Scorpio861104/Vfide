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

const BENIGN_PATTERNS = [/already applied/i, /no pending/i, /VF_NoPending/i, /already set/i];

function classifyError(err: any): { kind: "skipped" | "failed"; message: string } {
  const message = String(err?.reason || err?.shortMessage || err?.message || err);
  if (BENIGN_PATTERNS.some((pattern) => pattern.test(message))) {
    return { kind: "skipped", message };
  }
  return { kind: "failed", message };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Applying pending proposals with:", deployer.address);
  let hardFailures = 0;

  async function safeApply(label: string, action: () => Promise<any>) {
    try {
      await action();
      console.log(`  ✅ ${label}`);
      return;
    } catch (e: any) {
      const outcome = classifyError(e);
      if (outcome.kind === "skipped") {
        console.log(`  ⏭️  ${label}: ${outcome.message}`);
      } else {
        hardFailures++;
        console.error(`  ❌ ${label}: ${outcome.message}`);
      }
    }
  }

  const tokenAddr = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  const fraudAddr = process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS;
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // ══════════════════════════════════════════════
  //  Apply Token Module Timelocks
  // ══════════════════════════════════════════════
  console.log("\n═══ Applying Token Module Proposals ═══");

  for (const fn of ["applyVaultHub", "applyBurnRouter", "applyLedger", "applyFraudRegistry"]) {
    await safeApply(`${fn} applied`, async () => token[fn]());
  }

  // ══════════════════════════════════════════════
  //  System Exemptions — Phase 1
  //  Only ONE can be pending at a time.
  // ══════════════════════════════════════════════
  console.log("\n═══ System Exemptions (Phase 1) ═══");

  // 1. Confirm FeeDistributor (proposed in deploy-all.ts)
  await safeApply("FeeDistributor systemExempt confirmed", async () => token.confirmSystemExempt());

  // 2. Propose FraudRegistry (CRITICAL — without this, releaseEscrow charges fees + re-escrows)
  if (fraudAddr) {
    await safeApply(
      "FraudRegistry systemExempt proposed → confirm in apply-phase2.ts (48h)",
      async () => token.proposeSystemExempt(fraudAddr, true)
    );
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
    await safeApply("Seer.dao → DAO confirmed", async () => seer.applyDAOChange());
  }

  if (hardFailures > 0) {
    throw new Error(`apply-all encountered ${hardFailures} non-benign failure(s)`);
  }

  console.log("\n✅ Phase 1 complete.");
  console.log("⚠️  Wait 48h then run: npx hardhat run scripts/apply-phase2.ts");
}

main().catch(console.error);
