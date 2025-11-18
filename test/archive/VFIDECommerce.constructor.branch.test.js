const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce constructor/resolve branch sweeps", function () {
  let owner, alice, merchant;
  let Token, token;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;

  beforeEach(async function () {
    [owner, alice, merchant] = await ethers.getSigners();

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
    token = await Token.deploy("C","C");
    await token.waitForDeployment();
  });

  it("MerchantRegistry constructor reverts for each zero param (COM_Zero)", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistry");
    // dao zero
    await expect(MR.deploy(ethers.ZeroAddress, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");
    // token zero
    await expect(MR.deploy(owner.address, ethers.ZeroAddress, vaultHub.target, seer.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");
    // hub zero
    await expect(MR.deploy(owner.address, token.target, ethers.ZeroAddress, seer.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");
    // seer zero
    await expect(MR.deploy(owner.address, token.target, vaultHub.target, ethers.ZeroAddress, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(MR, "COM_Zero");
  });

  it("CommerceEscrow constructor reverts for each zero param (COM_Zero)", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MR.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const CE = await ethers.getContractFactory("CommerceEscrow");
    // dao zero
    await expect(CE.deploy(ethers.ZeroAddress, token.target, vaultHub.target, registry.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(CE, "COM_Zero");
    // token zero
    await expect(CE.deploy(owner.address, ethers.ZeroAddress, vaultHub.target, registry.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(CE, "COM_Zero");
    // hub zero
    await expect(CE.deploy(owner.address, token.target, ethers.ZeroAddress, registry.target, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(CE, "COM_Zero");
    // merchants zero
    await expect(CE.deploy(owner.address, token.target, vaultHub.target, ethers.ZeroAddress, security.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(CE, "COM_Zero");
  });

  it("resolve buyerWins true/false arms explicitly exercised", async function () {
    // set up real registry + commerce
    const MR = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MR.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const CE = await ethers.getContractFactory("CommerceEscrow");
    const commerce = await CE.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();

    // prepare merchant and buyer
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setMin(0);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("m"));

    // open escrow and fund
    await commerce.connect(alice).open(merchant.address, 5, ethers.id("r1"));
    await token.mint(commerce.target, 100);
    await commerce.markFunded(1);

    // dispute then resolve buyerWins true
    await commerce.connect(alice).dispute(1, "x");
    await commerce.connect(owner).resolve(1, true);
    const e1 = await commerce.escrows(1);
    expect(e1.state).to.equal(6);

    // second escrow: dispute then resolve buyerWins false
    await commerce.connect(alice).open(merchant.address, 6, ethers.id("r2"));
    await token.mint(commerce.target, 100);
    await commerce.markFunded(2);
    await commerce.connect(alice).dispute(2, "y");
    await commerce.connect(owner).resolve(2, false);
    const e2 = await commerce.escrows(2);
    expect(e2.state).to.equal(6);
  });
});
