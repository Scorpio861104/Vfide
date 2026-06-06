/**
 * #206 FIX: Finalize DAOTimelock admin rotation to DAO.
 *
 * This script executes the pending DAOTimelock.setAdmin(DAO) transaction that was
 * queued by transfer-governance.ts. Run it after the 48h timelock delay has elapsed.
 *
 * The execute() call is permissionless for setAdmin-to-self transactions (#208 FIX),
 * so this can be run by any address — not just the original deployer.
 *
 * Usage:
 *   npx hardhat run scripts/finalize-admin-rotation.ts --network <network>
 *
 * Required env vars:
 *   NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS   — deployed DAOTimelock address
 *   NEXT_PUBLIC_DAO_ADDRESS            — deployed DAO address (new admin target)
 *
 * Optional:
 *   DRY_RUN=true   — simulate without broadcasting
 */

import hre from "hardhat";

async function main() {
  const { ethers } = (await (hre as any).network.connect()) as any;
  const [executor] = await ethers.getSigners();
  const timelockAddr = process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS;
  const daoAddr = process.env.NEXT_PUBLIC_DAO_ADDRESS;
  const dryRun = process.env.DRY_RUN === "true";

  if (!timelockAddr || !daoAddr) {
    throw new Error("Missing NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS or NEXT_PUBLIC_DAO_ADDRESS env vars");
  }

  console.log(`Executor:  ${executor.address}`);
  console.log(`Timelock:  ${timelockAddr}`);
  console.log(`DAO:       ${daoAddr}`);
  console.log(`Dry run:   ${dryRun}`);

  const timelock = await ethers.getContractAt("DAOTimelock", timelockAddr);

  const currentAdmin = await timelock.admin();
  console.log(`\nCurrent timelock admin: ${currentAdmin}`);

  if (currentAdmin.toLowerCase() === daoAddr.toLowerCase()) {
    console.log("✅ Admin rotation already complete — DAOTimelock.admin is already the DAO.");
    return;
  }

  // Scan queued transactions for a setAdmin(DAO) call
  const queuedTxs = await timelock.getQueuedTransactions();
  const now = BigInt(Math.floor(Date.now() / 1000));

  let targetTxId: string | null = null;
  for (let i = 0; i < queuedTxs.ids.length; i++) {
    const id = queuedTxs.ids[i] as string;
    const target = queuedTxs.targets[i] as string;
    const eta = queuedTxs.etas[i] as bigint;
    const done = queuedTxs.done[i] as boolean;
    const expired = queuedTxs.expired[i] as boolean;

    if (done || expired) continue;
    if (target.toLowerCase() !== timelockAddr.toLowerCase()) continue;

    // Read raw calldata from queue mapping
    const op = await timelock.queue(id);
    const data: string = op.data;

    // Check for setAdmin(daoAddr) calldata
    const expectedData = timelock.interface.encodeFunctionData("setAdmin", [daoAddr]);
    if (data.toLowerCase() === expectedData.toLowerCase()) {
      console.log(`\nFound pending setAdmin(DAO) tx: ${id}`);
      console.log(`  ETA: ${new Date(Number(eta) * 1000).toISOString()}`);

      if (now < eta) {
        const remaining = Number(eta - now);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        console.log(`  ⏳ Not yet executable: ${hours}h ${minutes}m remaining`);
        console.log("     Run this script again after the delay elapses.");
        return;
      }

      targetTxId = id;
      break;
    }
  }

  if (!targetTxId) {
    console.log("\n⚠️  No pending setAdmin(DAO) transaction found in the timelock queue.");
    console.log("   Run transfer-governance.ts first to queue the admin rotation.");
    return;
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would call timelock.execute(${targetTxId})`);
    return;
  }

  console.log(`\nExecuting timelock.execute(${targetTxId}) ...`);
  const tx = await timelock.execute(targetTxId);
  const receipt = await tx.wait();
  console.log(`  ✅ Executed in tx ${receipt.hash}`);

  const newAdmin = await timelock.admin();
  console.log(`\nNew timelock admin: ${newAdmin}`);
  if (newAdmin.toLowerCase() === daoAddr.toLowerCase()) {
    console.log("✅ Admin rotation complete — DAOTimelock.admin is now the DAO.");
  } else {
    console.log("⚠️  Admin did not update as expected. Check the transaction.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
