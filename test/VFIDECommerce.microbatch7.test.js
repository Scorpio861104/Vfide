const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 7 (state/negative branches)", function () {
  let owner, buyer, merchant, attacker;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, token;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant, attacker] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setMin(1);

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("TK","TK");
    await token.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    // set up vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("mb7"));
  });

  it("release reverts when escrow is not FUNDED (BadState)", async function () {
    await commerce.connect(buyer).open(merchant.address, 1, ethers.id("s1"));
    const id = await commerce.escrowCount();
    await expect(commerce.release(id)).to.be.reverted;
  });

  it("refund reverts when escrow is not FUNDED or DISPUTED (BadState)", async function () {
    await commerce.connect(buyer).open(merchant.address, 1, ethers.id("s2"));
    const id = await commerce.escrowCount();
    await expect(commerce.connect(merchant).refund(id)).to.be.reverted;
  });

  it("dispute reverts when escrow is not FUNDED (BadState)", async function () {
    await commerce.connect(buyer).open(merchant.address, 1, ethers.id("s3"));
    const id = await commerce.escrowCount();
    await expect(commerce.connect(buyer).dispute(id, "x")).to.be.reverted;
  });

  it("markFunded reverts when contract balance is insufficient (NotFunded)", async function () {
    await commerce.connect(buyer).open(merchant.address, 1000, ethers.id("s4"));
    const id = await commerce.escrowCount();
    // do not mint tokens to contract
    await expect(commerce.markFunded(id)).to.be.reverted;
  });
});
