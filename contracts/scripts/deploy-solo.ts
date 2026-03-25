/**
 * @fileoverview Solo-developer deployment script for VFIDE core contracts
 * @description Deploys all 9 core contracts in a single run without a presale contract
 *              or pre-deployed infrastructure. Handles the DevReserveVestingVault ↔
 *              VFIDEToken circular dependency via deterministic address pre-computation
 *              (ethers v6 getCreateAddress), matching the exact nonce sequence used here.
 *
 * Deployment order:
 *   1. ProofLedger
 *   2. SecurityHub
 *   3. VaultHub          ← receives pre-computed VFIDEToken address
 *   4. DevReserveVestingVault ← receives pre-computed VFIDEToken address (immutable)
 *   5. VFIDEToken        ← vault is now deployed (extcodesize check passes) ✓
 *   6. Seer
 *   7. ProofScoreBurnRouter (conditional — skipped when sink env vars are absent)
 *   8. OwnerControlPanel
 *   9. SystemHandover
 *
 * Post-deploy (same run):
 *   - Schedules token.setSecurityHub()  (48-hour timelock; apply via apply-wiring.ts)
 *   - Schedules token.setBurnRouter()   (48-hour timelock; apply via apply-wiring.ts)
 *   - Authorises Seer + VaultHub as ProofLedger loggers
 *
 * Required env vars:
 *   PRIVATE_KEY, OWNER_ADDRESS, TREASURY_ADDRESS (or OWNER_ADDRESS is used for both)
 *
 * Optional env vars for ProofScoreBurnRouter (all three required together):
 *   SANCTUM_SINK, BURN_SINK, ECOSYSTEM_SINK
 *   Note: all three must be non-zero and mutually distinct.
 *
 * Optional env vars:
 *   BENEFICIARY_ADDRESS  (defaults to OWNER_ADDRESS)
 *   VERIFY_CONTRACTS=true
 */

import hre from 'hardhat';
import { Contract } from 'ethers';

const ethers = (hre as any).ethers;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Must match DevReserveVestingVault.EXPECTED_ALLOCATION */
const DEV_RESERVE_ALLOCATION: bigint = BigInt('50000000000000000000000000'); // 50 000 000 × 10^18

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

interface SoloConfig {
  network: string;
  owner: string;
  treasury: string;
  beneficiary: string;
  sanctumSink: string | null;
  burnSink: string | null;
  ecosystemSink: string | null;
  verify: boolean;
}

interface DeployedAddresses {
  proofLedger: string;
  securityHub: string;
  vaultHub: string;
  devReserveVestingVault: string;
  vfideToken: string;
  seer: string;
  proofScoreBurnRouter: string | null;
  ownerControlPanel: string;
  systemHandover: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function required(name: string, value: string | undefined): string {
  if (!value || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(value: string | undefined): string {
  return value || ethers.ZeroAddress;
}

function getConfig(): SoloConfig {
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  const owner = required('OWNER_ADDRESS', process.env.OWNER_ADDRESS);
  const treasury = optional(process.env.TREASURY_ADDRESS) !== ethers.ZeroAddress
    ? process.env.TREASURY_ADDRESS!
    : owner;

  const sanctumSink  = process.env.SANCTUM_SINK   || null;
  const burnSink     = process.env.BURN_SINK       || null;
  const ecosystemSink = process.env.ECOSYSTEM_SINK || null;

  // ProofScoreBurnRouter requires all three sinks; validate together
  const sinksPartial = [sanctumSink, burnSink, ecosystemSink].filter(Boolean).length;
  if (sinksPartial > 0 && sinksPartial < 3) {
    throw new Error(
      'ProofScoreBurnRouter sinks must all be set together: SANCTUM_SINK, BURN_SINK, ECOSYSTEM_SINK'
    );
  }
  if (sanctumSink && burnSink && ecosystemSink) {
    const distinct = new Set([sanctumSink, burnSink, ecosystemSink]);
    if (distinct.size !== 3) {
      throw new Error('SANCTUM_SINK, BURN_SINK, and ECOSYSTEM_SINK must all be distinct addresses');
    }
  }

  return {
    network,
    owner,
    treasury,
    beneficiary: process.env.BENEFICIARY_ADDRESS || owner,
    sanctumSink,
    burnSink,
    ecosystemSink,
    verify: process.env.VERIFY_CONTRACTS === 'true',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deploy
// ─────────────────────────────────────────────────────────────────────────────

async function deployContracts(config: SoloConfig): Promise<{
  contracts: Record<string, Contract | null>;
  addresses: DeployedAddresses;
  constructorArgs: Record<string, unknown[]>;
}> {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No deployer signer available');
  console.log(`📝 Deploying from: ${deployer.address}\n`);

  // ── Address pre-computation ────────────────────────────────────────────────
  //
  // DevReserveVestingVault stores VFIDE as an immutable.  VFIDEToken requires
  // the vault to be already deployed (extcodesize check).  We break the cycle
  // by computing the VFIDEToken address deterministically before deploying it.
  //
  // Nonce map:  N+0 ProofLedger, N+1 SecurityHub, N+2 VaultHub,
  //             N+3 DevReserveVestingVault, N+4 VFIDEToken
  const startNonce = await deployer.getNonce();
  const precomputedToken = ethers.getCreateAddress({
    from: deployer.address,
    nonce: startNonce + 4,
  });
  console.log(`🔮 Pre-computed VFIDEToken address: ${precomputedToken}`);
  console.log(`   (will be verified after deployment)\n`);

  const constructorArgs: Record<string, unknown[]> = {};

  // ── 1. ProofLedger ────────────────────────────────────────────────────────
  console.log('1️⃣  Deploying ProofLedger…');
  constructorArgs.ProofLedger = [config.owner];
  const Ledger = await ethers.getContractFactory('ProofLedger');
  const ledger: Contract = await Ledger.deploy(...constructorArgs.ProofLedger);
  await ledger.waitForDeployment();
  const ledgerAddr = await ledger.getAddress();
  console.log(`   ✓ ${ledgerAddr}`);

  // ── 2. SecurityHub ────────────────────────────────────────────────────────
  console.log('2️⃣  Deploying SecurityHub…');
  // GuardianLock, PanicGuard, EmergencyBreaker are optional; wire later via setModules()
  constructorArgs.SecurityHub = [config.owner, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ledgerAddr];
  const SecHub = await ethers.getContractFactory('contracts/VFIDESecurity.sol:SecurityHub');
  const securityHub: Contract = await SecHub.deploy(...constructorArgs.SecurityHub);
  await securityHub.waitForDeployment();
  const securityHubAddr = await securityHub.getAddress();
  console.log(`   ✓ ${securityHubAddr}`);

  // ── 3. VaultHub ───────────────────────────────────────────────────────────
  console.log('3️⃣  Deploying VaultHub…');
  // Pre-computed token address satisfies the non-zero check; vfideToken is
  // mutable (setVFIDEToken() exists) so this will auto-resolve once VFIDEToken
  // is deployed at the same address.
  constructorArgs.VaultHub = [precomputedToken, securityHubAddr, ledgerAddr, config.owner];
  const Hub = await ethers.getContractFactory('VaultHub');
  const vaultHub: Contract = await Hub.deploy(...constructorArgs.VaultHub);
  await vaultHub.waitForDeployment();
  const vaultHubAddr = await vaultHub.getAddress();
  console.log(`   ✓ ${vaultHubAddr}`);

  // ── 4. DevReserveVestingVault ─────────────────────────────────────────────
  console.log('4️⃣  Deploying DevReserveVestingVault…');
  // VFIDE is immutable — must receive the correct token address at construction.
  // The pre-computed address is used here; it will match when VFIDEToken is
  // deployed next (nonce N+4).
  constructorArgs.DevReserveVestingVault = [
    precomputedToken,       // VFIDE (immutable)
    config.beneficiary,     // BENEFICIARY
    vaultHubAddr,           // VAULT_HUB
    securityHubAddr,        // SECURITY_HUB (optional but wired now)
    ledgerAddr,             // LEDGER (optional but wired now)
    DEV_RESERVE_ALLOCATION, // ALLOCATION — must equal EXPECTED_ALLOCATION (50M)
    config.owner,           // DAO placeholder (update via governance later)
  ];
  const Vault = await ethers.getContractFactory('DevReserveVestingVault');
  const devVault: Contract = await Vault.deploy(...constructorArgs.DevReserveVestingVault);
  await devVault.waitForDeployment();
  const devVaultAddr = await devVault.getAddress();
  console.log(`   ✓ ${devVaultAddr}`);

  // ── 5. VFIDEToken ─────────────────────────────────────────────────────────
  console.log('5️⃣  Deploying VFIDEToken…');
  // Vault is now deployed → extcodesize check in VFIDEToken constructor passes.
  // Mint: 50M → devVault, 150M → treasury.
  const actualNonceBeforeToken = await deployer.getNonce();
  if (actualNonceBeforeToken !== startNonce + 4) {
    throw new Error(
      `Nonce mismatch before VFIDEToken deploy: expected ${startNonce + 4}, got ${actualNonceBeforeToken}. ` +
      'Pre-computed token address is invalid. Ensure no extra transactions were sent from this account.'
    );
  }
  constructorArgs.VFIDEToken = [
    devVaultAddr,          // devReserveVestingVault (receives 50M)
    config.treasury,       // treasury (receives 150M)
    vaultHubAddr,          // _vaultHub (wired at construction)
    ledgerAddr,            // _ledger (wired at construction)
    ethers.ZeroAddress,    // _treasurySink (set later via 48h timelock)
  ];
  const Token = await ethers.getContractFactory('VFIDEToken');
  const token: Contract = await Token.deploy(...constructorArgs.VFIDEToken);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  if (tokenAddr.toLowerCase() !== precomputedToken.toLowerCase()) {
    throw new Error(
      `VFIDEToken address mismatch: expected ${precomputedToken}, got ${tokenAddr}. ` +
      'DevReserveVestingVault was deployed with a wrong VFIDE address.'
    );
  }
  console.log(`   ✓ ${tokenAddr}  (matches pre-computed address ✓)`);

  // ── 6. Seer ───────────────────────────────────────────────────────────────
  console.log('6️⃣  Deploying Seer…');
  constructorArgs.Seer = [config.owner, ledgerAddr, vaultHubAddr];
  const SeerFactory = await ethers.getContractFactory('Seer');
  const seer: Contract = await SeerFactory.deploy(...constructorArgs.Seer);
  await seer.waitForDeployment();
  const seerAddr = await seer.getAddress();
  console.log(`   ✓ ${seerAddr}`);

  // ── 7. ProofScoreBurnRouter (conditional) ─────────────────────────────────
  let burnRouter: Contract | null = null;
  let burnRouterAddr: string | null = null;
  if (config.sanctumSink && config.burnSink && config.ecosystemSink) {
    console.log('7️⃣  Deploying ProofScoreBurnRouter…');
    constructorArgs.ProofScoreBurnRouter = [
      seerAddr,
      config.sanctumSink,
      config.burnSink,
      config.ecosystemSink,
    ];
    const Router = await ethers.getContractFactory('ProofScoreBurnRouter');
    burnRouter = await Router.deploy(...constructorArgs.ProofScoreBurnRouter);
    await burnRouter!.waitForDeployment();
    burnRouterAddr = await burnRouter!.getAddress();
    console.log(`   ✓ ${burnRouterAddr}`);
  } else {
    console.log('7️⃣  Skipping ProofScoreBurnRouter (SANCTUM_SINK / BURN_SINK / ECOSYSTEM_SINK not set)');
    console.log('   ℹ  Set all three sink env vars and re-run, or deploy separately later.');
  }

  // ── 8. OwnerControlPanel ──────────────────────────────────────────────────
  console.log('8️⃣  Deploying OwnerControlPanel…');
  constructorArgs.OwnerControlPanel = [
    config.owner,
    tokenAddr,
    vaultHubAddr,
    burnRouterAddr || ethers.ZeroAddress,
    seerAddr,
  ];
  const OCP = await ethers.getContractFactory('OwnerControlPanel');
  const ocp: Contract = await OCP.deploy(...constructorArgs.OwnerControlPanel);
  await ocp.waitForDeployment();
  const ocpAddr = await ocp.getAddress();
  console.log(`   ✓ ${ocpAddr}`);

  // ── 9. SystemHandover ─────────────────────────────────────────────────────
  console.log('9️⃣  Deploying SystemHandover…');
  // For a solo deploy the dao/timelock/council slots are populated with the
  // owner address as placeholders.  Replace with real governance contracts
  // before calling arm().
  constructorArgs.SystemHandover = [
    config.owner,  // devMultisig
    config.owner,  // dao       (placeholder — replace before arm())
    config.owner,  // timelock  (placeholder — replace before arm())
    seerAddr,
    config.owner,  // councilElection (placeholder)
    ledgerAddr,
  ];
  const Handover = await ethers.getContractFactory('SystemHandover');
  const handover: Contract = await Handover.deploy(...constructorArgs.SystemHandover);
  await handover.waitForDeployment();
  const handoverAddr = await handover.getAddress();
  console.log(`   ✓ ${handoverAddr}`);

  const addresses: DeployedAddresses = {
    proofLedger:              ledgerAddr,
    securityHub:              securityHubAddr,
    vaultHub:                 vaultHubAddr,
    devReserveVestingVault:   devVaultAddr,
    vfideToken:               tokenAddr,
    seer:                     seerAddr,
    proofScoreBurnRouter:     burnRouterAddr,
    ownerControlPanel:        ocpAddr,
    systemHandover:           handoverAddr,
  };

  return {
    contracts: {
      ledger, securityHub, vaultHub, devVault, token, seer,
      burnRouter, ocp, handover,
    },
    addresses,
    constructorArgs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-deploy wiring
// ─────────────────────────────────────────────────────────────────────────────

async function wireContracts(
  contracts: Record<string, Contract | null>,
  addresses: DeployedAddresses
): Promise<void> {
  console.log('\n⚙️  Post-deploy wiring…\n');

  const { ledger, token, seer, burnRouter } = contracts;

  // Authorise Seer and VaultHub as ProofLedger loggers (immediate, no timelock)
  console.log('   Authorising Seer as ProofLedger logger…');
  const tx1 = await (ledger as any).setLogger(addresses.seer, true);
  await tx1.wait();
  console.log('   ✓ Seer authorised');

  console.log('   Authorising VaultHub as ProofLedger logger…');
  const tx2 = await (ledger as any).setLogger(addresses.vaultHub, true);
  await tx2.wait();
  console.log('   ✓ VaultHub authorised');

  // Schedule SecurityHub on VFIDEToken (48-hour timelock; apply via apply-wiring.ts)
  console.log('   Scheduling token.setSecurityHub() (48h timelock)…');
  const tx3 = await (token as any).setSecurityHub(addresses.securityHub);
  await tx3.wait();
  console.log('   ✓ Scheduled — run apply-wiring.ts after 48 hours to apply');

  // Schedule BurnRouter on VFIDEToken if deployed (48-hour timelock)
  if (burnRouter && addresses.proofScoreBurnRouter) {
    console.log('   Scheduling token.setBurnRouter() (48h timelock)…');
    const tx4 = await (token as any).setBurnRouter(addresses.proofScoreBurnRouter);
    await tx4.wait();
    console.log('   ✓ Scheduled — run apply-wiring.ts after 48 hours to apply');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

function printSummary(addresses: DeployedAddresses): void {
  console.log('\n📊 Deployment Summary:');
  console.log('   ──────────────────────────────────────────────────────────────');
  console.log(`   ProofLedger:              ${addresses.proofLedger}`);
  console.log(`   SecurityHub:              ${addresses.securityHub}`);
  console.log(`   VaultHub:                 ${addresses.vaultHub}`);
  console.log(`   DevReserveVestingVault:   ${addresses.devReserveVestingVault}`);
  console.log(`   VFIDEToken:               ${addresses.vfideToken}`);
  console.log(`   Seer:                     ${addresses.seer}`);
  console.log(`   ProofScoreBurnRouter:     ${addresses.proofScoreBurnRouter ?? '(not deployed — sinks not configured)'}`);
  console.log(`   OwnerControlPanel:        ${addresses.ownerControlPanel}`);
  console.log(`   SystemHandover:           ${addresses.systemHandover}`);
  console.log('   ──────────────────────────────────────────────────────────────');

  console.log('\n📝 Next Steps:');
  console.log('   1. After 48 hours, run:  hardhat run contracts/scripts/apply-wiring.ts --network <network>');
  console.log('   2. When ready to start vesting, run:  hardhat run contracts/scripts/start-vesting.ts --network <network>');
  console.log('   3. When governance is live and dao/timelock/council slots are real contracts,');
  console.log('      run:  hardhat run contracts/scripts/arm-handover.ts --network <network>');
  if (!addresses.proofScoreBurnRouter) {
    console.log('   4. Deploy ProofScoreBurnRouter separately once SANCTUM_SINK, BURN_SINK,');
    console.log('      and ECOSYSTEM_SINK are ready, then call token.setBurnRouter() via timelock.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

async function verifyContracts(
  addresses: DeployedAddresses,
  constructorArgs: Record<string, unknown[]>
): Promise<void> {
  console.log('\n🔍 Verifying contracts on block explorer…\n');

  const tryVerify = async (address: string, args: unknown[]) => {
    try {
      await (hre as any).run('verify:verify', { address, constructorArguments: args });
      console.log(`   ✓ Verified: ${address}`);
    } catch (err: any) {
      if (err.message.includes('already verified')) {
        console.log(`   ℹ Already verified: ${address}`);
      } else {
        console.error(`   ✗ Failed: ${address}:`, err.message);
      }
    }
  };

  await tryVerify(addresses.proofLedger,            constructorArgs.ProofLedger);
  await tryVerify(addresses.securityHub,            constructorArgs.SecurityHub);
  await tryVerify(addresses.vaultHub,               constructorArgs.VaultHub);
  await tryVerify(addresses.devReserveVestingVault, constructorArgs.DevReserveVestingVault);
  await tryVerify(addresses.vfideToken,             constructorArgs.VFIDEToken);
  await tryVerify(addresses.seer,                   constructorArgs.Seer);
  if (addresses.proofScoreBurnRouter) {
    await tryVerify(addresses.proofScoreBurnRouter, constructorArgs.ProofScoreBurnRouter);
  }
  await tryVerify(addresses.ownerControlPanel, constructorArgs.OwnerControlPanel);
  await tryVerify(addresses.systemHandover,    constructorArgs.SystemHandover);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting VFIDE Solo Deployment…\n');

  const config = getConfig();

  console.log('📋 Configuration:');
  console.log(`   Network:     ${config.network}`);
  console.log(`   Owner:       ${config.owner}`);
  console.log(`   Treasury:    ${config.treasury}`);
  console.log(`   Beneficiary: ${config.beneficiary}`);
  console.log(`   BurnRouter:  ${config.sanctumSink ? 'will be deployed' : 'skipped (sinks not set)'}\n`);

  const { contracts, addresses, constructorArgs } = await deployContracts(config);

  console.log('\n✅ All contracts deployed successfully!');

  await wireContracts(contracts, addresses);

  console.log('\n✅ Post-deploy wiring complete!');

  printSummary(addresses);

  // Save deployment manifest
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const network = await ethers.provider.getNetwork();
  const filename = `deployments-solo-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify({ network: config.network, addresses }, null, 2));
  console.log(`\n💾 Addresses saved to: ${filename}`);

  if (config.verify) {
    await verifyContracts(addresses, constructorArgs);
  } else {
    console.log('\nℹ️  Skipping block-explorer verification. Set VERIFY_CONTRACTS=true to enable.');
  }

  console.log('\n🎉 Solo deployment complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

export { deployContracts, wireContracts, getConfig };
