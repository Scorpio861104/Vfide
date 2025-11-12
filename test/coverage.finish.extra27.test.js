const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra27 - msg.sender vault helper (line 130)', function () {
  let deployer, dao, alice, bob, carol;
  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it('uses msg.sender vault helper to flip vaultZero arms', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    await seer.setMin(1);
    await seer.setScore(alice.address, 1);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // bob has a vault, carol does not
    await vault.setVault(bob.address, bob.address);

    // calling as bob should return false (has vault)
    const bobHasVault = await mr.connect(bob).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(bobHasVault).to.be.false;

    // calling as carol (no vault) should return true
    const carolNoVault = await mr.connect(carol).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(carolNoVault).to.be.true;

    // force the TEST_forceNoVault right arm and call as bob
    await mr.TEST_setForceNoVault(true);
    const bobForced = await mr.connect(bob).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(bobForced).to.be.true;
    await mr.TEST_setForceNoVault(false);

    // calling with force param true should flip arm for any caller
    const bobForceParam = await mr.connect(bob).TEST_line130_msgsender_vaultZero_or_force(true);
    expect(bobForceParam).to.be.true;
  });
});
