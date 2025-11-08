const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 5 (cond-expr permutations & disputes)", function () {
  let owner, user, merchant;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, token;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, user, merchant] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

  Seer = await ethers.getContractFactory("SeerMock");
  seer = await Seer.deploy();
  await seer.waitForDeployment();
  // default min for these tests is 10; set before registry construction so registry.minScore picks it up
  await seer.setMin(10);

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
  });

  it("addMerchant succeeds when score == min (boundary)", async function () {
    await seer.setMin(10);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 10);
    await expect(registry.connect(merchant).addMerchant(ethers.id("b1"))).to.not.be.reverted;
  });

  it("addMerchant reverts when score == min-1 (boundary)", async function () {
    await seer.setMin(10);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 9);
    await expect(registry.connect(merchant).addMerchant(ethers.id("b2"))).to.be.reverted;
  });

  it("combined TEST toggles: forceNoVault with v==0 and forceAlreadyMerchant when appropriate", async function () {
    // case: v == 0 and TEST_forceNoVault true -> revert
    await registry.TEST_setForceNoVault(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("c1"))).to.be.reverted;
    await registry.TEST_setForceNoVault(false);

    // case: merchant already added and TEST_forceAlreadyMerchant true still reverts
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setMin(0);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("c2"));
    await registry.TEST_setForceAlreadyMerchant(true);
    await expect(registry.connect(merchant).addMerchant(ethers.id("c3"))).to.be.reverted;
    await registry.TEST_setForceAlreadyMerchant(false);
  });

  it("_noteDispute auto-suspends merchant after threshold", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("d1"));
    // call _noteDispute repeatedly to reach autoSuspendDisputes (default 3)
    await registry._noteDispute(merchant.address);
    await registry._noteDispute(merchant.address);
    await registry._noteDispute(merchant.address);
    const m = await registry.info(merchant.address);
    expect(m.status).to.equal(2); // SUSPENDED
  });
});
