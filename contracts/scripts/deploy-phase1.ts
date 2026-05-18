/**
 * @fileoverview Hardhat deployment script for Phase 1 security enhancements
 * @description Deploy and configure all Phase 1 security contracts
 */

import hre from 'hardhat';
import { Contract } from 'ethers';

const ethers = (hre as any).ethers;
// WithdrawalQueueStub deployment removed per B-11 (dead code cleanup)

interface DeploymentConfig {
  network: string;
  admin: string;
  council: [string, string, string, string, string];
  priceOracle: string;
  devReserveVestingVault: string;
  tokenDistribContract?: string; // kept for backward compat; no longer passed to VFIDEToken
  treasury: string;
  vaultHub: string;
  ledger: string;
  treasurySink: string;
  /** Optional: pre-deployed VFIDE token address for AdminMultiSig stake-gated veto (H-05 fix) */
  vfideToken?: string;
  pausers: string[];
  suspiciousActivityReporters: string[];
  configManagers: string[];
}

interface DeployedContracts {
  accessControl: Contract;
  multiSig: Contract;
  emergencyControl: Contract;
  circuitBreaker: Contract;
  token: Contract;
}

type RoleGrantingContract = Contract & {
  grantRoleWithReason: (role: string, account: string, reason: string) => Promise<{ wait: () => Promise<void> }>;
  EMERGENCY_PAUSER_ROLE: () => Promise<string>;
  SUSPICIOUS_ACTIVITY_REPORTER_ROLE: () => Promise<string>;
  CONFIG_MANAGER_ROLE: () => Promise<string>;
};

const asRoleGrantingContract = (contract: Contract) => contract as RoleGrantingContract;

/**
 * Main deployment function
 */
async function main() {
  console.log('🚀 Starting Phase 1 Security Enhancement Deployment...\n');

  // Get deployment configuration
  const config = getDeploymentConfig();
  
  console.log('📋 Deployment Configuration:');
  console.log(`   Network: ${config.network}`);
  console.log(`   Admin: ${config.admin}`);
  console.log(`   Council Size: ${config.council.length}`);
  console.log(`   Dev Reserve Vault: ${config.devReserveVestingVault}`);
  console.log(`   Treasury: ${config.treasury}\n`);

  // Deploy contracts
  const contracts = await deployContracts(config);
  
  console.log('\n✅ All contracts deployed successfully!\n');
  
  // Configure contracts
  await configureContracts(contracts, config);
  
  console.log('\n✅ All contracts configured successfully!\n');
  
  // Print deployment summary
  printDeploymentSummary(contracts);
  
  console.log('\n🎉 Phase 1 deployment complete!\n');

  // Optionally verify contracts
  if (process.env.VERIFY_CONTRACTS === 'true') {
    await verifyContracts(contracts, config);
  } else {
    console.log('ℹ️  Skipping contract verification. Set VERIFY_CONTRACTS=true to enable.\n');
  }
}

/**
 * Get deployment configuration based on network
 */
function getDeploymentConfig(): DeploymentConfig {
  const network = process.env.HARDHAT_NETWORK || 'localhost';
  
  // Example configuration - UPDATE THESE VALUES for production
  const config: DeploymentConfig = {
    network,
    admin: process.env.ADMIN_ADDRESS || '',
    council: [
      process.env.COUNCIL_MEMBER_1 || '',
      process.env.COUNCIL_MEMBER_2 || '',
      process.env.COUNCIL_MEMBER_3 || '',
      process.env.COUNCIL_MEMBER_4 || '',
      process.env.COUNCIL_MEMBER_5 || '',
    ],
    priceOracle: process.env.PRICE_ORACLE_ADDRESS || '',
    devReserveVestingVault: process.env.DEV_RESERVE_VESTING_VAULT || '',
    tokenDistribContract: process.env.TOKEN_DISTRIB_CONTRACT || undefined,
    treasury: process.env.TREASURY_ADDRESS || '',
    vaultHub: process.env.VAULT_HUB_ADDRESS || '',
    ledger: process.env.PROOF_LEDGER_ADDRESS || '',
    treasurySink: process.env.TREASURY_SINK_ADDRESS || '',
    // Optional — if VFIDEToken is already deployed (upgrade scenario), pass it here
    // so AdminMultiSig can enforce token-stake-gated community veto (H-05 fix).
    vfideToken: process.env.VFIDE_TOKEN || undefined,
    pausers: (process.env.PAUSERS || '').split(',').filter(Boolean),
    suspiciousActivityReporters: (process.env.SUSPICIOUS_ACTIVITY_REPORTERS || process.env.BLACKLIST_MANAGERS || '').split(',').filter(Boolean),
    configManagers: (process.env.CONFIG_MANAGERS || '').split(',').filter(Boolean),
  };

  // Validate configuration
  if (!config.admin) throw new Error('Admin address not configured');
  if (config.council.some(addr => !addr)) throw new Error('All council members must be configured');
  if (!config.priceOracle) throw new Error('Price oracle address not configured');
  if (!config.devReserveVestingVault) throw new Error('DevReserveVestingVault address not configured');
  if (!config.treasury) throw new Error('Treasury address not configured');

  return config;
}

async function assertContractAddress(label: string, address: string): Promise<void> {
  const code = await ethers.provider.getCode(address);
  if (!code || code === '0x') {
    throw new Error(`${label} must be a deployed contract address. Received non-contract: ${address}`);
  }
}

/**
 * Deploy all Phase 1 contracts
 */
async function deployContracts(config: DeploymentConfig): Promise<DeployedContracts> {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error('No deployer signer available');
  }
  console.log(`📝 Deploying from: ${deployer.address}\n`);

  // #306 guard: treasury must be a contract because VFIDEToken constructor enforces VF_NotContract on EOAs.
  await assertContractAddress('TREASURY_ADDRESS', config.treasury);
  await assertContractAddress('DEV_RESERVE_VESTING_VAULT', config.devReserveVestingVault);

  // 1. Deploy VFIDEAccessControl
  console.log('1️⃣  Deploying VFIDEAccessControl...');
  const AccessControl = await ethers.getContractFactory('VFIDEAccessControl');
  const accessControl = await AccessControl.deploy(config.admin);
  await accessControl.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await accessControl.getAddress()}`);

  // 2. Deploy AdminMultiSig
  console.log('2️⃣  Deploying AdminMultiSig...');
  const MultiSig = await ethers.getContractFactory('AdminMultiSig');
  // H-05 Fix: AdminMultiSig now requires _vfideToken as second arg for stake-gated veto.
  // Pass zero address at deploy time — wire the real token address via vfideToken setter after
  // VFIDEToken is deployed (or pass config.vfideToken if it is already deployed).
  const multiSig = await MultiSig.deploy(config.council, config.vfideToken || ethers.ZeroAddress);
  await multiSig.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await multiSig.getAddress()}`);

  // 3. Deploy EmergencyControl
  console.log('3️⃣  Deploying EmergencyControl...');
  const EmergencyControl = await ethers.getContractFactory('EmergencyControl');
  // Bootstrap with non-zero breaker placeholder; wire real breaker after deployment.
  // FINAL-10 FIX: pass foundation address (defaults to admin; update via governance post-deploy)
  const emergencyControl = await EmergencyControl.deploy(config.admin, config.admin, config.ledger, config.admin);
  await emergencyControl.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await emergencyControl.getAddress()}`);

  // 4. Deploy CircuitBreaker
  console.log('4️⃣  Deploying CircuitBreaker...');
  const CircuitBreaker = await ethers.getContractFactory('CircuitBreaker');
  const circuitBreaker = await CircuitBreaker.deploy(
    config.admin,
    config.priceOracle,
    await emergencyControl.getAddress()
  );
  await circuitBreaker.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await circuitBreaker.getAddress()}`);

  // WithdrawalQueueStub deployment removed per B-11 (dead code cleanup)
  // Production system uses CardBoundVault internal queue instead

  // 5. Deploy VFIDEToken (unified)
  console.log('5️⃣  Deploying VFIDEToken...');
  const Token = await ethers.getContractFactory('VFIDEToken');
  const token = await Token.deploy(
    config.devReserveVestingVault,
    config.treasury,
    config.vaultHub,
    config.ledger,
    config.treasurySink
  );
  await token.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await token.getAddress()}`);

  return {
    accessControl,
    multiSig,
    emergencyControl,
    circuitBreaker,
    token,
  };
}

/**
 * Configure deployed contracts with roles and permissions
 */
async function configureContracts(
  contracts: DeployedContracts,
  config: DeploymentConfig
): Promise<void> {
  console.log('⚙️  Configuring contracts...\n');

  const circuitBreaker = asRoleGrantingContract(contracts.circuitBreaker);

  // Grant emergency pauser roles
  if (config.pausers.length > 0) {
    console.log('   Granting EMERGENCY_PAUSER_ROLE...');
    for (const pauser of config.pausers) {
      const tx = await circuitBreaker.grantRoleWithReason(
        await circuitBreaker.EMERGENCY_PAUSER_ROLE(),
        pauser,
        'Phase 1 deployment'
      );
      await tx.wait();
      
      console.log(`   ✓ Granted to: ${pauser}`);
    }
  }

  // Grant suspicious activity reporter roles (legacy BLACKLIST_MANAGERS env still supported)
  if (config.suspiciousActivityReporters.length > 0) {
    console.log('\n   Granting SUSPICIOUS_ACTIVITY_REPORTER_ROLE...');
    for (const reporter of config.suspiciousActivityReporters) {
      const tx = await circuitBreaker.grantRoleWithReason(
        await circuitBreaker.SUSPICIOUS_ACTIVITY_REPORTER_ROLE(),
        reporter,
        'Phase 1 deployment'
      );
      await tx.wait();
      
      console.log(`   ✓ Granted to: ${reporter}`);
    }
  }

  // Grant config manager roles
  if (config.configManagers.length > 0) {
    console.log('\n   Granting CONFIG_MANAGER_ROLE...');
    for (const manager of config.configManagers) {
      const tx = await circuitBreaker.grantRoleWithReason(
        await circuitBreaker.CONFIG_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx.wait();
      
      console.log(`   ✓ Granted to: ${manager}`);
    }
  }
}

/**
 * Print deployment summary
 */
async function printDeploymentSummary(contracts: DeployedContracts): Promise<void> {
  console.log('📊 Deployment Summary:');
  console.log('   ─────────────────────────────────────────────────────');
  console.log(`   VFIDEAccessControl:   ${await contracts.accessControl.getAddress()}`);
  console.log(`   AdminMultiSig:        ${await contracts.multiSig.getAddress()}`);
  console.log(`   EmergencyControl:     ${await contracts.emergencyControl.getAddress()}`);
  console.log(`   CircuitBreaker:       ${await contracts.circuitBreaker.getAddress()}`);
  console.log(`   VFIDEToken:           ${await contracts.token.getAddress()}`);
  console.log('   ─────────────────────────────────────────────────────');
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Verify contracts on block explorer');
  console.log('   2. Test all functionality on testnet');
  console.log('   3. Run security audit');
  console.log('   4. Update frontend with new addresses');
  console.log('   5. Document deployment for team');
  console.log('   6. Announce to community');
}

/**
 * Verify contracts on Etherscan
 */
async function verifyContracts(contracts: DeployedContracts, config: DeploymentConfig): Promise<void> {
  console.log('\n🔍 Verifying contracts on Etherscan...\n');

  const verifyContract = async (address: string, constructorArguments: any[]) => {
    try {
      await (hre as any).run('verify:verify', {
        address,
        constructorArguments,
      });
      console.log(`   ✓ Verified: ${address}`);
    } catch (error: any) {
      if (error.message.includes('already verified')) {
        console.log(`   ℹ Already verified: ${address}`);
      } else {
        console.error(`   ✗ Failed to verify ${address}:`, error.message);
      }
    }
  };

  await verifyContract(await contracts.accessControl.getAddress(), [config.admin]);
  await verifyContract(await contracts.multiSig.getAddress(), [config.council, config.vfideToken || ethers.ZeroAddress]);
  await verifyContract(await contracts.emergencyControl.getAddress(), [
    config.admin,
    config.admin,
    config.ledger,
    config.admin,
  ]);
  await verifyContract(await contracts.circuitBreaker.getAddress(), [
    config.admin,
    config.priceOracle,
    await contracts.emergencyControl.getAddress(),
  ]);
  await verifyContract(await contracts.token.getAddress(), [
    config.devReserveVestingVault,
    config.treasury,
    config.vaultHub,
    config.ledger,
    config.treasurySink,
  ]);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

export { deployContracts, configureContracts, getDeploymentConfig };
