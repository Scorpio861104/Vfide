/**
 * VFIDE Wiring Finalization — Phase 5 (Commerce)
 *
 * Run AFTER deploy-phase5.ts.
 * Wires CommerceEscrow with MerchantRegistry, registers commerce contracts as
 * ProofLedger loggers, and transfers DAO role on SubscriptionManager to the
 * live DAO contract.
 *
 * Run: npx hardhat run scripts/apply-phase5.ts --network baseSepolia
 */

import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Phase 5 (Commerce) wiring with:", deployer.address);

  const merchantRegistryAddr = process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS;
  const commerceEscrowAddr = process.env.NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS;
  const subscriptionManagerAddr = process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS;
  const ledgerAddr = process.env.NEXT_PUBLIC_PROOF_LEDGER_ADDRESS;
  const daoAddr = process.env.NEXT_PUBLIC_DAO_ADDRESS;

  // ══════════════════════════════════════════════
  //  Wire MerchantRegistry ↔ CommerceEscrow
  // ══════════════════════════════════════════════
  if (merchantRegistryAddr && commerceEscrowAddr) {
    console.log("\n═══ Wiring MerchantRegistry ↔ CommerceEscrow ═══");
    const registry = await ethers.getContractAt("MerchantRegistry", merchantRegistryAddr);
    try {
      await registry.setAuthorizedEscrow(commerceEscrowAddr);
      console.log("  ✅ MerchantRegistry.setAuthorizedEscrow → CommerceEscrow");
    } catch (e: any) {
      console.log("  ⏭️  setAuthorizedEscrow:", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS or NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS not set — skipping");
  }

  // ══════════════════════════════════════════════
  //  ProofLedger logger registration
  // ══════════════════════════════════════════════
  if (ledgerAddr) {
    console.log("\n═══ ProofLedger Logger Registration ═══");
    const ledger = await ethers.getContractAt("ProofLedger", ledgerAddr);
    const loggers: Array<[string, string | undefined]> = [
      ["MerchantRegistry", merchantRegistryAddr],
      ["CommerceEscrow", commerceEscrowAddr],
      ["SubscriptionManager", subscriptionManagerAddr],
    ];
    for (const [name, addr] of loggers) {
      if (!addr) { console.log(`  ⏭️  ${name}: address not set`); continue; }
      try {
        await ledger.setLogger(addr, true);
        console.log(`  ✅ ${name} registered as logger`);
      } catch (e: any) {
        console.log(`  ⏭️  ${name}: ${(e as Error).message?.slice(0, 60)}`);
      }
    }
  }

  // ══════════════════════════════════════════════
  //  SubscriptionManager DAO transfer
  // ══════════════════════════════════════════════
  if (subscriptionManagerAddr && daoAddr) {
    console.log("\n═══ SubscriptionManager DAO Transfer ═══");
    const subManager = await ethers.getContractAt("SubscriptionManager", subscriptionManagerAddr);
    try {
      await subManager.setDAO(daoAddr);
      console.log("  ✅ SubscriptionManager.setDAO → DAO");
    } catch (e: any) {
      console.log("  ⏭️  SubscriptionManager.setDAO:", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS or NEXT_PUBLIC_DAO_ADDRESS not set — skipping");
  }

  console.log("\n✅ Phase 5 wiring complete.");
}

main().catch(console.error);
