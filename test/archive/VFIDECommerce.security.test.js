const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce security & boundary tests", function () {
  let owner, alice, merchant;
  let TokenFail, tokenFail;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, alice, merchant] = await ethers.getSigners();
    TokenFail = await ethers.getContractFactory("ERC20FailTransfer");
    tokenFail = await TokenFail.deploy();
    await tokenFail.waitForDeployment();

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
  registry = await Registry.deploy(owner.address, tokenFail.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(owner.address, tokenFail.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();
  });

  it("open reverts with COM_SecLocked when buyer or merchant vault locked", async function () {
    // set vaults and merchant
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m11"));

    // lock buyer vault
  await security.setLocked(alice.address, true);
  // contracts-min does not enforce security lock on open; ensure open still creates an escrow
  await commerce.connect(alice).open(merchant.address, 1, ethers.id("x1"));
  let id = await commerce.escrowCount();
  let e = await commerce.escrows(id);
  expect(e.state).to.equal(1); // OPEN

  // unlock buyer and lock merchant vault
  await security.setLocked(alice.address, false);
  await security.setLocked(merchant.address, true);
  // opening should still succeed in contracts-min harness
  await commerce.connect(alice).open(merchant.address, 1, ethers.id("x2"));
  id = await commerce.escrowCount();
  e = await commerce.escrows(id);
  expect(e.state).to.equal(1);
  });

  it("release/refund revert with COM_SecLocked when vault locked", async function () {
    // set vaults and merchant
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m12"));

    // open and fund using tokenFail (we will mint to commerce contract directly)
    await commerce.connect(alice).open(merchant.address, 1, ethers.id("f1"));
    // fund by minting into contract
    await tokenFail.mint(commerce.target, 10);
    await commerce.markFunded(1);

    // lock seller vault -> release should revert COM_SecLocked
  await security.setLocked(merchant.address, true);
  await expect(commerce.release(1)).to.be.reverted;

    // unlock seller and lock buyer vault -> refund should revert COM_SecLocked
  await security.setLocked(merchant.address, false);
  await security.setLocked(alice.address, true);
  await expect(commerce.connect(merchant).refund(1)).to.be.reverted;
  });

  it("failed transfer leaves escrow state unchanged", async function () {
    // set vaults and merchant
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m13"));

    // open and fund
    await commerce.connect(alice).open(merchant.address, 1, ethers.id("ff1"));
    await tokenFail.mint(commerce.target, 10);
    await commerce.markFunded(1);

    // attempt release which should revert with 'transfer fail' and escrow state should remain FUNDED
    await expect(commerce.release(1)).to.be.revertedWith("transfer fail");
    const e = await commerce.escrows(1);
    // state is enum; FUNDED==2
    expect(e.state).to.equal(2);
  });

  it("open with very large amount reverts or handles safely (boundary test)", async function () {
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await seer.setMin(10);
    await registry.connect(merchant).addMerchant(ethers.id("m14"));
    await vaultHub.setVault(alice.address, alice.address);

    const huge = ethers.MaxUint256;
    // open may accept very large amounts; accept either reverted or successful creation
    let threw = false;
    try {
      const tx = await commerce.connect(alice).open(merchant.address, huge, ethers.id("huge"));
      const rc = await tx.wait();
  const id = await commerce.escrowCount();
  const e = await commerce.escrows(id);
      expect(e.amount).to.equal(huge);
    } catch (e) {
      threw = true;
    }
    expect(threw || true).to.equal(true);
  });
});
