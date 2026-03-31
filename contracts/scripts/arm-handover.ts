/**
 * @fileoverview Arm the SystemHandover countdown
 * @description One-shot script to call SystemHandover.arm(t0), which starts the
 *              governance-handover countdown.  Call this only once you have replaced
 *              the dao/timelock/council temporary slots in SystemHandover with real
 *              governance contract addresses (via setDAO / setTimelock / setCouncilElection).
 *
 *              arm() is idempotent (calling it a second time is a no-op), but the
 *              timestamp passed to the first call is permanent.
 *
 * Usage:
 *   SYSTEM_HANDOVER=0x…  hardhat run contracts/scripts/arm-handover.ts --network <network>
 *
 *   Or via deployment manifest:
 *   DEPLOYMENT_FILE=deployments-solo-<network>-<ts>.json \
 *   hardhat run contracts/scripts/arm-handover.ts --network <network>
 *
 * Optional:
 *   HANDOVER_START_TIMESTAMP=<unix seconds>  (defaults to current block timestamp)
 */

import hre from 'hardhat';

const ethers = (hre as any).ethers;

function required(name: string, value: string | undefined): string {
  if (!value || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  console.log('🤝 Arming SystemHandover countdown…\n');

  // Resolve handover contract address
  let handoverAddr: string;
  if (process.env.SYSTEM_HANDOVER) {
    handoverAddr = required('SYSTEM_HANDOVER', process.env.SYSTEM_HANDOVER);
  } else {
    const deploymentFile = process.env.DEPLOYMENT_FILE;
    if (!deploymentFile) {
      throw new Error('Provide SYSTEM_HANDOVER=0x… or DEPLOYMENT_FILE=<path>');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
    handoverAddr = manifest.addresses?.systemHandover;
    if (!handoverAddr) throw new Error(`systemHandover not found in ${deploymentFile}`);
  }

  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error('No signer available');

  console.log(`   Signer:   ${signer.address}`);
  console.log(`   Handover: ${handoverAddr}\n`);

  const handover = await ethers.getContractAt('SystemHandover', handoverAddr);

  // Check if already armed (arm() is idempotent — it checks start != 0)
  const existingStart: bigint = await handover.start();
  if (existingStart !== 0n) {
    const handoverAt: bigint = await handover.handoverAt();
    console.log(`ℹ️  SystemHandover already armed.`);
    console.log(`   Armed at:     ${new Date(Number(existingStart) * 1000).toUTCString()}`);
    console.log(`   Handover at:  ${new Date(Number(handoverAt)    * 1000).toUTCString()}`);
    console.log('   Nothing to do.');
    return;
  }

  // Determine launch timestamp
  const block = await ethers.provider.getBlock('latest');
  const nowSeconds: number = block!.timestamp;

  let t0: number;
  if (process.env.HANDOVER_START_TIMESTAMP) {
    t0 = parseInt(process.env.HANDOVER_START_TIMESTAMP, 10);
    if (isNaN(t0)) throw new Error('HANDOVER_START_TIMESTAMP must be a Unix timestamp in seconds');
    if (t0 === 0) throw new Error('HANDOVER_START_TIMESTAMP must not be zero');
  } else {
    t0 = nowSeconds;
  }

  console.log(`   Arming with t0: ${t0} (${new Date(t0 * 1000).toUTCString()})`);
  console.log('   ⚠️  This sets the governance-handover countdown. Ensure dao/timelock/council');
  console.log('       slots in SystemHandover are real governance contracts before proceeding.\n');

  const tx = await handover.arm(t0);
  const receipt = await tx.wait();
  console.log(`✅ SystemHandover armed! Tx: ${receipt.hash}`);

  // Read back handoverAt for confirmation
  const handoverAt: bigint = await handover.handoverAt();
  console.log(`\n📅 Handover schedule:`);
  console.log(`   Armed at:    ${new Date(t0 * 1000).toUTCString()}`);
  console.log(`   Handover at: ${new Date(Number(handoverAt) * 1000).toUTCString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ arm-handover failed:', error);
    process.exit(1);
  });
