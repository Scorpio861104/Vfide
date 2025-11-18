const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce targeted branch tests", function () {
  let owner, alice, merchant, bob;
  let Token, token;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;

  beforeEach(async function () {
    [owner, alice, merchant, bob] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("T","T");
    await token.waitForDeployment();
  });

  it("MerchantRegistry: addMerchant TEST toggles and constructor zeros", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistry");
    // constructor zero checks
    await expect(MR.deploy(ethers.ZeroAddress, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");
    await expect(MR.deploy(owner.address, ethers.ZeroAddress, vaultHub.target, seer.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");

    // proper deploy
    const registry = await MR.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    // force already merchant
    await registry.TEST_setForceAlreadyMerchant(true);
    await expect(registry.connect(alice).addMerchant(ethers.id("m"))).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    await registry.TEST_setForceAlreadyMerchant(false);

    // force no vault
    await registry.TEST_setForceNoVault(true);
    await expect(registry.connect(alice).addMerchant(ethers.id("m"))).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    await registry.TEST_setForceNoVault(false);

    // force low score
    await registry.TEST_setForceLowScore(true);
    await expect(registry.connect(alice).addMerchant(ethers.id("m"))).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    await registry.TEST_setForceLowScore(false);
  });

  it("MerchantRegistry: TEST force zero-sender refund/dispute revert COM_Zero", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MR.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    await registry.TEST_setForceZeroSenderRefund(true);
    await expect(registry._noteRefund(alice.address)).to.be.revertedWithCustomError(registry, "COM_Zero");
    await registry.TEST_setForceZeroSenderRefund(false);

    await registry.TEST_setForceZeroSenderDispute(true);
    await expect(registry._noteDispute(alice.address)).to.be.revertedWithCustomError(registry, "COM_Zero");
    await registry.TEST_setForceZeroSenderDispute(false);
  });

  it("CommerceEscrow: resolve buyerWins true branch is exercised", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MR.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const CE = await ethers.getContractFactory("CommerceEscrow");
    const commerce = await CE.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();

    // register vaults and merchant
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setMin(0);
    await seer.setScore(merchant.address, 100);
    // now add merchant (uses real flow)
    await registry.connect(merchant).addMerchant(ethers.id("meta"));

    // open escrow
    await commerce.connect(alice).open(merchant.address, 42, ethers.id("r1"));
    // fund commerce contract and mark funded
    await token.mint(commerce.target, 1000);
    await commerce.markFunded(1);

    // dispute then resolve buyerWins true
    await commerce.connect(alice).dispute(1, "why");
    await commerce.connect(owner).resolve(1, true);

    const e = await commerce.escrows(1);
    expect(e.state).to.equal(6); // RESOLVED

    // verify buyer vault received funds
    const buyerVaultBal = await token.balanceOf(alice.address);
    expect(buyerVaultBal).to.equal(42);
  });
});
