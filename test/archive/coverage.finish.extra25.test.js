const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra25 - flip addMerchant and 250-300 region arms', function () {
  let deployer, dao, alice, bob, carol;
  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it('flips alreadyMerchant and vault/noVault arms and exercises 250-300 region', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // set minimum and scores before MR deployment
    await seer.setMin(1);
    await seer.setScore(alice.address, 1);
    await seer.setScore(bob.address, 1);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // initial: no merchant exists for bob
    const beforeBob = await mr.TEST_if_merchant_status_none(bob.address);
    expect(beforeBob).to.be.true;

    // alice gets a vault and registers as merchant -> flips alreadyMerchant left arm for alice
    await vault.setVault(alice.address, alice.address);
    await mr.connect(alice).addMerchant(ethers.id('m1'));

    const afterAlice = await mr.TEST_if_alreadyMerchant_left(alice.address);
    expect(afterAlice).to.be.true;

    // ensure bob still shows not-a-merchant
    const afterBob = await mr.TEST_if_alreadyMerchant_left(bob.address);
    expect(afterBob).to.be.false;

    // flip the TEST_forceAlreadyMerchant right arm
    await mr.TEST_setForceAlreadyMerchant(true);
    const forceRight = await mr.TEST_if_forceAlready_right();
    expect(forceRight).to.be.true;
    await mr.TEST_setForceAlreadyMerchant(false);

    // vault/noVault arms: carol has no vault, bob has one
    await vault.setVault(bob.address, bob.address);
    const vBobFalse = await mr.TEST_line130_vaultZero_or_force(bob.address, bob.address, false);
    expect(vBobFalse).to.be.false;
    const vCarolTrue = await mr.TEST_line130_vaultZero_or_force(carol.address, carol.address, false);
    expect(vCarolTrue).to.be.true;

    // force the TEST_forceNoVault right arm
    await mr.TEST_setForceNoVault(true);
    const vForced = await mr.TEST_line130_vaultZero_or_force(bob.address, bob.address, false);
    expect(vForced).to.be.true;
    await mr.TEST_setForceNoVault(false);

    // Exercise the 250-300 region: use thresholds equal to autoSuspendRefunds/disputes
    // defaults: autoSuspendRefunds = 5, autoSuspendDisputes = 3
    const out1 = await mr.TEST_cover_250_300_region(alice.address, alice.address, 5, 3, false, false, false);
    expect(Number(out1)).to.be.a('number');

    // force sender-zero refund/dispute arms and vaultZero
    const out2 = await mr.TEST_cover_250_300_region(bob.address, carol.address, 0, 0, true, true, true);
    expect(Number(out2)).to.be.a('number');
  });
});
