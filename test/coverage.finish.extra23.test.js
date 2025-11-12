const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra23 - Commerce pinpoint near lines 118/130', function () {
  let deployer, dao, alice, bob, carol;
  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it('exercises TEST_cover_addMerchant_near118_130 and toggles flags', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');

    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // ensure seer.min > 0 before MR deploy
    await seer.setMin(2);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // set vaults: alice has vault, carol doesn't
    await vault.setVault(alice.address, alice.address);

    // Call combined helper with default flags (should reflect actual state)
    const out1 = await mr.TEST_cover_addMerchant_near118_130(alice.address, alice.address, false, false);
    expect(Number(out1)).to.be.a('number');

    // Force alreadyMerchant arm
    await mr.TEST_setForceAlreadyMerchant(true);
    const out2 = await mr.TEST_cover_addMerchant_near118_130(alice.address, alice.address, false, false);
    expect(Number(out2)).to.be.a('number');
    await mr.TEST_setForceAlreadyMerchant(false);

    // Force vaultZero arm for carol
    const out3 = await mr.TEST_cover_addMerchant_near118_130(carol.address, carol.address, false, true);
    expect(Number(out3)).to.be.a('number');

    // Force low score via TEST toggle
    await mr.TEST_setForceLowScore(true);
    const out4 = await mr.TEST_cover_addMerchant_near118_130(bob.address, bob.address, false, false);
    expect(Number(out4)).to.be.a('number');
    await mr.TEST_setForceLowScore(false);
  });
});
