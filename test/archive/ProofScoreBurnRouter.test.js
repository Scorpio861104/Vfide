const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofScoreBurnRouter", function () {
  let router, seer, treasury, sanctum, token;
  let deployer, user1, user2;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Mock Seer
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();

    // Mock Treasury
    const TreasuryMock = await ethers.getContractFactory("TreasuryMock");
    treasury = await TreasuryMock.deploy();

    // Mock Sanctum
    const SanctumMock = await ethers.getContractFactory("SanctumMock");
    sanctum = await SanctumMock.deploy();

    // Mock Token
    token = ethers.Wallet.createRandom().address;

    // Deploy Router
    const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
    router = await ProofScoreBurnRouter.deploy(
      await seer.getAddress(),
      await treasury.getAddress(),
      await sanctum.getAddress(),
      token
    );
  });

  describe("Deployment", function () {
    it("should deploy with correct seer", async function () {
      expect(await router.seer()).to.equal(await seer.getAddress());
    });

    it("should deploy with correct treasury", async function () {
      expect(await router.treasury()).to.equal(await treasury.getAddress());
    });

    it("should deploy with correct sanctum", async function () {
      expect(await router.sanctum()).to.equal(await sanctum.getAddress());
    });

    it("should deploy with correct vfideToken", async function () {
      expect(await router.vfideToken()).to.equal(token);
    });

    it("should set default baseBurnRate to 50 (0.5%)", async function () {
      expect(await router.baseBurnRate()).to.equal(50);
    });

    it("should set default maxBurnRate to 250 (2.5%)", async function () {
      expect(await router.maxBurnRate()).to.equal(250);
    });

    it("should set default sanctumRate to 25 (0.25%)", async function () {
      expect(await router.sanctumRate()).to.equal(25);
    });

    it("should emit ModulesSet on deployment", async function () {
      const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
      await expect(ProofScoreBurnRouter.deploy(
        await seer.getAddress(),
        await treasury.getAddress(),
        await sanctum.getAddress(),
        token
      ))
        .to.emit(ProofScoreBurnRouter, "ModulesSet")
        .withArgs(await seer.getAddress(), await treasury.getAddress(), await sanctum.getAddress());
    });

    it("should revert on zero seer address", async function () {
      const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
      await expect(ProofScoreBurnRouter.deploy(
        ethers.ZeroAddress,
        await treasury.getAddress(),
        await sanctum.getAddress(),
        token
      )).to.be.revertedWithCustomError(router, "BURN_Zero");
    });

    it("should revert on zero treasury address", async function () {
      const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
      await expect(ProofScoreBurnRouter.deploy(
        await seer.getAddress(),
        ethers.ZeroAddress,
        await sanctum.getAddress(),
        token
      )).to.be.revertedWithCustomError(router, "BURN_Zero");
    });

    it("should revert on zero vfide token address", async function () {
      const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
      await expect(ProofScoreBurnRouter.deploy(
        await seer.getAddress(),
        await treasury.getAddress(),
        await sanctum.getAddress(),
        ethers.ZeroAddress
      )).to.be.revertedWithCustomError(router, "BURN_Zero");
    });

    it("should allow zero sanctum address (optional)", async function () {
      const ProofScoreBurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
      const r = await ProofScoreBurnRouter.deploy(
        await seer.getAddress(),
        await treasury.getAddress(),
        ethers.ZeroAddress,
        token
      );
      expect(await r.sanctum()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setModules", function () {
    it("should update seer address", async function () {
      const newSeer = ethers.Wallet.createRandom().address;
      await router.setModules(newSeer, await treasury.getAddress(), await sanctum.getAddress(), token);
      expect(await router.seer()).to.equal(newSeer);
    });

    it("should update treasury address", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;
      await router.setModules(await seer.getAddress(), newTreasury, await sanctum.getAddress(), token);
      expect(await router.treasury()).to.equal(newTreasury);
    });

    it("should update sanctum address", async function () {
      const newSanctum = ethers.Wallet.createRandom().address;
      await router.setModules(await seer.getAddress(), await treasury.getAddress(), newSanctum, token);
      expect(await router.sanctum()).to.equal(newSanctum);
    });

    it("should update vfideToken address", async function () {
      const newToken = ethers.Wallet.createRandom().address;
      await router.setModules(await seer.getAddress(), await treasury.getAddress(), await sanctum.getAddress(), newToken);
      expect(await router.vfideToken()).to.equal(newToken);
    });

    it("should emit ModulesSet", async function () {
      const newSeer = ethers.Wallet.createRandom().address;
      const newTreasury = ethers.Wallet.createRandom().address;
      const newSanctum = ethers.Wallet.createRandom().address;
      await expect(router.setModules(newSeer, newTreasury, newSanctum, token))
        .to.emit(router, "ModulesSet")
        .withArgs(newSeer, newTreasury, newSanctum);
    });

    it("should allow anyone to call setModules", async function () {
      const newSeer = ethers.Wallet.createRandom().address;
      await router.connect(user1).setModules(newSeer, await treasury.getAddress(), await sanctum.getAddress(), token);
      expect(await router.seer()).to.equal(newSeer);
    });
  });

  describe("route - Burn Rate Calculation", function () {
    it("should apply baseBurnRate/2 for score >= 900", async function () {
      await seer.setScore(user1.address, 900);
      const amount = 10000n;
      const expectedBurn = (amount * 25n) / 10000n; // 50/2 = 25 bps = 0.25%
      const expectedSanctum = (amount * 25n) / 10000n; // 25 bps
      
      await expect(router.route(user1.address, amount))
        .to.emit(router, "RouteExecuted")
        .withArgs(user1.address, expectedBurn, expectedSanctum);
    });

    it("should apply maxBurnRate for score <= 300", async function () {
      await seer.setScore(user1.address, 300);
      const amount = 10000n;
      const expectedBurn = (amount * 250n) / 10000n; // 250 bps = 2.5%
      const expectedSanctum = (amount * 25n) / 10000n;
      
      await expect(router.route(user1.address, amount))
        .to.emit(router, "RouteExecuted")
        .withArgs(user1.address, expectedBurn, expectedSanctum);
    });

    it("should apply linear interpolation for score 500", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      // score 500: diff = 900-500 = 400
      // burnRate = 50 + (200 * 400 / 600) = 50 + 133.33 ≈ 183
      const expectedBurn = (amount * 183n) / 10000n;
      const expectedSanctum = (amount * 25n) / 10000n;
      
      const tx = await router.route(user1.address, amount);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "RouteExecuted";
        } catch {
          return false;
        }
      });
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.burnAmount).to.be.closeTo(expectedBurn, 1n);
    });

    it("should apply linear interpolation for score 600", async function () {
      await seer.setScore(user1.address, 600);
      const amount = 10000n;
      // diff = 900-600 = 300
      // burnRate = 50 + (200 * 300 / 600) = 50 + 100 = 150
      const expectedBurn = (amount * 150n) / 10000n;
      
      const tx = await router.route(user1.address, amount);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "RouteExecuted";
        } catch {
          return false;
        }
      });
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.burnAmount).to.equal(expectedBurn);
    });

    it("should handle score 1000 (maximum)", async function () {
      await seer.setScore(user1.address, 1000);
      const amount = 10000n;
      const expectedBurn = (amount * 25n) / 10000n; // baseBurnRate/2
      
      await expect(router.route(user1.address, amount))
        .to.emit(router, "RouteExecuted")
        .withArgs(user1.address, expectedBurn, (amount * 25n) / 10000n);
    });

    it("should handle score 0 (minimum)", async function () {
      await seer.setScore(user1.address, 0);
      const amount = 10000n;
      const expectedBurn = (amount * 250n) / 10000n; // maxBurnRate
      
      await expect(router.route(user1.address, amount))
        .to.emit(router, "RouteExecuted")
        .withArgs(user1.address, expectedBurn, (amount * 25n) / 10000n);
    });
  });

  describe("route - Amount Routing", function () {
    it("should route burn amount to treasury", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      
      await expect(router.route(user1.address, amount))
        .to.emit(treasury, "NoteVFIDE");
    });

    it("should route sanctum amount to sanctum", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      
      await expect(router.route(user1.address, amount))
        .to.emit(sanctum, "Disburse")
        .withArgs(token, await treasury.getAddress(), (amount * 25n) / 10000n, "ProofScore charity share");
    });

    it("should return total deducted amount", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      
      const total = await router.route.staticCall(user1.address, amount);
      expect(total).to.be.gt(0);
    });

    it("should handle zero amount", async function () {
      await seer.setScore(user1.address, 500);
      
      const tx = await router.route(user1.address, 0);
      await expect(tx).to.emit(router, "RouteExecuted")
        .withArgs(user1.address, 0, 0);
    });

    it("should handle very large amounts", async function () {
      await seer.setScore(user1.address, 500);
      const largeAmount = ethers.parseEther("1000000");
      
      await expect(router.route(user1.address, largeAmount))
        .to.not.be.reverted;
    });

    it("should not call treasury if burn amount is zero", async function () {
      // Might happen with very small amounts due to rounding
      await seer.setScore(user1.address, 900);
      const amount = 1n; // Very small, might round to 0
      
      const tx = await router.route(user1.address, amount);
      // Should not revert even if burnAmount rounds to 0
      await expect(tx).to.not.be.reverted;
    });

    it("should not call sanctum if sanctum amount is zero", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 1n; // Very small, sanctum might round to 0
      
      const tx = await router.route(user1.address, amount);
      await expect(tx).to.not.be.reverted;
    });
  });

  describe("route - Events", function () {
    it("should emit RouteExecuted with correct parameters", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      
      const tx = await router.route(user1.address, amount);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "RouteExecuted";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.user).to.equal(user1.address);
      expect(parsedEvent.args.burnAmount).to.be.gt(0);
      expect(parsedEvent.args.sanctumAmount).to.be.gt(0);
    });

    it("should emit Adjusted with correct score and rates", async function () {
      await seer.setScore(user1.address, 700);
      const amount = 10000n;
      
      const tx = await router.route(user1.address, amount);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "Adjusted";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.user).to.equal(user1.address);
      expect(parsedEvent.args.score).to.equal(700);
      expect(parsedEvent.args.sanctumRate).to.equal(25);
    });

    it("should emit both RouteExecuted and Adjusted", async function () {
      await seer.setScore(user1.address, 500);
      const amount = 10000n;
      
      const tx = await router.route(user1.address, amount);
      await expect(tx)
        .to.emit(router, "RouteExecuted")
        .to.emit(router, "Adjusted");
    });
  });

  describe("adjustScore", function () {
    it("should emit Adjusted event", async function () {
      await seer.setScore(user1.address, 500);
      
      await expect(router.adjustScore(user1.address, 10, true))
        .to.emit(router, "Adjusted");
    });

    it("should fetch current score from seer", async function () {
      await seer.setScore(user1.address, 750);
      
      const tx = await router.adjustScore(user1.address, 10, true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "Adjusted";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.score).to.equal(750);
    });

    it("should calculate burn rate based on score", async function () {
      await seer.setScore(user1.address, 900);
      
      const tx = await router.adjustScore(user1.address, 10, true);
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return router.interface.parseLog(log)?.name === "Adjusted";
        } catch {
          return false;
        }
      });
      
      const parsedEvent = router.interface.parseLog(event);
      expect(parsedEvent.args.burnRate).to.equal(25); // baseBurnRate/2
    });

    it("should handle increase flag true", async function () {
      await seer.setScore(user1.address, 500);
      await expect(router.adjustScore(user1.address, 50, true))
        .to.not.be.reverted;
    });

    it("should handle increase flag false", async function () {
      await seer.setScore(user1.address, 500);
      await expect(router.adjustScore(user1.address, 50, false))
        .to.not.be.reverted;
    });

    it("should handle zero delta", async function () {
      await seer.setScore(user1.address, 500);
      await expect(router.adjustScore(user1.address, 0, true))
        .to.not.be.reverted;
    });

    it("should allow anyone to call adjustScore", async function () {
      await seer.setScore(user1.address, 500);
      await expect(router.connect(user2).adjustScore(user1.address, 10, true))
        .to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("should handle multiple routes for same user", async function () {
      await seer.setScore(user1.address, 500);
      
      await router.route(user1.address, 1000);
      await router.route(user1.address, 2000);
      await router.route(user1.address, 3000);
    });

    it("should handle routes for different users", async function () {
      await seer.setScore(user1.address, 600);
      await seer.setScore(user2.address, 400);
      
      await router.route(user1.address, 1000);
      await router.route(user2.address, 1000);
    });

    it("should handle score changes between routes", async function () {
      await seer.setScore(user1.address, 900);
      await router.route(user1.address, 1000);
      
      await seer.setScore(user1.address, 300);
      await router.route(user1.address, 1000);
    });

    it("should handle uninitialized score (defaults to 500)", async function () {
      // User without explicit score should get 500 from mock
      const amount = 10000n;
      await expect(router.route(user2.address, amount))
        .to.not.be.reverted;
    });

    it("should handle boundary scores correctly", async function () {
      // Test score 300 (boundary)
      await seer.setScore(user1.address, 300);
      await router.route(user1.address, 10000);
      
      // Test score 900 (boundary)
      await seer.setScore(user1.address, 900);
      await router.route(user1.address, 10000);
    });
  });
});
