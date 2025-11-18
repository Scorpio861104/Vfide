const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SystemHandover", function () {
  let handover, dao, timelock, seer, ledger, presale;
  let deployer, devMultisig, user;

  beforeEach(async function () {
    [deployer, devMultisig, user] = await ethers.getSigners();

    // Mock DAO
    const DAOMock = await ethers.getContractFactory("DAOMock");
    dao = await DAOMock.deploy();

    // Mock Timelock
    const TimelockMock = await ethers.getContractFactory("TimelockMock");
    timelock = await TimelockMock.deploy();

    // Mock Seer
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();

    // Mock Ledger
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    // Mock Presale
    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    presale = await PresaleMock.deploy();

    // Deploy SystemHandover
    const SystemHandover = await ethers.getContractFactory("SystemHandover");
    handover = await SystemHandover.deploy(
      devMultisig.address,
      await dao.getAddress(),
      await timelock.getAddress(),
      await seer.getAddress(),
      await ledger.getAddress()
    );
  });

  describe("Deployment", function () {
    it("should deploy with correct devMultisig", async function () {
      expect(await handover.devMultisig()).to.equal(devMultisig.address);
    });

    it("should deploy with correct DAO", async function () {
      expect(await handover.dao()).to.equal(await dao.getAddress());
    });

    it("should deploy with correct timelock", async function () {
      expect(await handover.timelock()).to.equal(await timelock.getAddress());
    });

    it("should deploy with correct seer", async function () {
      expect(await handover.seer()).to.equal(await seer.getAddress());
    });

    it("should deploy with correct ledger", async function () {
      expect(await handover.ledger()).to.equal(await ledger.getAddress());
    });

    it("should set minAvgCouncilScore from seer", async function () {
      expect(await handover.minAvgCouncilScore()).to.equal(600);
    });

    it("should set default monthsDelay to 180 days", async function () {
      expect(await handover.monthsDelay()).to.equal(180 * 24 * 60 * 60);
    });

    it("should set default maxExtensions to 1", async function () {
      expect(await handover.maxExtensions()).to.equal(1);
    });

    it("should set extensionSpan to 60 days", async function () {
      expect(await handover.extensionSpan()).to.equal(60 * 24 * 60 * 60);
    });

    it("should revert on zero dev address", async function () {
      const SystemHandover = await ethers.getContractFactory("SystemHandover");
      await expect(SystemHandover.deploy(
        ethers.ZeroAddress,
        await dao.getAddress(),
        await timelock.getAddress(),
        await seer.getAddress(),
        await ledger.getAddress()
      )).to.be.revertedWithCustomError(handover, "SH_Zero");
    });

    it("should revert on zero dao address", async function () {
      const SystemHandover = await ethers.getContractFactory("SystemHandover");
      await expect(SystemHandover.deploy(
        devMultisig.address,
        ethers.ZeroAddress,
        await timelock.getAddress(),
        await seer.getAddress(),
        await ledger.getAddress()
      )).to.be.revertedWithCustomError(handover, "SH_Zero");
    });

    it("should revert on zero timelock address", async function () {
      const SystemHandover = await ethers.getContractFactory("SystemHandover");
      await expect(SystemHandover.deploy(
        devMultisig.address,
        await dao.getAddress(),
        ethers.ZeroAddress,
        await seer.getAddress(),
        await ledger.getAddress()
      )).to.be.revertedWithCustomError(handover, "SH_Zero");
    });

    it("should revert on zero seer address", async function () {
      const SystemHandover = await ethers.getContractFactory("SystemHandover");
      await expect(SystemHandover.deploy(
        devMultisig.address,
        await dao.getAddress(),
        await timelock.getAddress(),
        ethers.ZeroAddress,
        await ledger.getAddress()
      )).to.be.revertedWithCustomError(handover, "SH_Zero");
    });

    it("should allow zero ledger address (optional)", async function () {
      const SystemHandover = await ethers.getContractFactory("SystemHandover");
      const h = await SystemHandover.deploy(
        devMultisig.address,
        await dao.getAddress(),
        await timelock.getAddress(),
        await seer.getAddress(),
        ethers.ZeroAddress
      );
      expect(await h.ledger()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("armFromPresale", function () {
    it("should arm handover after presale starts", async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
      
      expect(await handover.start()).to.be.gt(0);
    });

    it("should calculate handoverAt correctly", async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
      
      const start = await handover.start();
      const handoverAt = await handover.handoverAt();
      const monthsDelay = await handover.monthsDelay();
      
      expect(handoverAt).to.equal(start + monthsDelay);
    });

    it("should emit Armed event", async function () {
      await presale.launch();
      
      const tx = await handover.armFromPresale(await presale.getAddress());
      const receipt = await tx.wait();
      
      await expect(tx).to.emit(handover, "Armed");
    });

    it("should be idempotent (can call multiple times)", async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
      
      const start1 = await handover.start();
      
      await handover.armFromPresale(await presale.getAddress());
      const start2 = await handover.start();
      
      expect(start1).to.equal(start2);
    });

    it("should revert if presale not started", async function () {
      await expect(handover.armFromPresale(await presale.getAddress()))
        .to.be.revertedWith("presale not started");
    });

    it("should allow anyone to arm", async function () {
      await presale.launch();
      await expect(handover.connect(user).armFromPresale(await presale.getAddress()))
        .to.not.be.reverted;
    });

    it("should log to ledger", async function () {
      await presale.launch();
      await expect(handover.armFromPresale(await presale.getAddress()))
        .to.emit(ledger, "LogSystem");
    });
  });

  describe("setParams", function () {
    it("should allow dev to update monthsDelay", async function () {
      const newDelay = 200 * 24 * 60 * 60; // 200 days
      await handover.connect(devMultisig).setParams(newDelay, 600, 1, 60 * 24 * 60 * 60);
      expect(await handover.monthsDelay()).to.equal(newDelay);
    });

    it("should allow dev to update minAvgCouncilScore", async function () {
      await handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 700, 1, 60 * 24 * 60 * 60);
      expect(await handover.minAvgCouncilScore()).to.equal(700);
    });

    it("should allow dev to update maxExtensions", async function () {
      await handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 600, 2, 60 * 24 * 60 * 60);
      expect(await handover.maxExtensions()).to.equal(2);
    });

    it("should allow dev to update extensionSpan", async function () {
      const newSpan = 90 * 24 * 60 * 60; // 90 days
      await handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 600, 1, newSpan);
      expect(await handover.extensionSpan()).to.equal(newSpan);
    });

    it("should enforce minimum monthsDelay of 90 days", async function () {
      const tooShort = 30 * 24 * 60 * 60; // 30 days
      await handover.connect(devMultisig).setParams(tooShort, 600, 1, 60 * 24 * 60 * 60);
      expect(await handover.monthsDelay()).to.equal(90 * 24 * 60 * 60);
    });

    it("should update handoverAt if already armed", async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
      
      const newDelay = 200 * 24 * 60 * 60;
      await handover.connect(devMultisig).setParams(newDelay, 600, 1, 60 * 24 * 60 * 60);
      
      const start = await handover.start();
      const handoverAt = await handover.handoverAt();
      expect(handoverAt).to.equal(start + BigInt(newDelay));
    });

    it("should emit ParamsSet event", async function () {
      await expect(handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 700, 2, 90 * 24 * 60 * 60))
        .to.emit(handover, "ParamsSet")
        .withArgs(180 * 24 * 60 * 60, 700, 2, 90 * 24 * 60 * 60);
    });

    it("should revert if non-dev tries to set params", async function () {
      await expect(handover.connect(user).setParams(180 * 24 * 60 * 60, 600, 1, 60 * 24 * 60 * 60))
        .to.be.revertedWithCustomError(handover, "SH_NotDev");
    });

    it("should log to ledger", async function () {
      await expect(handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 600, 1, 60 * 24 * 60 * 60))
        .to.emit(ledger, "LogSystem");
    });
  });

  describe("extendOnceIfNeeded", function () {
    beforeEach(async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
    });

    it("should extend if network score is below threshold", async function () {
      const handoverBefore = await handover.handoverAt();
      await handover.connect(devMultisig).extendOnceIfNeeded(500); // Below 600
      const handoverAfter = await handover.handoverAt();
      
      expect(handoverAfter).to.be.gt(handoverBefore);
    });

    it("should add extensionSpan to handoverAt", async function () {
      const handoverBefore = await handover.handoverAt();
      const extensionSpan = await handover.extensionSpan();
      
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      const handoverAfter = await handover.handoverAt();
      
      expect(handoverAfter).to.equal(handoverBefore + extensionSpan);
    });

    it("should increment extensionsUsed", async function () {
      expect(await handover.extensionsUsed()).to.equal(0);
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      expect(await handover.extensionsUsed()).to.equal(1);
    });

    it("should not extend if network score is at threshold", async function () {
      const handoverBefore = await handover.handoverAt();
      await handover.connect(devMultisig).extendOnceIfNeeded(600); // At 600
      const handoverAfter = await handover.handoverAt();
      
      expect(handoverAfter).to.equal(handoverBefore);
    });

    it("should not extend if network score is above threshold", async function () {
      const handoverBefore = await handover.handoverAt();
      await handover.connect(devMultisig).extendOnceIfNeeded(700); // Above 600
      const handoverAfter = await handover.handoverAt();
      
      expect(handoverAfter).to.equal(handoverBefore);
    });

    it("should revert if max extensions reached", async function () {
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      await expect(handover.connect(devMultisig).extendOnceIfNeeded(500))
        .to.be.revertedWith("no_ext_left");
    });

    it("should revert if non-dev tries to extend", async function () {
      await expect(handover.connect(user).extendOnceIfNeeded(500))
        .to.be.revertedWithCustomError(handover, "SH_NotDev");
    });

    it("should log to ledger when extended", async function () {
      await expect(handover.connect(devMultisig).extendOnceIfNeeded(500))
        .to.emit(ledger, "LogSystem");
    });

    it("should allow extension with maxExtensions = 2", async function () {
      await handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 600, 2, 60 * 24 * 60 * 60);
      
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      expect(await handover.extensionsUsed()).to.equal(1);
      
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      expect(await handover.extensionsUsed()).to.equal(2);
    });
  });

  describe("executeHandover", function () {
    beforeEach(async function () {
      await presale.launch();
      await handover.armFromPresale(await presale.getAddress());
    });

    it("should execute handover after deadline", async function () {
      // Fast forward past handoverAt
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.not.be.reverted;
    });

    it("should call dao.setAdmin", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.emit(dao, "AdminSet")
        .withArgs(await dao.getAddress());
    });

    it("should call timelock.setAdmin with DAO address", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.emit(timelock, "AdminSet")
        .withArgs(await dao.getAddress());
    });

    it("should emit Executed event", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.emit(handover, "Executed")
        .withArgs(await dao.getAddress(), await timelock.getAddress(), await dao.getAddress(), 0);
    });

    it("should use DAO address if newAdmin is zero", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(ethers.ZeroAddress))
        .to.emit(dao, "AdminSet")
        .withArgs(await dao.getAddress());
    });

    it("should revert if executed too early", async function () {
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.be.revertedWithCustomError(handover, "SH_TooEarly");
    });

    it("should revert if non-dev tries to execute", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(user).executeHandover(await dao.getAddress()))
        .to.be.revertedWithCustomError(handover, "SH_NotDev");
    });

    it("should include extensionsUsed in event", async function () {
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.emit(handover, "Executed")
        .withArgs(await dao.getAddress(), await timelock.getAddress(), await dao.getAddress(), 1);
    });

    it("should log to ledger", async function () {
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(handover.connect(devMultisig).executeHandover(await dao.getAddress()))
        .to.emit(ledger, "LogSystem");
    });
  });

  describe("setLedger", function () {
    it("should allow dev to update ledger", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      await handover.connect(devMultisig).setLedger(newLedger);
      expect(await handover.ledger()).to.equal(newLedger);
    });

    it("should emit LedgerSet event", async function () {
      const newLedger = ethers.Wallet.createRandom().address;
      await expect(handover.connect(devMultisig).setLedger(newLedger))
        .to.emit(handover, "LedgerSet")
        .withArgs(newLedger);
    });

    it("should allow setting to zero address", async function () {
      await handover.connect(devMultisig).setLedger(ethers.ZeroAddress);
      expect(await handover.ledger()).to.equal(ethers.ZeroAddress);
    });

    it("should revert if non-dev tries to set ledger", async function () {
      await expect(handover.connect(user).setLedger(ethers.Wallet.createRandom().address))
        .to.be.revertedWithCustomError(handover, "SH_NotDev");
    });
  });

  describe("Complete Handover Flow", function () {
    it("should execute full handover lifecycle", async function () {
      // 1. Presale launches
      await presale.launch();
      
      // 2. Arm handover
      await handover.armFromPresale(await presale.getAddress());
      expect(await handover.start()).to.be.gt(0);
      
      // 3. Update params
      await handover.connect(devMultisig).setParams(180 * 24 * 60 * 60, 600, 1, 60 * 24 * 60 * 60);
      
      // 4. Extend if needed
      await handover.connect(devMultisig).extendOnceIfNeeded(500);
      expect(await handover.extensionsUsed()).to.equal(1);
      
      // 5. Wait for deadline
      const handoverAt = await handover.handoverAt();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(handoverAt) + 1]);
      await ethers.provider.send("evm_mine");
      
      // 6. Execute handover
      await handover.connect(devMultisig).executeHandover(await dao.getAddress());
    });
  });
});
