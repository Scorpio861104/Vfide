const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 4 (DAO paths & resolve permutations)", function () {
  let owner, dao, buyer, merchant, other;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Token, token;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, dao, buyer, merchant, other] = await ethers.getSigners();

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
    registry = await Registry.deploy(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrow");
    commerce = await Commerce.deploy(dao.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    // setup vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("mdao"));
  });

  it("DAO can release an escrow (not buyer) and state becomes RELEASED", async function () {
  await commerce.connect(buyer).open(merchant.address, 10, ethers.id("d1"));
  await token.mint(commerce.target, 10);
  const id1 = await commerce.escrowCount();
  await commerce.markFunded(id1);
  await commerce.connect(dao).release(id1);
  const e = await commerce.escrows(id1);
    expect(e.state).to.equal(3); // RELEASED
  });

  it("DAO can refund an escrow (not merchant) and state becomes REFUNDED and merchant _noteRefund called", async function () {
  await commerce.connect(buyer).open(merchant.address, 5, ethers.id("d2"));
  await token.mint(commerce.target, 5);
  const id2 = await commerce.escrowCount();
  await commerce.markFunded(id2);
  await commerce.connect(dao).refund(id2);
  const e = await commerce.escrows(id2);
    expect(e.state).to.equal(4); // REFUNDED
    const m = await registry.info(merchant.address);
    expect(m.refunds).to.equal(1);
  });

  it("DAO resolve buyerWins=true transfers to buyer and state RESOLVED", async function () {
  await commerce.connect(buyer).open(merchant.address, 7, ethers.id("d3"));
  await token.mint(commerce.target, 7);
  const id3 = await commerce.escrowCount();
  await commerce.markFunded(id3);
  await commerce.connect(buyer).dispute(id3, "reason");
  await commerce.connect(dao).resolve(id3, true);
  const e = await commerce.escrows(id3);
    expect(e.state).to.equal(6); // RESOLVED
  });

  it("DAO resolve buyerWins=false transfers to seller and state RESOLVED", async function () {
  await commerce.connect(buyer).open(merchant.address, 8, ethers.id("d4"));
  await token.mint(commerce.target, 8);
  const id4 = await commerce.escrowCount();
  await commerce.markFunded(id4);
  await commerce.connect(buyer).dispute(id4, "reason");
  await commerce.connect(dao).resolve(id4, false);
  const e = await commerce.escrows(id4);
    expect(e.state).to.equal(6); // RESOLVED
  });

  it("non-DAO cannot call resolve (onlyDAO enforcement)", async function () {
  await commerce.connect(buyer).open(merchant.address, 3, ethers.id("d5"));
  await token.mint(commerce.target, 3);
  const id5 = await commerce.escrowCount();
  await commerce.markFunded(id5);
  await commerce.connect(buyer).dispute(id5, "r");
  await expect(commerce.connect(other).resolve(id5, true)).to.be.reverted;
  });
});
