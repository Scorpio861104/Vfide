const { expect } = require('chai');

// zkSync compile path smoke test (runs on standard hardhat network unless zkSync network specified)
describe('zkSync Smoke: ProofLedger + Seer deployability', function () {
  it('deploys core modules under standard config', async function () {
    const [dao] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory('ProofLedger');
    const ledger = await Ledger.deploy(dao.address);
    await ledger.waitForDeployment();
    expect(await ledger.dao()).to.equal(dao.address);

    const Seer = await ethers.getContractFactory('Seer');
    const seer = await Seer.deploy(dao.address, await ledger.getAddress(), ethers.ZeroAddress);
    await seer.waitForDeployment();
    const neutral = await seer.NEUTRAL();
    expect(await seer.getScore(dao.address)).to.equal(neutral);
  });
});

// To run on zkSync testnet (requires funded PRIVATE_KEY & RPC vars):
//   PRIVATE_KEY=0xabc... npx hardhat test --network zkSyncSepoliaTestnet --grep 'zkSync Smoke'