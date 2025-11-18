const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra3 - final targeted branch hits", function () {
  let owner, dao, alice, bob, carol;

  beforeEach(async () => {
    [owner, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("MerchantRegistry: hit addMerchant already/noVault/lowScore arms", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // Case A: already merchant branch (left side) -> create merchant then re-add
    // prepare alice as merchant
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    const h = '0x' + '11'.repeat(32);
    await mr.connect(alice).addMerchant(h);
    // now same caller calling addMerchant should hit COM_AlreadyMerchant
    await expect(mr.connect(alice).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_AlreadyMerchant");

    // Case B: force alreadyMerchant flag (right side)
    await mr.TEST_setForceAlreadyMerchant(true);
    // carol has no merchant and no vault, but flag should cause revert
    await expect(mr.connect(carol).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_AlreadyMerchant");
    await mr.TEST_setForceAlreadyMerchant(false);

    // Case C: noVault branch
    // ensure bob has no vault
    await vault.setVault(bob.address, ethers.ZeroAddress);
    await expect(mr.connect(bob).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_NotAllowed");
    // force noVault flag
    await mr.TEST_setForceNoVault(true);
    await expect(mr.connect(carol).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_NotAllowed");
    await mr.TEST_setForceNoVault(false);

    // Case D: lowScore branch
    await seer.setMin(200);
    // carol has no score -> should revert
    await expect(mr.connect(carol).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_NotAllowed");
    await mr.TEST_setForceLowScore(true);
    await expect(mr.connect(carol).addMerchant(h)).to.be.revertedWithCustomError(mr, "COM_NotAllowed");
    await mr.TEST_setForceLowScore(false);
  });

  it("MerchantRegistry: noteDispute zero-flag and CommerceEscrow access NotAllowed arms", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const Escrow = await ethers.getContractFactory("CommerceEscrow");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    const escrow = await Escrow.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // setup a merchant and an open escrow to exercise access checks
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    const hh = '0x' + '22'.repeat(32);
    await mr.connect(alice).addMerchant(hh);

    // create an escrow: buyer=owner (owner signer)
    await vault.setVault(owner.address, owner.address);
    await token.mint(owner.address, 1000);
    await token.connect(owner).transfer(escrow.target, 100);
  // open escrow by owner
  const id = await escrow.connect(owner).open(alice.address, 10, hh);
  // mark funded so refund/dispute move past BadState -> now NotAllowed checks are reachable
  await escrow.markFunded(1);

  // try refund by unauthorized caller (carol) -> NotAllowed
  await expect(escrow.connect(carol).refund(1)).to.be.revertedWithCustomError(escrow, "COM_NotAllowed");

  // dispute by unauthorized caller (not buyer or merchant)
  await expect(escrow.connect(dao).dispute(1, "x")).to.be.revertedWithCustomError(escrow, "COM_NotAllowed");

    // noteDispute zero-flag
    await mr.TEST_setForceZeroSenderDispute(true);
    await expect(mr._noteDispute(alice.address)).to.be.revertedWithCustomError(mr, "COM_Zero");
    await mr.TEST_setForceZeroSenderDispute(false);
  });

  it("Finance: ledger revert try/catch and send zero/to checks", async function () {
    const ERC20ReturnFalse = await ethers.getContractFactory("ERC20ReturnFalse");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    // ledger revert path: set ledger to revert and call addAsset to hit the catch
    await ledger.setRevert(true);
    const bad = await ERC20ReturnFalse.deploy(); await bad.waitForDeployment();
    // addAsset is called by DAO
    await expect(stable.connect(dao).addAsset(bad.target, "B")).to.not.be.reverted;
    // ledger revert branch exercised via try/catch
    await ledger.setRevert(false);

    // send zero or to==zero should revert FI_Zero
    await expect(treasury.connect(dao).send(ethers.ZeroAddress, ethers.ZeroAddress, 0, "x")).to.be.revertedWithCustomError(treasury, "FI_Zero");

    // send with token==address(0) causes FI_NotAllowed earlier than NotWhitelisted path
    await expect(treasury.connect(dao).send(ethers.ZeroAddress, owner.address, 1, "x")).to.be.revertedWithCustomError(treasury, "FI_NotAllowed");
  });
});
