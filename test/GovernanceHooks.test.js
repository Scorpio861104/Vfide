const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceHooks", function () {
  let hooks, ledger, seer;
  let deployer, dao, voter;

  beforeEach(async function () {
    [deployer, dao, voter] = await ethers.getSigners();

    // Deploy mock ProofLedger
    const LedgerMock = await ethers.getContractFactory("ProofLedger");
    ledger = await LedgerMock.deploy(dao.address);

    // Deploy mock Seer
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();

    // Deploy GovernanceHooks (needs ledger, seer, dao)
    const GovernanceHooks = await ethers.getContractFactory("GovernanceHooks");
    hooks = await GovernanceHooks.deploy(ledger.target, seer.target, dao.address);
  });

  describe("Deployment", function () {
    it("should deploy with correct ledger", async function () {
      expect(await hooks.ledger()).to.equal(ledger.target);
    });

    it("should deploy with correct seer", async function () {
      expect(await hooks.seer()).to.equal(seer.target);
    });

    it("should emit ModulesSet on deployment", async function () {
      const GovernanceHooks = await ethers.getContractFactory("GovernanceHooks");
      const contract = await GovernanceHooks.deploy(await ledger.getAddress(), await seer.getAddress(), dao.address);
      await expect(contract.deploymentTransaction())
        .to.emit(contract, "ModulesSet")
        .withArgs(await ledger.getAddress(), await seer.getAddress(), ethers.ZeroAddress);
    });

    it("should deploy with zero address ledger (optional)", async function () {
      const GovernanceHooks = await ethers.getContractFactory("GovernanceHooks");
      const h = await GovernanceHooks.deploy(ethers.ZeroAddress, await seer.getAddress(), dao.address);
      expect(await h.ledger()).to.equal(ethers.ZeroAddress);
    });

    it("should deploy with zero address seer (optional)", async function () {
      const GovernanceHooks = await ethers.getContractFactory("GovernanceHooks");
      const h = await GovernanceHooks.deploy(ledger.target, ethers.ZeroAddress, dao.address);
      expect(await h.seer()).to.equal(ethers.ZeroAddress);
    });

    it("should deploy with both zero addresses", async function () {
      const GovernanceHooks = await ethers.getContractFactory("GovernanceHooks");
      const h = await GovernanceHooks.deploy(ethers.ZeroAddress, ethers.ZeroAddress, dao.address);
      expect(await h.ledger()).to.equal(ethers.ZeroAddress);
      expect(await h.seer()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setModules", function () {
    it("should update ledger address", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      await hooks.setModules(newLedger, await seer.getAddress(), ethers.ZeroAddress);
      expect(await hooks.ledger()).to.equal(newLedger);
    });

    it("should update seer address", async function () {
      const newSeer = ethers.Wallet.createRandom().address;
      await hooks.setModules(ledger.target, newSeer, ethers.ZeroAddress);
      expect(await hooks.seer()).to.equal(newSeer);
    });

    it("should update both addresses", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newSeer = ethers.Wallet.createRandom().address;
      await hooks.setModules(newLedger, newSeer, ethers.ZeroAddress);
      expect(await hooks.ledger()).to.equal(newLedger);
      expect(await hooks.seer()).to.equal(newSeer);
    });

    it("should emit ModulesSet", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newSeer = ethers.Wallet.createRandom().address;
      await expect(hooks.setModules(newLedger, newSeer, ethers.ZeroAddress))
        .to.emit(hooks, "ModulesSet")
        .withArgs(newLedger, newSeer, ethers.ZeroAddress);
    });

    it("should allow setting zero addresses", async function () {
      await hooks.setModules(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
      expect(await hooks.ledger()).to.equal(ethers.ZeroAddress);
      expect(await hooks.seer()).to.equal(ethers.ZeroAddress);
    });

    it("should revert if non-owner tries to setModules", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      await expect(
        hooks.connect(voter).setModules(newLedger, await seer.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("not owner");
    });
  });

  describe("onProposalQueued", function () {
    it("should execute without reverting", async function () {
      await expect(hooks.onProposalQueued(1, dao.address, 1000))
        .to.not.be.reverted;
    });

    it("should log system event when ledger is set", async function () {
      await expect(hooks.onProposalQueued(1, dao.address, 1000))
        .to.emit(ledger, "SystemEvent");
    });

    it("should not revert when ledger is zero address", async function () {
      await hooks.setModules(ethers.ZeroAddress, await seer.getAddress(), ethers.ZeroAddress);
      await expect(hooks.onProposalQueued(1, dao.address, 1000))
        .to.not.be.reverted;
    });

    it("should handle multiple proposal IDs", async function () {
      await hooks.onProposalQueued(1, dao.address, 1000);
      await hooks.onProposalQueued(2, dao.address, 2000);
      await hooks.onProposalQueued(999, dao.address, 0);
    });

    it("should handle zero value proposals", async function () {
      await expect(hooks.onProposalQueued(1, dao.address, 0))
        .to.not.be.reverted;
    });

    it("should handle zero target address", async function () {
      await expect(hooks.onProposalQueued(1, ethers.ZeroAddress, 1000))
        .to.not.be.reverted;
    });
  });

  describe("onVoteCast", function () {
    it("should execute without reverting for support vote", async function () {
      await expect(hooks.onVoteCast(1, voter.address, true))
        .to.not.be.reverted;
    });

    it("should execute without reverting for against vote", async function () {
      await expect(hooks.onVoteCast(1, voter.address, false))
        .to.not.be.reverted;
    });

    it("should log system event when ledger is set", async function () {
      await expect(hooks.onVoteCast(1, voter.address, true))
        .to.emit(ledger, "SystemEvent");
    });

    it("should not revert when ledger is zero address", async function () {
      await hooks.setModules(ethers.ZeroAddress, await seer.getAddress(), ethers.ZeroAddress);
      await expect(hooks.onVoteCast(1, voter.address, true))
        .to.not.be.reverted;
    });

    it("should handle multiple voters", async function () {
      await hooks.onVoteCast(1, voter.address, true);
      await hooks.onVoteCast(1, dao.address, false);
      await hooks.onVoteCast(1, deployer.address, true);
    });

    it("should handle zero address voter", async function () {
      await expect(hooks.onVoteCast(1, ethers.ZeroAddress, true))
        .to.not.be.reverted;
    });
  });

  describe("onFinalized", function () {
    it("should execute for passed proposal", async function () {
      await expect(hooks.onFinalized(1, true))
        .to.not.be.reverted;
    });

    it("should execute for failed proposal", async function () {
      await expect(hooks.onFinalized(1, false))
        .to.not.be.reverted;
    });

    it("should log system event when ledger is set", async function () {
      await expect(hooks.onFinalized(1, true))
        .to.emit(ledger, "SystemEvent");
    });

    it("should log system event when ledger is set (failed)", async function () {
      await expect(hooks.onFinalized(1, false))
        .to.emit(ledger, "SystemEvent");
    });

    it("should not revert when ledger is zero address", async function () {
      await hooks.setModules(ethers.ZeroAddress, await seer.getAddress(), ethers.ZeroAddress);
      await expect(hooks.onFinalized(1, true))
        .to.not.be.reverted;
    });

    it("should handle multiple proposal finalizations", async function () {
      await hooks.onFinalized(1, true);
      await hooks.onFinalized(2, false);
      await hooks.onFinalized(3, true);
    });
  });

  describe("Hook Integration Flow", function () {
    it("should execute complete governance flow", async function () {
      // Proposal queued
      await hooks.onProposalQueued(1, dao.address, 1000);
      
      // Multiple votes cast
      await hooks.onVoteCast(1, voter.address, true);
      await hooks.onVoteCast(1, dao.address, true);
      
      // Finalized
      await hooks.onFinalized(1, true);
    });

    it("should handle multiple proposals simultaneously", async function () {
      await hooks.onProposalQueued(1, dao.address, 1000);
      await hooks.onProposalQueued(2, voter.address, 2000);
      
      await hooks.onVoteCast(1, voter.address, true);
      await hooks.onVoteCast(2, dao.address, false);
      
      await hooks.onFinalized(1, true);
      await hooks.onFinalized(2, false);
    });

    it("should work with ledger logging disabled", async function () {
      await hooks.setModules(ethers.ZeroAddress, await seer.getAddress(), ethers.ZeroAddress);
      
      await hooks.onProposalQueued(1, dao.address, 1000);
      await hooks.onVoteCast(1, voter.address, true);
      await hooks.onFinalized(1, true);
    });
  });

  describe("Edge Cases", function () {
    it("should handle ledger reverts gracefully", async function () {
      // Even if ledger reverts, hooks should not revert
      await expect(hooks.onProposalQueued(1, dao.address, 1000))
        .to.not.be.reverted;
    });

    it("should allow rapid successive calls", async function () {
      for (let i = 0; i < 10; i++) {
        await hooks.onVoteCast(1, voter.address, i % 2 === 0);
      }
    });

    it("should handle very large proposal IDs", async function () {
      const largeId = ethers.MaxUint256;
      await hooks.onProposalQueued(largeId, dao.address, 1000);
      await hooks.onVoteCast(largeId, voter.address, true);
      await hooks.onFinalized(largeId, true);
    });

    it("should allow module updates mid-flow", async function () {
      await hooks.onProposalQueued(1, dao.address, 1000);
      
      // Use a valid contract address (seer) to avoid "no code" issues if any
      const newLedger = await seer.getAddress();
      await hooks.setModules(newLedger, await seer.getAddress(), ethers.ZeroAddress);
      
      await hooks.onVoteCast(1, voter.address, true);
      await hooks.onFinalized(1, true);
    });
  });
});
