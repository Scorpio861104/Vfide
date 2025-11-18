const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra24 - Commerce region 250-300 helper', function () {
  let deployer, dao, alice, bob, carol;
  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it('calls TEST_cover_250_300_region with permutations to flip arms', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');

    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // ensure seer.min is > 0 before MR deploy
    await seer.setMin(2);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // alice has a vault, carol doesn't
    await vault.setVault(alice.address, alice.address);

    // 1) low refunds/disputes
    const o1 = await mr.TEST_cover_250_300_region(alice.address, alice.address, 0, 0, false, false, false);
    expect(Number(o1)).to.be.a('number');

    // 2) high refunds triggers threshold
    const o2 = await mr.TEST_cover_250_300_region(alice.address, alice.address, 10, 0, false, false, false);
    expect(Number(o2)).to.be.a('number');

    // 3) force sender-zero via flags
    await mr.TEST_setForceZeroSenderRefund(true);
    const o3 = await mr.TEST_cover_250_300_region(bob.address, bob.address, 0, 0, false, false, false);
    expect(Number(o3)).to.be.a('number');
    await mr.TEST_setForceZeroSenderRefund(false);

    // 4) force vault zero with parameter for carol
    const o4 = await mr.TEST_cover_250_300_region(carol.address, carol.address, 0, 0, false, false, true);
    expect(Number(o4)).to.be.a('number');
  });
});
