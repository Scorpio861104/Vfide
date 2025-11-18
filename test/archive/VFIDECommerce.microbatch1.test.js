const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 1 (focused)", function () {
  let owner, buyer, merchant;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

  Seer = await ethers.getContractFactory("SeerMock");
  seer = await Seer.deploy();
  await seer.waitForDeployment();
  // set a non-zero min for merchant before registry construction so registry.minScore picks it up
  await seer.setMin(10);

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

  // deploy a simple token (use ERC20FailTransfer which has no ctor) so constructor sees non-zero token address
  const Token = await ethers.getContractFactory("ERC20FailTransfer");
  const token = await Token.deploy();
  await token.waitForDeployment();

  Registry = await ethers.getContractFactory("MerchantRegistry");
  registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

  Commerce = await ethers.getContractFactory("CommerceEscrow");
  commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("addMerchant reverts when merchant has no vault", async function () {
    // ensure merchant has no vault
    // do not set vault for merchant
    await expect(registry.connect(merchant).addMerchant(ethers.id("nomvault"))).to.be.reverted;
  });

  it("addMerchant reverts when seer score is below min", async function () {
    // give merchant a vault
    await vaultHub.setVault(merchant.address, merchant.address);
    // set low score and min > score
    await seer.setScore(merchant.address, 0);
    await seer.setMin(10);
    await expect(registry.connect(merchant).addMerchant(ethers.id("lowscore"))).to.be.reverted;
  });

  it("addMerchant reverts on duplicate registration", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("dup"));
    await expect(registry.connect(merchant).addMerchant(ethers.id("dup"))).to.be.reverted;
  });

  it("_noteRefund reverts when called for zero address (COM_Zero branch)", async function () {
    await expect(registry._noteRefund(ethers.ZeroAddress)).to.be.reverted;
  });

  it("open reverts when buyer has no vault (missing buyer vault branch)", async function () {
    // ensure buyer has no vault
    // do not set vault for buyer
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m1"));
    await expect(commerce.connect(buyer).open(merchant.address, 1, ethers.id("b1"))).to.be.reverted;
  });
});
