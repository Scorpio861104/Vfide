const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra7 - extra permutations and signer variations", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("MerchantRegistry: toggle flags and call if-helpers with different signers", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // 1) alreadyMerchant arms: left false, then make alice a merchant and test true
    expect(await mr.TEST_if_alreadyMerchant_left(bob.address)).to.equal(false);

    // prepare alice as merchant
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    const mh = '0x' + '11'.repeat(32);
    await mr.connect(alice).addMerchant(mh);
    expect(await mr.TEST_if_alreadyMerchant_left(alice.address)).to.equal(true);

    // 2) forceAlready flag
    await mr.TEST_setForceAlreadyMerchant(true);
    expect(await mr.TEST_if_forceAlready_right()).to.equal(true);
    await mr.TEST_setForceAlreadyMerchant(false);

    // 3) noVault arms: bob currently has no vault
    expect(await mr.TEST_if_noVault_left(bob.address)).to.equal(true);
    // give bob a vault and re-check
    await vault.setVault(bob.address, bob.address);
    expect(await mr.TEST_if_noVault_left(bob.address)).to.equal(false);

    // 4) forceNoVault toggle
    await mr.TEST_setForceNoVault(true);
    expect(await mr.TEST_if_forceNoVault_right()).to.equal(true);
    await mr.TEST_setForceNoVault(false);

    // 5) lowScore: ensure low vs high
    // by default seer.minForMerchant could be 0; toggle force flag to hit branch
    await mr.TEST_setForceLowScore(true);
    expect(await mr.TEST_if_forceLowScore_right()).to.equal(true);
    await mr.TEST_setForceLowScore(false);
  });

  it("CommerceEscrow: call access helpers from different callers to flip arms", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const CE = await ethers.getContractFactory("CommerceEscrow");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // prepare merchant and buyer
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    const mhash = '0x' + '22'.repeat(32);
    await mr.connect(alice).addMerchant(mhash);
    await vault.setVault(bob.address, bob.address);

    // create escrow as bob (buyer)
    await escrow.connect(bob).open(alice.address, 1, mhash);
    const id = await escrow.escrowCount();

    // caller is buyer -> releaseAllowed true, refundAllowed false for buyer
    expect(await escrow.TEST_if_release_allowed(id, bob.address)).to.equal(true);
    expect(await escrow.TEST_if_refund_allowed(id, bob.address)).to.equal(false);

    // caller is merchant -> refundAllowed true, releaseAllowed false
    expect(await escrow.TEST_if_refund_allowed(id, alice.address)).to.equal(true);
    expect(await escrow.TEST_if_release_allowed(id, alice.address)).to.equal(false);

    // caller is dao -> both allowed
    expect(await escrow.TEST_if_release_allowed(id, dao.address)).to.equal(true);
    expect(await escrow.TEST_if_refund_allowed(id, dao.address)).to.equal(true);
  });

  it("Finance: flip whitelist and zero-amount arms for StablecoinRegistry and EcoTreasury", async function () {
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();

    // deposit not whitelisted currently
    expect(await stable.TEST_if_deposit_notWhitelisted(good.target)).to.equal(true);
    // add to whitelist and re-check
    await stable.connect(dao).addAsset(good.target, "G");
    expect(await stable.TEST_if_deposit_notWhitelisted(good.target)).to.equal(false);

    // zero-amount deposit check
    expect(await stable.TEST_if_deposit_zeroAmount(0)).to.equal(true);
    expect(await stable.TEST_if_deposit_zeroAmount(1)).to.equal(false);

    // send checks: zero to or zero amount
    expect(await stable.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 0)).to.equal(true);
    expect(await stable.TEST_if_send_zeroToOrAmt(good.target, 1)).to.equal(false);

    // tokenIsZero helper
    expect(await stable.TEST_if_send_tokenIsZero(ethers.ZeroAddress)).to.equal(true);
    expect(await stable.TEST_if_send_tokenIsZero(good.target)).to.equal(false);
  });
});
