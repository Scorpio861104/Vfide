/**
 * @fileoverview Start DevReserveVestingVault vesting schedule
 * @description One-shot script to call DevReserveVestingVault.setVestingStart().
 *              Call this once — at the moment you want the 60-day cliff to begin.
 *              Callable only by the BENEFICIARY or DAO address; the timestamp must
 *              not be more than 7 days in the future.
 *
 * Usage:
 *   DEV_VAULT=0x…  hardhat run contracts/scripts/start-vesting.ts --network <network>
 *
 *   Or via deployment manifest:
 *   DEPLOYMENT_FILE=deployments-solo-<network>-<ts>.json \
 *   hardhat run contracts/scripts/start-vesting.ts --network <network>
 *
 * Optional:
 *   VESTING_START_TIMESTAMP=<unix seconds>   (defaults to current block timestamp)
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
  console.log('⏳ Starting DevReserveVestingVault vesting schedule…\n');

  // Resolve vault address
  let vaultAddr: string;
  if (process.env.DEV_VAULT) {
    vaultAddr = required('DEV_VAULT', process.env.DEV_VAULT);
  } else {
    const deploymentFile = process.env.DEPLOYMENT_FILE;
    if (!deploymentFile) {
      throw new Error('Provide DEV_VAULT=0x… or DEPLOYMENT_FILE=<path>');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
    vaultAddr = manifest.addresses?.devReserveVestingVault;
    if (!vaultAddr) throw new Error(`devReserveVestingVault not found in ${deploymentFile}`);
  }

  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error('No signer available');

  console.log(`   Signer: ${signer.address}`);
  console.log(`   Vault:  ${vaultAddr}\n`);

  const vault = await ethers.getContractAt('DevReserveVestingVault', vaultAddr);

  // Confirm not already started
  const existing: bigint = await vault.startTimestamp();
  if (existing !== 0n) {
    console.log(`ℹ️  Vesting already started at timestamp ${existing} (${new Date(Number(existing) * 1000).toUTCString()})`);
    console.log('   Nothing to do.');
    return;
  }

  // Determine start timestamp
  const block = await ethers.provider.getBlock('latest');
  const nowSeconds: number = block!.timestamp;

  let startTs: number;
  if (process.env.VESTING_START_TIMESTAMP) {
    startTs = parseInt(process.env.VESTING_START_TIMESTAMP, 10);
    if (isNaN(startTs)) throw new Error('VESTING_START_TIMESTAMP must be a Unix timestamp in seconds');
    if (startTs > nowSeconds + 7 * 24 * 3600) {
      throw new Error('VESTING_START_TIMESTAMP is more than 7 days in the future (contract will reject it)');
    }
  } else {
    startTs = nowSeconds;
  }

  const startDate = new Date(startTs * 1000).toUTCString();
  console.log(`   Setting vesting start: ${startTs} (${startDate})`);
  console.log('   ⚠️  This is a one-time irreversible operation. Proceed? (sending tx…)\n');

  const tx = await vault.setVestingStart(startTs);
  const receipt = await tx.wait();
  console.log(`✅ Vesting started! Tx: ${receipt.hash}`);

  // Read back the timestamps for confirmation
  const cliffTs: bigint  = await vault.cliffTimestamp();
  const endTs: bigint    = await vault.endTimestamp();
  console.log(`\n📅 Vesting schedule:`);
  console.log(`   Start: ${new Date(Number(startTs)  * 1000).toUTCString()}`);
  console.log(`   Cliff: ${new Date(Number(cliffTs)  * 1000).toUTCString()}`);
  console.log(`   End:   ${new Date(Number(endTs)    * 1000).toUTCString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ start-vesting failed:', error);
    process.exit(1);
  });
