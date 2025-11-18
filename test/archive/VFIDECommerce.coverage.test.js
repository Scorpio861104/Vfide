const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce", function () {
  let VFIDECommerce, vfideCommerce;
  let owner, addr1, addr2;
  let vaultHub, seer, proofLedger;

  let VaultHub, Seer, ProofLedger; // Declare all mock contract factories at the top

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    try {
      console.log("Fetching contract factory for VaultHubMock...");
      VaultHub = await ethers.getContractFactory("contracts-min/mocks/VaultHubMock.sol:VaultHubMock");
      console.log("VaultHubMock factory:", VaultHub);
      console.log("Deploying VaultHubMock...");
      vaultHub = await VaultHub.deploy();
      await vaultHub.deployed();
      console.log("VaultHubMock deployed at:", vaultHub.address);
    } catch (error) {
      console.error("Error deploying VaultHubMock:", error);
    }

    try {
      console.log("Fetching contract factory for SeerMock...");
      Seer = await ethers.getContractFactory("contracts-min/mocks/SeerMock.sol:SeerMock");
      console.log("SeerMock factory:", Seer);
      console.log("Deploying SeerMock...");
      seer = await Seer.deploy();
      await seer.deployed();
      console.log("SeerMock deployed at:", seer.address);
    } catch (error) {
      console.error("Error deploying SeerMock:", error);
    }

    try {
      console.log("Fetching contract factory for ProofLedgerMock...");
      ProofLedger = await ethers.getContractFactory("contracts-min/mocks/ProofLedgerMock.sol:ProofLedgerMock");
      console.log("ProofLedgerMock factory:", ProofLedger);
      console.log("Deploying ProofLedgerMock...");
      proofLedger = await ProofLedger.deploy();
      await proofLedger.deployed();
      console.log("ProofLedgerMock deployed at:", proofLedger.address);
    } catch (error) {
      console.error("Error deploying ProofLedgerMock:", error);
    }

    console.log("Mock contracts deployed:", {
      vaultHub: vaultHub?.address || "undefined",
      seer: seer?.address || "undefined",
      proofLedger: proofLedger?.address || "undefined"
    });
  });

  it("Should add a merchant successfully", async function () {
    await vaultHub.setVault(addr1.address, addr1.address);
    await seer.setScore(addr1.address, 100);

    await expect(vfideCommerce.connect(addr1).addMerchant(ethers.utils.formatBytes32String("meta")))
      .to.emit(vfideCommerce, "MerchantAdded")
      .withArgs(addr1.address, addr1.address, ethers.utils.formatBytes32String("meta"));
  });

  it("Should revert if the merchant already exists", async function () {
    await vaultHub.setVault(addr1.address, addr1.address);
    await seer.setScore(addr1.address, 100);
    await vfideCommerce.connect(addr1).addMerchant(ethers.utils.formatBytes32String("meta"));

    await expect(vfideCommerce.connect(addr1).addMerchant(ethers.utils.formatBytes32String("meta")))
      .to.be.revertedWith("COM_AlreadyMerchant");
  });

  it("Should revert if the vault is not set", async function () {
    await seer.setScore(addr1.address, 100);

    await expect(vfideCommerce.connect(addr1).addMerchant(ethers.utils.formatBytes32String("meta")))
      .to.be.revertedWith("COM_NotAllowed");
  });

  it("Should revert if the score is too low", async function () {
    await vaultHub.setVault(addr1.address, addr1.address);
    await seer.setScore(addr1.address, 50);

    await expect(vfideCommerce.connect(addr1).addMerchant(ethers.utils.formatBytes32String("meta")))
      .to.be.revertedWith("COM_NotAllowed");
  });
});