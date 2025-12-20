// zkSync Era deploy script for VFIDEToken
// Usage:
//  npx hardhat deploy-zksync --script deploy-token.js --network zkSyncSepoliaTestnet

const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
const { Wallet } = require('zksync-ethers');
const { updateRegistry } = require('../scripts/registry');

module.exports = async function (hre) {
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set');
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  // Constructor args
  let devVaultAddr = process.env.DEV_VESTING_VAULT || '';
  const vaultHub = process.env.VAULT_HUB || hre.ethers.ZeroAddress;
  const ledger = process.env.LEDGER || hre.ethers.ZeroAddress;
  const treasurySink = process.env.TREASURY_SINK || hre.ethers.ZeroAddress;

  // If no dev vesting vault provided, deploy a minimal mock to satisfy extcodesize check
  if (!devVaultAddr || devVaultAddr === '0x' || devVaultAddr === '0x0000000000000000000000000000000000000000') {
    const vaultArtifact = await deployer.loadArtifact('VestingVault');
    const mockVault = await deployer.deploy(vaultArtifact, []);
    await mockVault.waitForDeployment();
    devVaultAddr = await mockVault.getAddress();
    console.log('[Info] Deployed test VestingVault mock at', devVaultAddr);
  }

  const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
  console.log('Deploying VFIDEToken with args:', { devVaultAddr, vaultHub, ledger, treasurySink });
  const token = await deployer.deploy(tokenArtifact, [devVaultAddr, vaultHub, ledger, treasurySink]);
  await token.waitForDeployment();
  const addr = await token.getAddress();
  console.log('VFIDEToken deployed at', addr);
  // Record deployment
  try {
    updateRegistry(hre.network.name, 'VFIDEToken', { address: addr, args: [devVaultAddr, vaultHub, ledger, treasurySink] });
    console.log(`Recorded VFIDEToken in deployments/${hre.network.name}.json`);
  } catch (e) { console.warn('Could not update registry:', e.message); }
};

module.exports.tags = ['VFIDEToken'];
