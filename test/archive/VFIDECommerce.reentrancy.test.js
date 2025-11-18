const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce reentrancy resilience", function () {
  let owner, buyer, merchant;
  let ReenterToken, reenter;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant] = await ethers.getSigners();
    ReenterToken = await ethers.getContractFactory("ReenteringERC20");
    reenter = await ReenterToken.deploy();
    await reenter.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, reenter.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, reenter.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("attempted reentrancy via token.transfer should not break state (release remains safe)", async function () {
    // setup merchant and vaults
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("rm1"));

    // open escrow
    const amount = ethers.parseUnits("1", 18);
    await commerce.connect(buyer).open(merchant.address, amount, ethers.id("rmmeta"));

    // mint reenter token to commerce and set it to reenter on release(1)
    await reenter.mint(commerce.target, amount);
    await reenter.setReenter(commerce.target, 1);

    // markFunded should see balance and move to FUNDED
    await commerce.markFunded(1);
    let e = await commerce.escrows(1);
    expect(e.state).to.equal(2); // FUNDED

    // release should attempt transfer; token will call back to release(1) causing revert
    await expect(commerce.release(1)).to.be.reverted;

    // state should remain FUNDED after failed release (transaction reverted)
    e = await commerce.escrows(1);
    expect(e.state).to.equal(2);
  });
});
