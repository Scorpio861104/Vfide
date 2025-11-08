const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce extra branch coverage", function () {
  let owner, alice, merchant, other;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Token, token;
  let RegistryMock, registryMock;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, alice, merchant, other] = await ethers.getSigners();

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

    RegistryMock = await ethers.getContractFactory("MerchantRegistryMock");

    // commerce will be constructed with a mock registry address; we'll deploy per-test as needed
    Commerce = await ethers.getContractFactory("CommerceEscrow");
  });

  it("open reverts when amount == 0 (COM_BadAmount)", async function () {
    // deploy a trivial registry mock with NONE status
    registryMock = await RegistryMock.deploy(merchant.address, merchant.address, 0);
    await registryMock.waitForDeployment();

    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registryMock.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();

    await expect(commerce.connect(alice).open(merchant.address, 0, ethers.id("z"))).to.be.revertedWithCustomError(commerce, "COM_BadAmount");
  });

  it("open reverts when merchant status is NONE / SUSPENDED / DELISTED", async function () {
    // NONE
    registryMock = await RegistryMock.deploy(merchant.address, merchant.address, 0);
    await registryMock.waitForDeployment();
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registryMock.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();
    // buyer vault set so buyer check doesn't mask status check
    await vaultHub.setVault(alice.address, alice.address);
    await expect(commerce.connect(alice).open(merchant.address, 1, ethers.id("none"))).to.be.revertedWithCustomError(commerce, "COM_NotMerchant");

    // SUSPENDED
    registryMock = await RegistryMock.deploy(merchant.address, merchant.address, 2);
    await registryMock.waitForDeployment();
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registryMock.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();
    await vaultHub.setVault(alice.address, alice.address);
    await expect(commerce.connect(alice).open(merchant.address, 1, ethers.id("suspended"))).to.be.revertedWithCustomError(commerce, "COM_Suspended");

    // DELISTED
    registryMock = await RegistryMock.deploy(merchant.address, merchant.address, 3);
    await registryMock.waitForDeployment();
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registryMock.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();
    await vaultHub.setVault(alice.address, alice.address);
    await expect(commerce.connect(alice).open(merchant.address, 1, ethers.id("delisted"))).to.be.revertedWithCustomError(commerce, "COM_Delisted");
  });

  it("resolve onlyDAO and buyerWins / sellerWins success paths", async function () {
    // For these flows use the real MerchantRegistry so we can add a merchant
    const Registry = await ethers.getContractFactory("MerchantRegistry");
    const registry = await Registry.deploy(owner.address, token.target, vaultHub.target, seer.target, security.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    // commerce instance using real registry
    commerce = await Commerce.deploy(owner.address, token.target, vaultHub.target, registry.target, security.target, ethers.ZeroAddress);
    await commerce.waitForDeployment();

    // make merchant active
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setMin(0);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("m"));

    // set buyer vault and open escrow
    await vaultHub.setVault(alice.address, alice.address);
    await commerce.connect(alice).open(merchant.address, 5, ethers.id("mx"));

    // mint tokens to commerce and markFunded
    await token.mint(commerce.target, 100);
    await commerce.markFunded(1);

  // dispute so that state == DISPUTED (resolve requires DISPUTED)
  await commerce.connect(alice).dispute(1, "reason1");

  // try resolve as non-dao -> should revert (modifier onlyDAO)
  await expect(commerce.connect(alice).resolve(1, true)).to.be.revertedWithCustomError(commerce, "COM_NotDAO");

  // now resolve as dao (owner) - buyerWins true
  await commerce.connect(owner).resolve(1, true);
  const e = await commerce.escrows(1);
  // state should be RESOLVED (6)
  expect(e.state).to.equal(6);

    // open a second escrow to exercise sellerWins
    await commerce.connect(alice).open(merchant.address, 6, ethers.id("mx2"));
    await token.mint(commerce.target, 100);
    await commerce.markFunded(2);
    // dispute flow: need to set state to DISPUTED first
    // set state to DISPUTED by calling dispute from buyer
    await commerce.connect(alice).dispute(2, "reason");
    // now only dao can call resolve - call as owner and choose sellerWins (false)
  await commerce.connect(owner).resolve(2, false);
  const e2 = await commerce.escrows(2);
  expect(e2.state).to.equal(6);
  });

});

