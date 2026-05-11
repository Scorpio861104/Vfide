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

  const exemptEntries = EXEMPT_SCHEDULE
    .map((name) => {
      const envKey = `NEXT_PUBLIC_${name.toUpperCase().replace(/VFIDE/g, "VFIDE_")}_ADDRESS`;
      const addr = book[name] ?? process.env[envKey];
      return { name, addr };
    })
    .filter((entry): entry is { name: (typeof EXEMPT_SCHEDULE)[number]; addr: string } => !!entry.addr);

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
  //  Other timelocked DAO transfers (also queued in deploy-full.ts).
  //  Each contract has its own pending-DAO state and apply function:
  //    - MerchantPortal.applyDAO          (DAO_CHANGE_DELAY)
  //    - VFIDEFlashLoan.applyDAO          (DAO_CHANGE_DELAY)
  //    - VFIDETermLoan.applyDAO           (DAO_CHANGE_DELAY_TL)
  //    - FraudRegistry.applyDAO_FR        (DAO_CHANGE_DELAY_FR — note name)
  //  All are `onlyDAO`; at this point the current DAO is still the deployer.
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Module DAO Transfers ═══");
  const moduleDaoTransfers: Array<{
    name: string;
    bookKey: string;
    factoryName: string;
    fn: string;
  }> = [
    { name: "MerchantPortal", bookKey: "MerchantPortal", factoryName: "MerchantPortal", fn: "applyDAO" },
    { name: "VFIDEFlashLoan", bookKey: "VFIDEFlashLoan", factoryName: "VFIDEFlashLoan", fn: "applyDAO" },
    { name: "VFIDETermLoan",  bookKey: "VFIDETermLoan",  factoryName: "VFIDETermLoan",  fn: "applyDAO" },
    { name: "FraudRegistry",  bookKey: "FraudRegistry",  factoryName: "FraudRegistry",  fn: "applyDAO_FR" },
  ];
  for (const { name, bookKey, factoryName, fn } of moduleDaoTransfers) {
    const addr = book[bookKey];
    if (!addr) {
      console.log(`  ⏭  ${name}: not in book; skipped`);
      continue;
    }
    const c = await ethers.getContractAt(factoryName, addr);
    await call(`${name}.${fn} → DAO`, () => (c as any)[fn]());
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Serialised system-exemption queue
  //  Inspect which exemption is currently pending, confirm it, then propose
  //  the next one (if any remain).
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ System Exemption Queue ═══");
  let confirmedThisRun: { name: string; addr: string } | null = null;
  const pendingExemptAddr = String(await token.pendingExemptAddr());
  const pendingExemptAt = await token.pendingExemptAt();
  if (pendingExemptAt !== 0n) {
    try {
      await token.confirmSystemExempt();
      const matched = exemptEntries.find((entry) => entry.addr.toLowerCase() === pendingExemptAddr.toLowerCase());
      confirmedThisRun = {
        name: matched?.name ?? "unknown",
        addr: pendingExemptAddr,
      };
      console.log(`  ✅ ${confirmedThisRun.name} systemExempt confirmed (${pendingExemptAddr})`);
    } catch (e: any) {
      console.log(`  ⏭  confirmSystemExempt: ${e.reason ?? e.message?.slice(0, 80)}`);
    }
  } else {
    console.log("  ⏭  No pending system-exempt proposal to confirm");
  }

  if (confirmedThisRun?.name === "VFIDEFlashLoan") {
    const flashAddr = book.VFIDEFlashLoan ?? process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS;
    if (flashAddr) {
      const flash = await ethers.getContractAt("VFIDEFlashLoan", flashAddr);
      const daoAddr = String(await flash.dao());
      if (daoAddr.toLowerCase() === deployer.address.toLowerCase()) {
        await call("VFIDEFlashLoan.confirmSystemExempt", () => flash.confirmSystemExempt());
      } else {
        console.log(
          `  ⚠  VFIDEFlashLoan.dao is ${daoAddr}; current signer is not DAO. ` +
          "Confirm flash-loan initialization from the DAO-controlled signer after exemption confirmation."
        );
      }
    }
  }

  const statuses = await Promise.all(
    exemptEntries.map(async (entry) => ({
      ...entry,
      confirmed: await token.systemExempt(entry.addr),
    })),
  );

  const pendingAfterConfirm = await token.pendingExemptAt();
  if (pendingAfterConfirm === 0n) {
    const nextPending = statuses.find((entry) => !entry.confirmed);
    if (nextPending) {
      await call(`Token.proposeSystemExempt(${nextPending.name})`, () =>
        token.proposeSystemExempt(nextPending.addr, true),
      );
      console.log(`  ⏳ Wait 48h, then re-run apply-full.ts to confirm ${nextPending.name}`);
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
  //  EcosystemVault: execute queued manager change for the testnet faucet
  //  (queued in deploy-full.ts; SENSITIVE_CHANGE_DELAY = 2 days).
  //  Idempotent — reverts with ECO_NoPendingChange if nothing pending.
  // ══════════════════════════════════════════════════════════════════════════
  const ecoAddr = book.EcosystemVault ?? process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS;
  if (ecoAddr) {
    console.log("\n═══ EcosystemVault Manager Change ═══");
    const eco = await ethers.getContractAt("EcosystemVault", ecoAddr);
    await call("EcosystemVault.executeManagerChange (Faucet)", () =>
      eco.executeManagerChange(),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Summary
  // ══════════════════════════════════════════════════════════════════════════
  const allDone = statuses.length > 0 && statuses.every((entry) => entry.confirmed);

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
    console.log("║    2. Verify AdminMultiSig is owner of governed contracts    ║");
    console.log("║    3. Run scripts/transfer-governance.ts                     ║");
    console.log("║    4. Run SystemHandover after 6 months to burn dev keys     ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
  } else {
    const remaining = statuses.filter((entry) => !entry.confirmed).length;
    console.log(`\n⏳ ${remaining} exemption round(s) remaining. Re-run apply-full.ts in 48h.\n`);
  }
}

// OP-1 FIX: propagate non-zero exit on failure so CI/CD pipelines
// (and the deploy.sh wrapper) actually detect deploy errors. The
// previous `main().catch(console.error)` swallowed errors and returned
// exit code 0, making a partially-deployed system look like a successful
// deploy.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
