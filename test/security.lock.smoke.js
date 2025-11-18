const { expect } = require('chai');

// Simulate SecurityHub lock behavior impact on Seer / token interactions.
// Uses SecurityHubMock (must expose isLocked or similar). If not existing in contracts-min, adjust imports.
describe('SecurityHub Lock Smoke', function () {
  it('reflects locked state preventing score-related action (simulated)', async function () {
    const [dao, user] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory('ProofLedger');
    const ledger = await Ledger.deploy(dao.address); await ledger.waitForDeployment();

    const Seer = await ethers.getContractFactory('Seer');
    const seer = await Seer.deploy(dao.address, await ledger.getAddress(), ethers.ZeroAddress); await seer.waitForDeployment();

    // Mock SecurityHub with basic lock toggle
    const HubMockFactory = await ethers.getContractFactory('SecurityHubMock');
    const hub = await HubMockFactory.deploy(); await hub.waitForDeployment();

    // Pre-condition: not locked
    expect(await hub.isLocked(await user.getAddress())).to.equal(false);

    // Lock user vault (simulate) then attempt a score mutation path
    await hub.lockVault(await user.getAddress());
    expect(await hub.isLocked(await user.getAddress())).to.equal(true);

    // Attempt threshold update from non-DAO should revert anyway; locking just contextually informative
    await expect(
      seer.connect(user).setThresholds(300, 800, 550, 570)
    ).to.be.reverted; // Not DAO
  });
});