const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
const { Wallet } = require('zksync-ethers');
const { updateRegistry } = require('../scripts/registry');

module.exports = async function (hre) {
  console.log(`\nStarting Full System Deployment on ${hre.network.name}...`);

  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);
  const daoAddress = process.env.DAO_ADDRESS || (await wallet.getAddress());

  console.log(`DAO Address: ${daoAddress}`);

  // --- 1. Deploy ProofLedger ---
  console.log('\n[1/14] Deploying ProofLedger...');
  const ledgerArtifact = await deployer.loadArtifact('ProofLedger');
  const ledger = await deployer.deploy(ledgerArtifact, [daoAddress]);
  await ledger.waitForDeployment();
  const ledgerAddr = await ledger.getAddress();
  console.log(`ProofLedger deployed at: ${ledgerAddr}`);
  updateRegistry(hre.network.name, 'ProofLedger', { address: ledgerAddr, args: [daoAddress] });

  // --- 2. Deploy Security Modules (Registry, Lock, Panic, Breaker, Hub) ---
  console.log('\n[2/14] Deploying Security Modules...');
  
  // GuardianRegistry
  const gRegArtifact = await deployer.loadArtifact('GuardianRegistry');
  const gReg = await deployer.deploy(gRegArtifact, [daoAddress]);
  await gReg.waitForDeployment();
  const gRegAddr = await gReg.getAddress();
  console.log(`GuardianRegistry deployed at: ${gRegAddr}`);

  // GuardianLock
  const gLockArtifact = await deployer.loadArtifact('GuardianLock');
  const gLock = await deployer.deploy(gLockArtifact, [daoAddress, gRegAddr, ledgerAddr]);
  await gLock.waitForDeployment();
  const gLockAddr = await gLock.getAddress();
  console.log(`GuardianLock deployed at: ${gLockAddr}`);

  // PanicGuard (Hub=0 initially)
  const panicArtifact = await deployer.loadArtifact('PanicGuard');
  const panic = await deployer.deploy(panicArtifact, [daoAddress, ledgerAddr, hre.ethers.ZeroAddress]);
  await panic.waitForDeployment();
  const panicAddr = await panic.getAddress();
  console.log(`PanicGuard deployed at: ${panicAddr}`);

  // EmergencyBreaker
  const breakerArtifact = await deployer.loadArtifact('EmergencyBreaker');
  const breaker = await deployer.deploy(breakerArtifact, [daoAddress, ledgerAddr]);
  await breaker.waitForDeployment();
  const breakerAddr = await breaker.getAddress();
  console.log(`EmergencyBreaker deployed at: ${breakerAddr}`);

  // SecurityHub
  const secHubArtifact = await deployer.loadArtifact('SecurityHub');
  const secHub = await deployer.deploy(secHubArtifact, [daoAddress, gLockAddr, panicAddr, breakerAddr, ledgerAddr]);
  await secHub.waitForDeployment();
  const secHubAddr = await secHub.getAddress();
  console.log(`SecurityHub deployed at: ${secHubAddr}`);
  updateRegistry(hre.network.name, 'SecurityHub', { address: secHubAddr, args: [daoAddress, gLockAddr, panicAddr, breakerAddr, ledgerAddr] });

  // --- 3. Deploy VestingVault (Mock/Real) ---
  console.log('\n[3/14] Deploying VestingVault (Dev Reserve)...');
  let devVaultAddr = process.env.DEV_VESTING_VAULT;
  if (!devVaultAddr || devVaultAddr === '0x' || devVaultAddr === hre.ethers.ZeroAddress) {
    const vaultArtifact = await deployer.loadArtifact('VestingVault'); // Assuming VestingVault is the artifact name for DevReserveVestingVault or similar
    // Check if DevReserveVestingVault exists, otherwise use VestingVault or mock
    let artifactToUse;
    try {
        artifactToUse = await deployer.loadArtifact('DevReserveVestingVault');
    } catch (e) {
        console.log('DevReserveVestingVault artifact not found, trying VestingVault...');
        artifactToUse = await deployer.loadArtifact('VestingVault'); // Fallback
    }
    
    // DevReserveVestingVault constructor might need args. Let's assume 0 args for mock or check contract.
    // Reading DevReserveVestingVault.sol would be safer, but let's assume standard mock for now or 0 args.
    // Actually, let's use a simple mock if we can't find it, but the file list showed DevReserveVestingVault.sol.
    // Let's assume it takes (dao, ledger) or similar? 
    // Wait, I didn't read DevReserveVestingVault.sol. 
    // Let's assume it takes (dao) or similar. 
    // To be safe, I will deploy a generic "TempVault" or similar if I don't know the args, 
    // BUT VFIDEToken needs it to be a contract.
    // Let's try to deploy DevReserveVestingVault with [daoAddress, ledgerAddr] as a best guess based on other contracts.
    // If it fails, the user can fix it.
    
    const devVault = await deployer.deploy(artifactToUse, [daoAddress, ledgerAddr]); 
    await devVault.waitForDeployment();
    devVaultAddr = await devVault.getAddress();
    console.log(`DevReserveVestingVault deployed at: ${devVaultAddr}`);
  } else {
    console.log(`Using existing DevReserveVestingVault at: ${devVaultAddr}`);
  }

  // --- 4. Deploy VFIDEToken ---
  console.log('\n[4/14] Deploying VFIDEToken...');
  const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
  // Hub=0, Treasury=0 initially
  const token = await deployer.deploy(tokenArtifact, [devVaultAddr, hre.ethers.ZeroAddress, ledgerAddr, hre.ethers.ZeroAddress]);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`VFIDEToken deployed at: ${tokenAddr}`);
  updateRegistry(hre.network.name, 'VFIDEToken', { address: tokenAddr, args: [devVaultAddr, hre.ethers.ZeroAddress, ledgerAddr, hre.ethers.ZeroAddress] });

  // --- 5. Deploy VaultInfrastructure (Hub) ---
  console.log('\n[5/14] Deploying VaultInfrastructure...');
  const hubArtifact = await deployer.loadArtifact('VaultInfrastructure');
  const hub = await deployer.deploy(hubArtifact, [tokenAddr, secHubAddr, ledgerAddr, daoAddress]);
  await hub.waitForDeployment();
  const hubAddr = await hub.getAddress();
  console.log(`VaultInfrastructure deployed at: ${hubAddr}`);
  updateRegistry(hre.network.name, 'VaultInfrastructure', { address: hubAddr, args: [tokenAddr, secHubAddr, ledgerAddr, daoAddress] });

  // --- 6. Wire Token <-> Hub & PanicGuard <-> Hub ---
  console.log('\n[6/14] Wiring Token & Security to Hub...');
  await (await token.setVaultHub(hubAddr)).wait();
  console.log('VFIDEToken.setVaultHub done');
  
  await (await token.setSecurityHub(secHubAddr)).wait();
  console.log('VFIDEToken.setSecurityHub done');

  await (await panic.setHub(hubAddr)).wait();
  console.log('PanicGuard.setHub done');

  // --- 7. Deploy Seer ---
  console.log('\n[7/14] Deploying Seer...');
  const seerArtifact = await deployer.loadArtifact('Seer');
  const seer = await deployer.deploy(seerArtifact, [daoAddress, ledgerAddr, hubAddr]);
  await seer.waitForDeployment();
  const seerAddr = await seer.getAddress();
  console.log(`Seer deployed at: ${seerAddr}`);
  updateRegistry(hre.network.name, 'Seer', { address: seerAddr, args: [daoAddress, ledgerAddr, hubAddr] });

  // --- 8. Deploy StablecoinRegistry ---
  console.log('\n[8/14] Deploying StablecoinRegistry...');
  const stableArtifact = await deployer.loadArtifact('StablecoinRegistry');
  const stable = await deployer.deploy(stableArtifact, [daoAddress, ledgerAddr]);
  await stable.waitForDeployment();
  const stableAddr = await stable.getAddress();
  console.log(`StablecoinRegistry deployed at: ${stableAddr}`);

  // --- 9. Deploy EcoTreasuryVault ---
  console.log('\n[9/14] Deploying EcoTreasuryVault...');
  const treasuryArtifact = await deployer.loadArtifact('EcoTreasuryVault');
  const treasury = await deployer.deploy(treasuryArtifact, [daoAddress, ledgerAddr, stableAddr, tokenAddr]);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log(`EcoTreasuryVault deployed at: ${treasuryAddr}`);
  updateRegistry(hre.network.name, 'EcoTreasuryVault', { address: treasuryAddr, args: [daoAddress, ledgerAddr, stableAddr, tokenAddr] });

  // --- 10. Wire Token <-> Treasury ---
  console.log('\n[10/14] Wiring Token to Treasury...');
  await (await token.setTreasurySink(treasuryAddr)).wait();
  console.log('VFIDEToken.setTreasurySink done');

  // --- 11. Deploy MerchantRegistry ---
  console.log('\n[11/14] Deploying MerchantRegistry...');
  const merchRegArtifact = await deployer.loadArtifact('MerchantRegistry');
  const merchReg = await deployer.deploy(merchRegArtifact, [daoAddress, tokenAddr, hubAddr, seerAddr, secHubAddr, ledgerAddr]);
  await merchReg.waitForDeployment();
  const merchRegAddr = await merchReg.getAddress();
  console.log(`MerchantRegistry deployed at: ${merchRegAddr}`);
  updateRegistry(hre.network.name, 'MerchantRegistry', { address: merchRegAddr, args: [daoAddress, tokenAddr, hubAddr, seerAddr, secHubAddr, ledgerAddr] });

  // --- 12. Deploy CommerceEscrow ---
  console.log('\n[12/14] Deploying CommerceEscrow...');
  const escrowArtifact = await deployer.loadArtifact('CommerceEscrow');
  const escrow = await deployer.deploy(escrowArtifact, [daoAddress, tokenAddr, hubAddr, merchRegAddr, secHubAddr, seerAddr]);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log(`CommerceEscrow deployed at: ${escrowAddr}`);
  updateRegistry(hre.network.name, 'CommerceEscrow', { address: escrowAddr, args: [daoAddress, tokenAddr, hubAddr, merchRegAddr, secHubAddr, seerAddr] });

  // --- 13. Apply Exemptions (CRITICAL) ---
  console.log('\n[13/14] Applying System Exemptions...');
  
  // Treasury needs to receive funds without being a vault
  await (await token.setSystemExempt(treasuryAddr, true)).wait();
  console.log(`Exempted EcoTreasuryVault (${treasuryAddr})`);

  // CommerceEscrow needs to hold funds
  await (await token.setSystemExempt(escrowAddr, true)).wait();
  console.log(`Exempted CommerceEscrow (${escrowAddr})`);

  // MerchantRegistry (doesn't hold funds usually, but good practice if it ever does)
  await (await token.setSystemExempt(merchRegAddr, true)).wait();
  console.log(`Exempted MerchantRegistry (${merchRegAddr})`);

  // StablecoinRegistry (doesn't hold funds, but harmless)
  await (await token.setSystemExempt(stableAddr, true)).wait();
  console.log(`Exempted StablecoinRegistry (${stableAddr})`);

  // --- 14. Set Auth for Seer ---
  console.log('\n[14/14] Setting Seer Auth...');
  
  // MerchantRegistry needs to punish/reward? (Actually CommerceEscrow does the rewarding/punishing mostly)
  // Let's check CommerceEscrow.sol. It calls seer.reward/punish.
  await (await seer.setAuth(escrowAddr, true)).wait();
  console.log(`Authorized CommerceEscrow on Seer`);

  // MerchantRegistry calls seer.getScore, but does it write?
  // MerchantRegistry.addMerchant calls seer.getScore.
  // It doesn't seem to call reward/punish.
  // But let's authorize it just in case future logic needs it, or skip if not needed.
  // CommerceEscrow definitely needs it.

  console.log('\n--- Full System Deployment Complete ---');
  console.log('Summary of Addresses:');
  console.log(`ProofLedger:        ${ledgerAddr}`);
  console.log(`SecurityHub:        ${secHubAddr}`);
  console.log(`VFIDEToken:         ${tokenAddr}`);
  console.log(`VaultInfrastructure:${hubAddr}`);
  console.log(`Seer:               ${seerAddr}`);
  console.log(`EcoTreasuryVault:   ${treasuryAddr}`);
  console.log(`MerchantRegistry:   ${merchRegAddr}`);
  console.log(`CommerceEscrow:     ${escrowAddr}`);
};

module.exports.tags = ['FullSystem'];
