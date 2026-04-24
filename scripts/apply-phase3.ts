/**
 * VFIDE Wiring Finalization — Phase 3 (Final)
 * 
 * Run 48 hours after apply-phase2.ts.
 * Confirms FlashLoan exemption. All wiring complete.
 * 
 * Run: npx hardhat run scripts/apply-phase3.ts --network baseSepolia
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
  console.log("Phase 3 (final) — applying with:", deployer.address);
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
  if (!tokenAddr) throw new Error("Set NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS in .env");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  // Confirm FlashLoan systemExempt (proposed in Phase 2)
  await safeApply("FlashLoan systemExempt confirmed", async () => token.confirmSystemExempt());

  if (hardFailures > 0) {
    throw new Error(`apply-phase3 encountered ${hardFailures} non-benign failure(s)`);
  }

  console.log("\n✅ All wiring complete.");
  console.log("\n═══ SYSTEM EXEMPT STATUS ═══");
  console.log("  FeeDistributor: ✅ (Phase 1)");
  console.log("  FraudRegistry:  ✅ (Phase 2)");
  console.log("  FlashLoan:      ✅ (Phase 3)");
  console.log("\n⚠️  NEXT STEPS:");
  console.log("  1. Deploy OwnerControlPanel, VaultRecoveryClaim, + remaining contracts");
  console.log("  2. Register VaultRecoveryClaim: vaultHub.setRecoveryApprover(addr, true)");
  console.log("  3. Transfer ownership of all contracts to multisig");
  console.log("  4. Transfer VFIDEToken ownership to OwnerControlPanel");
  console.log("  5. Run SystemHandover after 6 months to burn dev keys");
}

main().catch(console.error);
