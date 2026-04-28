/**
 * VFIDE Full System Apply — timelock finalization
 *
 * Run every 48 hours after deploy-full.ts until this script reports
 * "All wiring complete."
 *
 * Each run advances through ONE round of serialised system-exemption
 * confirmations (FeeDistributor → FraudRegistry → FlashLoan → EcosystemVault), applying
 * any other 48-hour token-module and Seer timelocks along the way.
 *
 * Run:
 *   npx hardhat run scripts/apply-full.ts --network baseSepolia
 *
 * The script is idempotent — calls that have already been applied are
 * silently skipped.
 */

import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

const ethers = (hre as any).ethers;
const EMERGENCY_CONTROLLER_IFACE = new ethers.Interface([
  "function emergencyController() view returns (address)",
]);

type Book = Record<string, string>;

function readBook(network: string): Book {
  const fp = path.join(process.cwd(), ".deployments", `${network}.json`);
  if (!fs.existsSync(fp)) {
    throw new Error(
      `Deployment book not found for network "${network}". Run deploy-full.ts first.`,
    );
  }
  return JSON.parse(fs.readFileSync(fp, "utf8")) as Book;
}

// Serialised exemption schedule: each entry is confirmed in the run where it
// was previously proposed, and the NEXT entry is proposed.
const EXEMPT_SCHEDULE = [
  "FeeDistributor",   // proposed in deploy-full.ts; confirmed in run 1
  "FraudRegistry",    // proposed in run 1;           confirmed in run 2
  "VFIDEFlashLoan",   // proposed in run 2;           confirmed in run 3
  "EcosystemVault",   // proposed in run 3;           confirmed in run 4
] as const;

const EMERGENCY_CONTROLLER_MONITOR = [
  "VFIDEToken",
  "Seer",
  "VaultHub",
  "FraudRegistry",
  "FeeDistributor",
  "EcosystemVault",
  "VFIDEFlashLoan",
] as const;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = process.env.HARDHAT_NETWORK ?? "hardhat";
  const book = readBook(network);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  VFIDE Full System Apply (timelocks)      ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Network  : ${network}`);
  console.log(`  Deployer : ${deployer.address}`);

  const tokenAddr = book.VFIDEToken ?? process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
  const seerAddr  = book.Seer       ?? process.env.NEXT_PUBLIC_SEER_ADDRESS;
  if (!tokenAddr) throw new Error("VFIDEToken address not found. Run deploy-full.ts first.");

  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);

  async function assertEmergencyControllerUnset(name: string, addr?: string) {
    if (!addr || addr === ethers.ZeroAddress) return;

    try {
      const calldata = EMERGENCY_CONTROLLER_IFACE.encodeFunctionData("emergencyController");
      const raw = await ethers.provider.call({ to: addr, data: calldata });
      const [controller] = EMERGENCY_CONTROLLER_IFACE.decodeFunctionResult("emergencyController", raw);

      if (controller !== ethers.ZeroAddress) {
        throw new Error(`${name}.emergencyController is set to ${controller}; expected zero address`);
      }

      console.log(`  ✅ ${name}.emergencyController is zero`);
    } catch (e: any) {
      const msg = String(e?.reason ?? e?.message ?? e);
      if (msg.includes("execution reverted") || msg.includes("CALL_EXCEPTION") || msg.includes("could not decode")) {
        console.log(`  ⏭  ${name}: no emergencyController() view; skipped`);
        return;
      }
      throw e;
    }
  }

  async function call(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      console.log(`  ✅ ${label}`);
    } catch (e: any) {
      console.log(`  ⏭  ${label}: ${e.reason ?? e.message?.slice(0, 80)}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Token module timelocks (setVaultHub / setBurnRouter / setFraudRegistry)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Token Module Timelocks ═══");
  for (const fn of ["applyVaultHub", "applyBurnRouter", "applyLedger", "applyFraudRegistry"]) {
    await call(fn, () => (token as any)[fn]());
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Emergency ownership path must stay dormant (no emergency controllers)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Emergency Controller Safety ═══");
  for (const contractName of EMERGENCY_CONTROLLER_MONITOR) {
    const envKey = `NEXT_PUBLIC_${contractName.toUpperCase().replace(/VFIDE/g, "VFIDE_")}_ADDRESS`;
    const addr = book[contractName] ?? process.env[envKey];
    await assertEmergencyControllerUnset(contractName, addr);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Seer DAO change (48h timelock, proposed in deploy-full.ts)
  // ══════════════════════════════════════════════════════════════════════════
  if (seerAddr) {
    console.log("\n═══ Seer DAO Transfer ═══");
    const seer = await ethers.getContractAt("Seer", seerAddr);
    await call("Seer.applyDAOChange → DAO", () => seer.applyDAOChange());
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Serialised system-exemption queue
  //  Inspect which exemption is currently pending, confirm it, then propose
  //  the next one (if any remain).
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ System Exemption Queue ═══");

  // Determine which exemptions have already been confirmed by checking whether
  // we can confirm the pending one.  We do this by trying confirmSystemExempt:
  // - If it succeeds → we just confirmed the current pending entry; propose next.
  // - If it reverts  → either not ready yet (48h not elapsed) or nothing pending.
  let confirmedIndex = -1;
  for (let i = 0; i < EXEMPT_SCHEDULE.length; i++) {
    try {
      await token.confirmSystemExempt();
      confirmedIndex = i;
      console.log(`  ✅ ${EXEMPT_SCHEDULE[i]} systemExempt confirmed`);
      break;
    } catch (e: any) {
      // Not ready or not pending; check the next slot only if we haven't
      // confirmed anything yet (i.e., keep trying until one succeeds).
      if (i === EXEMPT_SCHEDULE.length - 1) {
        console.log(`  ⏭  confirmSystemExempt: ${e.reason ?? e.message?.slice(0, 80)}`);
      }
    }
  }

  // Propose the next exemption in the schedule
  const nextIndex = confirmedIndex + 1;
  if (nextIndex < EXEMPT_SCHEDULE.length) {
    const nextName = EXEMPT_SCHEDULE[nextIndex];
    if (nextName) {
      const nextEnvKey = `NEXT_PUBLIC_${nextName.toUpperCase().replace(/VFIDE/g, "VFIDE_")}_ADDRESS`;
      const nextAddr = book[nextName] ?? process.env[nextEnvKey];
      if (nextAddr) {
        await call(`Token.proposeSystemExempt(${nextName}) — round ${nextIndex + 1}`, () =>
          token.proposeSystemExempt(nextAddr, true),
        );
        console.log(`  ⏳ Wait 48h, then re-run apply-full.ts to confirm ${nextName}`);
      } else {
        console.log(`  ⚠  Address for ${nextName} not in deployment book — set it and re-run`);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  VaultHub: apply pending recovery approver (SeerGuardian)
  // ══════════════════════════════════════════════════════════════════════════
  const hubAddr = book.VaultHub ?? process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS;
  if (hubAddr) {
    console.log("\n═══ VaultHub Recovery Approver ═══");
    const hub = await ethers.getContractAt("VaultHub", hubAddr);
    await call("VaultHub.applyRecoveryApprover (SeerGuardian)", () =>
      hub.applyRecoveryApprover(),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Summary
  // ══════════════════════════════════════════════════════════════════════════
  const allDone = nextIndex >= EXEMPT_SCHEDULE.length && confirmedIndex >= 0;

  if (allDone) {
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ✅  All wiring complete.                                     ║");
    console.log("║                                                              ║");
    console.log("║  System exempt status:                                       ║");
    console.log("║    FeeDistributor ✅  FraudRegistry ✅  FlashLoan ✅          ║");
    console.log("║    EcosystemVault ✅                                          ║");
    console.log("║                                                              ║");
    console.log("║  Next steps:                                                 ║");
    console.log("║    1. Transfer all contract ownership to multisig            ║");
    console.log("║    2. Transfer VFIDEToken ownership → OwnerControlPanel      ║");
    console.log("║    3. Run scripts/transfer-governance.ts                     ║");
    console.log("║    4. Run SystemHandover after 6 months to burn dev keys     ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
  } else {
    const remaining = EXEMPT_SCHEDULE.length - (confirmedIndex + 1);
    console.log(`\n⏳ ${remaining} exemption round(s) remaining. Re-run apply-full.ts in 48h.\n`);
  }
}

main().catch(console.error);
