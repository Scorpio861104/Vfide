// Deploy ProofLedger and VFIDEToken together on zkSync
// Usage:
//  npx hardhat deploy-zksync --script deploy-all.js --network zkSyncSepoliaTestnet

const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
const { Wallet } = require('zksync-ethers');
const { updateRegistry } = require('../scripts/registry');

module.exports = async function (hre) {
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  // ----- Deploy ProofLedger -----
  const daoAddress = process.env.DAO_ADDRESS || (await wallet.getAddress());
  const ledgerArtifact = await deployer.loadArtifact('ProofLedger');
  console.log('Deploying ProofLedger with DAO:', daoAddress);
  const ledger = await deployer.deploy(ledgerArtifact, [daoAddress]);
  await ledger.waitForDeployment();
  const ledgerAddr = await ledger.getAddress();
  console.log('ProofLedger deployed at', ledgerAddr);
  updateRegistry(hre.network.name, 'ProofLedger', { address: ledgerAddr, args: [daoAddress] });

  // ----- Deploy VFIDEToken -----
  const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
  let devVaultAddr = process.env.DEV_VESTING_VAULT || '';
  const vaultHub = process.env.VAULT_HUB || hre.ethers.ZeroAddress;
  const ledgerForToken = process.env.LEDGER || ledgerAddr; // default to freshly deployed
  const treasurySink = process.env.TREASURY_SINK || hre.ethers.ZeroAddress;

  if (!devVaultAddr || devVaultAddr === '0x' || devVaultAddr === '0x0000000000000000000000000000000000000000') {
    const vaultArtifact = await deployer.loadArtifact('VestingVault');
    const mockVault = await deployer.deploy(vaultArtifact, []);
    await mockVault.waitForDeployment();
    devVaultAddr = await mockVault.getAddress();
    console.log('[Info] Deployed test VestingVault mock at', devVaultAddr);
  }

  console.log('Deploying VFIDEToken with args:', { devVaultAddr, vaultHub, ledger: ledgerForToken, treasurySink });
  const token = await deployer.deploy(tokenArtifact, [devVaultAddr, vaultHub, ledgerForToken, treasurySink]);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log('VFIDEToken deployed at', tokenAddr);
  updateRegistry(hre.network.name, 'VFIDEToken', { address: tokenAddr, args: [devVaultAddr, vaultHub, ledgerForToken, treasurySink] });

  // ----- Optional: verify when enabled -----
  if (process.env.ZKSYNC_VERIFY === '1') {
    console.log('[Verify] Submitting verification tasks...');
    try {
      await hre.run('verify:verify', { address: ledgerAddr, constructorArguments: [daoAddress] });
      await hre.run('verify:verify', { address: tokenAddr, constructorArguments: [devVaultAddr, vaultHub, ledgerForToken, treasurySink] });
      console.log('[Verify] Submitted.');
    } catch (e) {
      console.warn('[Verify] Failed:', e.message);
    }
  }
};

module.exports.tags = ['All'];
