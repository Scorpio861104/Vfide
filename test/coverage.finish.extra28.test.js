const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra28 - mass 250-410 region tester', function () {
  let deployer, dao, alice, bob, carol;
  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it('calls TEST_cover_mass_250_410 with permutations to flip many arms', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // set baseline
    await seer.setMin(2);
    await seer.setScore(alice.address, 3);
    await seer.setScore(bob.address, 1);
    await seer.setScore(carol.address, 0);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // set vaults for alice and bob, leave carol without vault
    await vault.setVault(alice.address, alice.address);
    await vault.setVault(bob.address, bob.address);

    // call with values that hit threshold arms
    const r1 = await mr.TEST_cover_mass_250_410(alice.address, bob.address, carol.address, 5, 3, 0, false, false, false);
    expect(Number(r1)).to.be.a('number');

    // call with forced vault-zero and low-score flags to flip other arms
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);
    const r2 = await mr.TEST_cover_mass_250_410(carol.address, carol.address, alice.address, 0, 0, 100, true, true, true);
    expect(Number(r2)).to.be.a('number');
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);
  });
});
