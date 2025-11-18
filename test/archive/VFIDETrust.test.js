const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDETrust - Seer (ProofScore)", function () {
  let seer, ledger, vaultHub;
  let deployer, dao, user1, user2;

  beforeEach(async function () {
    [deployer, dao, user1, user2] = await ethers.getSigners();

    // Deploy ProofLedger
    const ProofLedger = await ethers.getContractFactory("contracts-min/VFIDETrust.sol:ProofLedger");
    ledger = await ProofLedger.deploy(dao.address);

    // Mock VaultHub
    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();

    // Deploy Seer
    const Seer = await ethers.getContractFactory("contracts-min/VFIDETrust.sol:Seer");
    seer = await Seer.deploy(dao.address, await ledger.getAddress(), await vaultHub.getAddress());
  });

  describe("Deployment", function () {
    it("should deploy with correct DAO", async function () {
      expect(await seer.dao()).to.equal(dao.address);
    });

    it("should deploy with correct ledger", async function () {
      expect(await seer.ledger()).to.equal(await ledger.getAddress());
    });

    it("should deploy with correct vaultHub", async function () {
      expect(await seer.vaultHub()).to.equal(await vaultHub.getAddress());
    });

    it("should set default thresholds", async function () {
      expect(await seer.lowTrustThreshold()).to.equal(350);
      expect(await seer.highTrustThreshold()).to.equal(700);
      expect(await seer.minForGovernance()).to.equal(540);
      expect(await seer.minForMerchant()).to.equal(560);
    });

    it("should set score constants", async function () {
      expect(await seer.MIN_SCORE()).to.equal(0);
      expect(await seer.MAX_SCORE()).to.equal(1000);
      expect(await seer.NEUTRAL()).to.equal(500);
    });

    it("should revert on zero DAO", async function () {
      const Seer = await ethers.getContractFactory("contracts-min/VFIDETrust.sol:Seer");
      await expect(Seer.deploy(ethers.ZeroAddress, await ledger.getAddress(), await vaultHub.getAddress()))
        .to.be.revertedWithCustomError(seer, "TRUST_Zero");
    });

    it("should allow zero ledger (optional)", async function () {
      const Seer = await ethers.getContractFactory("contracts-min/VFIDETrust.sol:Seer");
      const s = await Seer.deploy(dao.address, ethers.ZeroAddress, await vaultHub.getAddress());
      expect(await s.ledger()).to.equal(ethers.ZeroAddress);
    });

    it("should allow zero vaultHub (optional)", async function () {
      const Seer = await ethers.getContractFactory("contracts-min/VFIDETrust.sol:Seer");
      const s = await Seer.deploy(dao.address, await ledger.getAddress(), ethers.ZeroAddress);
      expect(await s.vaultHub()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("getScore", function () {
    it("should return 500 (NEUTRAL) for uninitialized users", async function () {
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should return set score for initialized users", async function () {
      await seer.connect(dao).setScore(user1.address, 750, "test");
      expect(await seer.getScore(user1.address)).to.equal(750);
    });

    it("should return 500 (NEUTRAL) if explicitly set to 0", async function () {
      await seer.connect(dao).setScore(user1.address, 0, "minimum");
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should return 1000 if set to maximum", async function () {
      await seer.connect(dao).setScore(user1.address, 1000, "maximum");
      expect(await seer.getScore(user1.address)).to.equal(1000);
    });

    it("should handle multiple users independently", async function () {
      await seer.connect(dao).setScore(user1.address, 600, "user1");
      await seer.connect(dao).setScore(user2.address, 400, "user2");
      
      expect(await seer.getScore(user1.address)).to.equal(600);
      expect(await seer.getScore(user2.address)).to.equal(400);
    });
  });

  describe("setScore", function () {
    it("should allow DAO to set score", async function () {
      await seer.connect(dao).setScore(user1.address, 750, "initial");
      expect(await seer.getScore(user1.address)).to.equal(750);
    });

    it("should emit ScoreSet event", async function () {
      await expect(seer.connect(dao).setScore(user1.address, 750, "test"))
        .to.emit(seer, "ScoreSet")
        .withArgs(user1.address, 500, 750, "test");
    });

    it("should emit event with old score", async function () {
      await seer.connect(dao).setScore(user1.address, 600, "first");
      await expect(seer.connect(dao).setScore(user1.address, 800, "second"))
        .to.emit(seer, "ScoreSet")
        .withArgs(user1.address, 600, 800, "second");
    });

    it("should revert if non-DAO tries to set", async function () {
      await expect(seer.connect(user1).setScore(user2.address, 750, "unauthorized"))
        .to.be.revertedWithCustomError(seer, "TRUST_NotDAO");
    });

    it("should revert on zero address", async function () {
      await expect(seer.connect(dao).setScore(ethers.ZeroAddress, 750, "zero"))
        .to.be.revertedWithCustomError(seer, "TRUST_Zero");
    });

    it("should revert on score > MAX_SCORE", async function () {
      await expect(seer.connect(dao).setScore(user1.address, 1001, "too high"))
        .to.be.revertedWithCustomError(seer, "TRUST_Bounds");
    });

    it("should allow setting score to 0 (returns NEUTRAL)", async function () {
      await seer.connect(dao).setScore(user1.address, 0, "test");
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should allow setting score to 1000", async function () {
      await seer.connect(dao).setScore(user1.address, 1000, "maximum");
      expect(await seer.getScore(user1.address)).to.equal(1000);
    });

    it("should overwrite previous scores", async function () {
      await seer.connect(dao).setScore(user1.address, 600, "first");
      await seer.connect(dao).setScore(user1.address, 700, "second");
      await seer.connect(dao).setScore(user1.address, 800, "third");
      expect(await seer.getScore(user1.address)).to.equal(800);
    });
  });

  describe("reward", function () {
    it("should increase score", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await seer.connect(dao).reward(user1.address, 100, "good behavior");
      expect(await seer.getScore(user1.address)).to.equal(600);
    });

    it("should emit ScoreSet event", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await expect(seer.connect(dao).reward(user1.address, 100, "reward"))
        .to.emit(seer, "ScoreSet")
        .withArgs(user1.address, 500, 600, "reward");
    });

    it("should cap at MAX_SCORE", async function () {
      await seer.connect(dao).setScore(user1.address, 950, "high");
      await seer.connect(dao).reward(user1.address, 100, "overflow");
      expect(await seer.getScore(user1.address)).to.equal(1000);
    });

    it("should handle reward from uninitialized (500)", async function () {
      await seer.connect(dao).reward(user1.address, 100, "first reward");
      expect(await seer.getScore(user1.address)).to.equal(600);
    });

    it("should revert if non-DAO tries", async function () {
      await expect(seer.connect(user1).reward(user2.address, 100, "unauthorized"))
        .to.be.revertedWithCustomError(seer, "TRUST_NotDAO");
    });

    it("should handle zero delta", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await seer.connect(dao).reward(user1.address, 0, "no change");
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should handle very large delta", async function () {
      await seer.connect(dao).setScore(user1.address, 100, "low");
      await seer.connect(dao).reward(user1.address, 5000, "huge reward");
      expect(await seer.getScore(user1.address)).to.equal(1000); // Capped
    });
  });

  describe("punish", function () {
    it("should decrease score", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await seer.connect(dao).punish(user1.address, 100, "bad behavior");
      expect(await seer.getScore(user1.address)).to.equal(400);
    });

    it("should emit ScoreSet event", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await expect(seer.connect(dao).punish(user1.address, 100, "punish"))
        .to.emit(seer, "ScoreSet")
        .withArgs(user1.address, 500, 400, "punish");
    });

    it("should floor at MIN_SCORE (0, displayed as NEUTRAL)", async function () {
      await seer.connect(dao).setScore(user1.address, 100, "low");
      await seer.connect(dao).punish(user1.address, 200, "big punish");
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should handle punish from uninitialized (500)", async function () {
      await seer.connect(dao).punish(user1.address, 100, "first punish");
      expect(await seer.getScore(user1.address)).to.equal(400);
    });

    it("should revert if non-DAO tries", async function () {
      await expect(seer.connect(user1).punish(user2.address, 100, "unauthorized"))
        .to.be.revertedWithCustomError(seer, "TRUST_NotDAO");
    });

    it("should handle zero delta", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "initial");
      await seer.connect(dao).punish(user1.address, 0, "no change");
      expect(await seer.getScore(user1.address)).to.equal(500);
    });

    it("should handle very large delta", async function () {
      await seer.connect(dao).setScore(user1.address, 900, "high");
      await seer.connect(dao).punish(user1.address, 5000, "huge punishment");
      expect(await seer.getScore(user1.address)).to.equal(500); // Floored at NEUTRAL
    });
  });

  describe("setThresholds", function () {
    it("should allow DAO to update thresholds", async function () {
      await seer.connect(dao).setThresholds(300, 750, 600, 650);
      expect(await seer.lowTrustThreshold()).to.equal(300);
      expect(await seer.highTrustThreshold()).to.equal(750);
      expect(await seer.minForGovernance()).to.equal(600);
      expect(await seer.minForMerchant()).to.equal(650);
    });

    it("should emit ThresholdsSet event", async function () {
      await expect(seer.connect(dao).setThresholds(300, 750, 600, 650))
        .to.emit(seer, "ThresholdsSet")
        .withArgs(300, 750, 600, 650);
    });

    it("should revert if low > high", async function () {
      await expect(seer.connect(dao).setThresholds(800, 700, 600, 650))
        .to.be.revertedWithCustomError(seer, "TRUST_Bounds");
    });

    it("should revert if high > MAX_SCORE", async function () {
      await expect(seer.connect(dao).setThresholds(300, 1001, 600, 650))
        .to.be.revertedWithCustomError(seer, "TRUST_Bounds");
    });

    it("should revert if non-DAO tries", async function () {
      await expect(seer.connect(user1).setThresholds(300, 750, 600, 650))
        .to.be.revertedWithCustomError(seer, "TRUST_NotDAO");
    });

    it("should allow low = high", async function () {
      await seer.connect(dao).setThresholds(500, 500, 600, 650);
      expect(await seer.lowTrustThreshold()).to.equal(500);
      expect(await seer.highTrustThreshold()).to.equal(500);
    });

    it("should allow high = MAX_SCORE", async function () {
      await seer.connect(dao).setThresholds(300, 1000, 600, 650);
      expect(await seer.highTrustThreshold()).to.equal(1000);
    });

    it("should allow low = MIN_SCORE (0)", async function () {
      await seer.connect(dao).setThresholds(0, 700, 600, 650);
      expect(await seer.lowTrustThreshold()).to.equal(0);
    });
  });

  describe("setModules", function () {
    it("should allow DAO to update modules", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      await seer.connect(dao).setModules(newLedger, newHub);
      expect(await seer.ledger()).to.equal(newLedger);
      expect(await seer.vaultHub()).to.equal(newHub);
    });

    it("should emit LedgerSet event", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      await expect(seer.connect(dao).setModules(newLedger, newHub))
        .to.emit(seer, "LedgerSet")
        .withArgs(newLedger);
    });

    it("should emit HubSet event", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      await expect(seer.connect(dao).setModules(newLedger, newHub))
        .to.emit(seer, "HubSet")
        .withArgs(newHub);
    });

    it("should revert on zero ledger", async function () {
      const newHub = ethers.Wallet.createRandom().address;
      await expect(seer.connect(dao).setModules(ethers.ZeroAddress, newHub))
        .to.be.revertedWithCustomError(seer, "TRUST_Zero");
    });

    it("should revert on zero vaultHub", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      await expect(seer.connect(dao).setModules(newLedger, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(seer, "TRUST_Zero");
    });

    it("should revert if non-DAO tries", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      await expect(seer.connect(user1).setModules(newLedger, newHub))
        .to.be.revertedWithCustomError(seer, "TRUST_NotDAO");
    });
  });

  describe("Complex Score Management", function () {
    it("should handle multiple reward/punish cycles", async function () {
      await seer.connect(dao).setScore(user1.address, 500, "start");
      await seer.connect(dao).reward(user1.address, 50, "r1");
      expect(await seer.getScore(user1.address)).to.equal(550);
      await seer.connect(dao).punish(user1.address, 30, "p1");
      expect(await seer.getScore(user1.address)).to.equal(520);
      await seer.connect(dao).reward(user1.address, 80, "r2");
      expect(await seer.getScore(user1.address)).to.equal(600);
    });

    it("should handle score changes for multiple users", async function () {
      await seer.connect(dao).setScore(user1.address, 600, "u1");
      await seer.connect(dao).setScore(user2.address, 400, "u2");
      
      await seer.connect(dao).reward(user1.address, 100, "r1");
      await seer.connect(dao).punish(user2.address, 50, "p1");
      
      expect(await seer.getScore(user1.address)).to.equal(700);
      expect(await seer.getScore(user2.address)).to.equal(350);
    });

    it("should maintain independent scores", async function () {
      await seer.connect(dao).reward(user1.address, 100, "u1 reward");
      await seer.connect(dao).punish(user2.address, 100, "u2 punish");
      
      expect(await seer.getScore(user1.address)).to.equal(600);
      expect(await seer.getScore(user2.address)).to.equal(400);
    });
  });

  describe("Edge Cases", function () {
    it("should handle score at boundaries", async function () {
      await seer.connect(dao).setScore(user1.address, 0, "min");
      await seer.connect(dao).punish(user1.address, 100, "already min");
      expect(await seer.getScore(user1.address)).to.equal(400); // Punish from NEUTRAL (500) - 100 = 400
      
      await seer.connect(dao).setScore(user2.address, 1000, "max");
      await seer.connect(dao).reward(user2.address, 100, "already max");
      expect(await seer.getScore(user2.address)).to.equal(1000);
    });

    it("should handle alternating rewards and punishments", async function () {
      let score = 500;
      await seer.connect(dao).setScore(user1.address, score, "start");
      
      for (let i = 0; i < 5; i++) {
        await seer.connect(dao).reward(user1.address, 10, `r${i}`);
        score += 10;
        await seer.connect(dao).punish(user1.address, 5, `p${i}`);
        score -= 5;
      }
      
      expect(await seer.getScore(user1.address)).to.equal(score);
    });

    it("should handle setting same score multiple times", async function () {
      await seer.connect(dao).setScore(user1.address, 600, "first");
      await seer.connect(dao).setScore(user1.address, 600, "second");
      await seer.connect(dao).setScore(user1.address, 600, "third");
      expect(await seer.getScore(user1.address)).to.equal(600);
    });
  });
});
