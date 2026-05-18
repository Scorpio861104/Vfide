/**
 * @fileoverview Apply 48-hour timelocked wiring after deploy-solo.ts
 * @description Reads the deployment manifest written by deploy-solo.ts and calls
 *              the apply* functions on VFIDEToken once the 48-hour timelock
 *              imposed by setSecurityHub() / setBurnRouter() has expired.
 *
 * Usage:
 *   DEPLOYMENT_FILE=deployments-solo-<network>-<ts>.json \
 *   hardhat run contracts/scripts/apply-wiring.ts --network <network>
 *
 * Or set individual addresses via env vars:
 *   VFIDE_TOKEN=0x…  SECURITY_HUB=0x…  BURN_ROUTER=0x…  (BURN_ROUTER is optional)
 *   hardhat run contracts/scripts/apply-wiring.ts --network <network>
 */

import hre from 'hardhat';

const ethers = (hre as any).ethers;

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

function required(name: string, value: string | undefined): string {
  if (!value || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

interface WiringConfig {
  vfideToken: string;
  securityHub: string;
  burnRouter: string | null;
}

function getConfig(): WiringConfig {
  // Prefer explicit env vars; fall back to parsing a deployment manifest file.
  if (process.env.VFIDE_TOKEN && process.env.SECURITY_HUB) {
    return {
      vfideToken:  required('VFIDE_TOKEN',  process.env.VFIDE_TOKEN),
      securityHub: required('SECURITY_HUB', process.env.SECURITY_HUB),
      burnRouter:  process.env.BURN_ROUTER || null,
    };
  }

  const deploymentFile = process.env.DEPLOYMENT_FILE;
  if (!deploymentFile) {
    throw new Error(
      'Provide either DEPLOYMENT_FILE=<path> or VFIDE_TOKEN + SECURITY_HUB env vars'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const addrs = manifest.addresses as Record<string, string | null>;

  if (!addrs.vfideToken)  throw new Error(`vfideToken not found in ${deploymentFile}`);
  if (!addrs.securityHub) throw new Error(`securityHub not found in ${deploymentFile}`);

  return {
    vfideToken:  addrs.vfideToken,
    securityHub: addrs.securityHub,
    burnRouter:  addrs.proofScoreBurnRouter || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Applying 48-hour timelocked wiring on VFIDEToken…\n');

  const config = getConfig();
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No deployer signer available');
  console.log(`   Signer:      ${deployer.address}`);
  console.log(`   VFIDEToken:  ${config.vfideToken}`);
  console.log(`   SecurityHub: ${config.securityHub}`);
  console.log(`   BurnRouter:  ${config.burnRouter ?? '(not set — skipping)'}\n`);

  const token = await ethers.getContractAt('VFIDEToken', config.vfideToken);

  // ── Apply SecurityHub ──────────────────────────────────────────────────────
  console.log('1️⃣  Applying SecurityHub on VFIDEToken…');
  try {
    const tx = await token.applySecurityHub();
    await tx.wait();
    console.log('   ✓ SecurityHub applied');
  } catch (err: any) {
    if (err.message.includes('timelock') || err.message.includes('delay')) {
      console.error('   ✗ Timelock has not expired yet. Wait 48 hours after deploy-solo.ts was run.');
      process.exit(1);
    }
    throw err;
  }

  // ── Apply BurnRouter ───────────────────────────────────────────────────────
  if (config.burnRouter) {
    console.log('2️⃣  Applying BurnRouter on VFIDEToken…');
    try {
      const tx = await token.applyBurnRouter();
      await tx.wait();
      console.log('   ✓ BurnRouter applied');
    } catch (err: any) {
      if (err.message.includes('timelock') || err.message.includes('delay')) {
        console.error('   ✗ BurnRouter timelock has not expired yet.');
        process.exit(1);
      }
      throw err;
    }
  } else {
    console.log('2️⃣  Skipping BurnRouter (not configured)');
  }

  console.log('\n✅ Wiring applied successfully!\n');
  console.log('📝 Next Steps:');
  console.log('   • Start vesting:  hardhat run contracts/scripts/start-vesting.ts --network <network>');
  console.log('   • Arm handover:   hardhat run contracts/scripts/arm-handover.ts --network <network>');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ apply-wiring failed:', error);
    process.exit(1);
  });
