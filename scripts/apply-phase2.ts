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
  console.log("Phase 2 — applying with:", deployer.address);
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
  const flashLoanAddr = process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS;
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // 1. Confirm FraudRegistry systemExempt (proposed in Phase 1)
  await safeApply("FraudRegistry systemExempt confirmed", async () => token.confirmSystemExempt());

  // 2. Propose FlashLoan systemExempt
  if (flashLoanAddr) {
    await safeApply(
      "FlashLoan systemExempt proposed → confirm in apply-phase3.ts (48h)",
      async () => token.proposeSystemExempt(flashLoanAddr, true)
    );
  } else {
    console.log("  ⚠️  FLASH_LOAN_ADDRESS not set");
  }

  if (hardFailures > 0) {
    throw new Error(`apply-phase2 encountered ${hardFailures} non-benign failure(s)`);
  }

  console.log("\n✅ Phase 2 complete. Wait 48h then run apply-phase3.ts.");
}

main().catch(console.error);
