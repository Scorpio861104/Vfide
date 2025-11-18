// zkSync Era deploy script for ProofLedger using Deployer
// Usage:
//  npx hardhat deploy-zksync --script deploy-ledger.js --network zkSyncSepoliaTestnet

const { Deployer } = require('@matterlabs/hardhat-zksync-deploy');
const { Wallet } = require('zksync-ethers');
const { updateRegistry } = require('../scripts/registry');

module.exports = async function (hre) {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  const artifact = await deployer.loadArtifact('ProofLedger');
  const daoAddress = process.env.DAO_ADDRESS || (await wallet.getAddress());

  console.log('Deploying ProofLedger with DAO:', daoAddress);
  const ledger = await deployer.deploy(artifact, [daoAddress]);
  await ledger.waitForDeployment();
  const addr = await ledger.getAddress();
  console.log('ProofLedger deployed at', addr);
  // Record deployment
  try {
    updateRegistry(hre.network.name, 'ProofLedger', { address: addr, args: [daoAddress] });
    console.log(`Recorded ProofLedger in deployments/${hre.network.name}.json`);
  } catch (e) { console.warn('Could not update registry:', e.message); }
};

module.exports.tags = ['ProofLedger'];
