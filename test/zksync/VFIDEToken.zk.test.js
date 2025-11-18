const { expect } = require('chai');
const hre = require('hardhat');

// zkSync deploy utilities
let Deployer;
try {
  ({ Deployer } = require('@matterlabs/hardhat-zksync-deploy'));
} catch (e) {
  // Plugin should be present; ignore if missing in non-zk runs
}

describe('VFIDEToken zkSync deployment', function () {
  const isZk = hre.network.config.zksync === true;

  it('compiles artifacts', async function () {
    const artifact = await hre.artifacts.readArtifact('VFIDEToken');
    expect(artifact.bytecode.length).to.be.greaterThan(10);
  });

  it('deploys on zkSync or skips gracefully', async function () {
    if (!isZk) {
      this.skip();
    }
    if (!process.env.PRIVATE_KEY) {
      this.skip(); // No funded key provided
    }

    const { Wallet } = require('zksync-ethers');
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    const deployer = new Deployer(hre, wallet);
    const tokenArtifact = await deployer.loadArtifact('VFIDEToken');
    const vaultArtifact = await deployer.loadArtifact('VestingVault');
    const vault = await deployer.deploy(vaultArtifact, []);
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    const zero = hre.ethers.ZeroAddress;
    const token = await deployer.deploy(tokenArtifact, [vaultAddr, zero, zero, zero]);
    await token.waitForDeployment();
    const address = await token.getAddress();
    expect(address).to.match(/^0x[0-9a-fA-F]{40}$/);
  });
});
