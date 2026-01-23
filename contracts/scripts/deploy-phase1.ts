/**
 * @fileoverview Hardhat deployment script for Phase 1 security enhancements
 * @description Deploy and configure all Phase 1 security contracts
 */

import { ethers } from 'hardhat';
import { Contract } from 'ethers';

interface DeploymentConfig {
  network: string;
  admin: string;
  council: [string, string, string, string, string];
  priceOracle: string;
  tokenName: string;
  tokenSymbol: string;
  initialSupply: string;
  pausers: string[];
  blacklistManagers: string[];
  configManagers: string[];
}

interface DeployedContracts {
  accessControl: Contract;
  multiSig: Contract;
  emergencyControl: Contract;
  circuitBreaker: Contract;
  withdrawalQueue: Contract;
  tokenV2: Contract;
}

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
  console.log(`   Token: ${config.tokenName} (${config.tokenSymbol})`);
  console.log(`   Initial Supply: ${config.initialSupply}\n`);

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
    tokenName: 'VFIDE Token V2',
    tokenSymbol: 'VFIDE',
    initialSupply: ethers.parseEther('1000000000').toString(), // 1 billion tokens
    pausers: (process.env.PAUSERS || '').split(',').filter(Boolean),
    blacklistManagers: (process.env.BLACKLIST_MANAGERS || '').split(',').filter(Boolean),
    configManagers: (process.env.CONFIG_MANAGERS || '').split(',').filter(Boolean),
  };

  // Validate configuration
  if (!config.admin) throw new Error('Admin address not configured');
  if (config.council.some(addr => !addr)) throw new Error('All council members must be configured');
  if (!config.priceOracle) throw new Error('Price oracle address not configured');

  return config;
}

/**
 * Deploy all Phase 1 contracts
 */
async function deployContracts(config: DeploymentConfig): Promise<DeployedContracts> {
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying from: ${deployer.address}\n`);

  // 1. Deploy VFIDEAccessControl
  console.log('1️⃣  Deploying VFIDEAccessControl...');
  const AccessControl = await ethers.getContractFactory('VFIDEAccessControl');
  const accessControl = await AccessControl.deploy(config.admin);
  await accessControl.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await accessControl.getAddress()}`);

  // 2. Deploy AdminMultiSig
  console.log('2️⃣  Deploying AdminMultiSig...');
  const MultiSig = await ethers.getContractFactory('AdminMultiSig');
  const multiSig = await MultiSig.deploy(config.council);
  await multiSig.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await multiSig.getAddress()}`);

  // 3. Deploy EmergencyControlV2
  console.log('3️⃣  Deploying EmergencyControlV2...');
  const EmergencyControl = await ethers.getContractFactory('EmergencyControlV2');
  const emergencyControl = await EmergencyControl.deploy(config.admin);
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

  // 5. Deploy WithdrawalQueue
  console.log('5️⃣  Deploying WithdrawalQueue...');
  const WithdrawalQueue = await ethers.getContractFactory('WithdrawalQueue');
  const minimumDelayAmount = ethers.parseEther('1000000'); // 1M tokens
  const withdrawalQueue = await WithdrawalQueue.deploy(config.admin, minimumDelayAmount);
  await withdrawalQueue.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await withdrawalQueue.getAddress()}`);

  // 6. Deploy VFIDETokenV2
  console.log('6️⃣  Deploying VFIDETokenV2...');
  const Token = await ethers.getContractFactory('VFIDETokenV2');
  const tokenV2 = await Token.deploy(
    config.tokenName,
    config.tokenSymbol,
    config.initialSupply,
    config.admin,
    await multiSig.getAddress()
  );
  await tokenV2.waitForDeployment();
  console.log(`   ✓ Deployed at: ${await tokenV2.getAddress()}`);

  return {
    accessControl,
    multiSig,
    emergencyControl,
    circuitBreaker,
    withdrawalQueue,
    tokenV2,
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

  // Grant emergency pauser roles
  if (config.pausers.length > 0) {
    console.log('   Granting EMERGENCY_PAUSER_ROLE...');
    for (const pauser of config.pausers) {
      const tx1 = await contracts.emergencyControl.grantRoleWithReason(
        await contracts.emergencyControl.EMERGENCY_PAUSER_ROLE(),
        pauser,
        'Phase 1 deployment'
      );
      await tx1.wait();
      
      const tx2 = await contracts.circuitBreaker.grantRoleWithReason(
        await contracts.circuitBreaker.EMERGENCY_PAUSER_ROLE(),
        pauser,
        'Phase 1 deployment'
      );
      await tx2.wait();
      
      console.log(`   ✓ Granted to: ${pauser}`);
    }
  }

  // Grant blacklist manager roles
  if (config.blacklistManagers.length > 0) {
    console.log('\n   Granting BLACKLIST_MANAGER_ROLE...');
    for (const manager of config.blacklistManagers) {
      const tx1 = await contracts.emergencyControl.grantRoleWithReason(
        await contracts.emergencyControl.BLACKLIST_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx1.wait();
      
      const tx2 = await contracts.circuitBreaker.grantRoleWithReason(
        await contracts.circuitBreaker.BLACKLIST_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx2.wait();
      
      console.log(`   ✓ Granted to: ${manager}`);
    }
  }

  // Grant config manager roles
  if (config.configManagers.length > 0) {
    console.log('\n   Granting CONFIG_MANAGER_ROLE...');
    for (const manager of config.configManagers) {
      const tx1 = await contracts.emergencyControl.grantRoleWithReason(
        await contracts.emergencyControl.CONFIG_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx1.wait();
      
      const tx2 = await contracts.circuitBreaker.grantRoleWithReason(
        await contracts.circuitBreaker.CONFIG_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx2.wait();
      
      const tx3 = await contracts.withdrawalQueue.grantRoleWithReason(
        await contracts.withdrawalQueue.CONFIG_MANAGER_ROLE(),
        manager,
        'Phase 1 deployment'
      );
      await tx3.wait();
      
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
  console.log(`   EmergencyControlV2:   ${await contracts.emergencyControl.getAddress()}`);
  console.log(`   CircuitBreaker:       ${await contracts.circuitBreaker.getAddress()}`);
  console.log(`   WithdrawalQueue:      ${await contracts.withdrawalQueue.getAddress()}`);
  console.log(`   VFIDETokenV2:         ${await contracts.tokenV2.getAddress()}`);
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
      await ethers.run('verify:verify', {
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
  await verifyContract(await contracts.multiSig.getAddress(), [config.council]);
  await verifyContract(await contracts.emergencyControl.getAddress(), [config.admin]);
  await verifyContract(await contracts.circuitBreaker.getAddress(), [
    config.admin,
    config.priceOracle,
    await contracts.emergencyControl.getAddress(),
  ]);
  await verifyContract(await contracts.withdrawalQueue.getAddress(), [
    config.admin,
    ethers.parseEther('1000000'),
  ]);
  await verifyContract(await contracts.tokenV2.getAddress(), [
    config.tokenName,
    config.tokenSymbol,
    config.initialSupply,
    config.admin,
    await contracts.multiSig.getAddress(),
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
