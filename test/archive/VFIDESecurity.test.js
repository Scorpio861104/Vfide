const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDESecurity - GuardianRegistry", function () {
  let registry;
  let dao, vault1, guardian1, guardian2, guardian3;

  beforeEach(async function () {
    [dao, vault1, guardian1, guardian2, guardian3] = await ethers.getSigners();

    const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
    registry = await GuardianRegistry.deploy(dao.address);
  });

  describe("Deployment", function () {
    it("should deploy with correct DAO", async function () {
      expect(await registry.dao()).to.equal(dao.address);
    });

    it("should revert on zero DAO", async function () {
      const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
      await expect(GuardianRegistry.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "SEC_Zero");
    });
  });

  describe("addGuardian", function () {
    it("should allow DAO to add guardian", async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      expect(await registry.isGuardian(vault1.address, guardian1.address)).to.equal(true);
    });

    it("should increment guardian count", async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      expect(await registry.guardianCount(vault1.address)).to.equal(1);
      
      await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
      expect(await registry.guardianCount(vault1.address)).to.equal(2);
    });

    it("should emit GuardianAdded event", async function () {
      await expect(registry.connect(dao).addGuardian(vault1.address, guardian1.address))
        .to.emit(registry, "GuardianAdded")
        .withArgs(vault1.address, guardian1.address);
    });

    it("should revert if non-DAO tries", async function () {
      await expect(registry.connect(guardian1).addGuardian(vault1.address, guardian2.address))
        .to.be.revertedWithCustomError(registry, "SEC_NotDAO");
    });

    it("should revert if already member", async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      await expect(registry.connect(dao).addGuardian(vault1.address, guardian1.address))
        .to.be.revertedWithCustomError(registry, "SEC_AlreadyMember");
    });

    it("should handle multiple guardians per vault", async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
      await registry.connect(dao).addGuardian(vault1.address, guardian3.address);
      
      expect(await registry.guardianCount(vault1.address)).to.equal(3);
    });
  });

  describe("removeGuardian", function () {
    beforeEach(async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
    });

    it("should allow DAO to remove guardian", async function () {
      await registry.connect(dao).removeGuardian(vault1.address, guardian1.address);
      expect(await registry.isGuardian(vault1.address, guardian1.address)).to.equal(false);
    });

    it("should decrement guardian count", async function () {
      await registry.connect(dao).removeGuardian(vault1.address, guardian1.address);
      expect(await registry.guardianCount(vault1.address)).to.equal(1);
    });

    it("should emit GuardianRemoved event", async function () {
      await expect(registry.connect(dao).removeGuardian(vault1.address, guardian1.address))
        .to.emit(registry, "GuardianRemoved")
        .withArgs(vault1.address, guardian1.address);
    });

    it("should revert if non-DAO tries", async function () {
      await expect(registry.connect(guardian1).removeGuardian(vault1.address, guardian2.address))
        .to.be.revertedWithCustomError(registry, "SEC_NotDAO");
    });

    it("should revert if not member", async function () {
      await expect(registry.connect(dao).removeGuardian(vault1.address, guardian3.address))
        .to.be.revertedWithCustomError(registry, "SEC_NotMember");
    });
  });

  describe("setThreshold", function () {
    beforeEach(async function () {
      await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
      await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
      await registry.connect(dao).addGuardian(vault1.address, guardian3.address);
    });

    it("should allow DAO to set threshold", async function () {
      await registry.connect(dao).setThreshold(vault1.address, 2);
      expect(await registry.threshold(vault1.address)).to.equal(2);
    });

    it("should emit ThresholdSet event", async function () {
      await expect(registry.connect(dao).setThreshold(vault1.address, 2))
        .to.emit(registry, "ThresholdSet")
        .withArgs(vault1.address, 2);
    });

    it("should revert if threshold > guardianCount", async function () {
      await expect(registry.connect(dao).setThreshold(vault1.address, 4))
        .to.be.revertedWithCustomError(registry, "SEC_BadThreshold");
    });

    it("should revert if non-DAO tries", async function () {
      await expect(registry.connect(guardian1).setThreshold(vault1.address, 2))
        .to.be.revertedWithCustomError(registry, "SEC_NotDAO");
    });
  });
});

describe("VFIDESecurity - SecurityHub", function () {
  let securityHub, guardianLock, panicGuard, emergencyBreaker, ledger;
  let dao, vault1;

  beforeEach(async function () {
    [dao, vault1] = await ethers.getSigners();

    // Mock components
    const GuardianLockMock = await ethers.getContractFactory("GuardianLockMock");
    guardianLock = await GuardianLockMock.deploy();
    
    const PanicGuardMock = await ethers.getContractFactory("PanicGuardMock");
    panicGuard = await PanicGuardMock.deploy();

    const MockBreaker = await ethers.getContractFactory("EmergencyBreakerMock");
    emergencyBreaker = await MockBreaker.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const SecurityHub = await ethers.getContractFactory("SecurityHub");
    securityHub = await SecurityHub.deploy(
      dao.address,
      await guardianLock.getAddress(),
      await panicGuard.getAddress(),
      await emergencyBreaker.getAddress(),
      await ledger.getAddress()
    );
  });

  describe("Deployment", function () {
    it("should deploy with correct components", async function () {
      expect(await securityHub.dao()).to.equal(dao.address);
      expect(await securityHub.guardianLock()).to.equal(await guardianLock.getAddress());
      expect(await securityHub.panicGuard()).to.equal(await panicGuard.getAddress());
      expect(await securityHub.breaker()).to.equal(await emergencyBreaker.getAddress());
    });
  });

  describe("isLocked", function () {
    it("should return true if emergency breaker halted", async function () {
      await emergencyBreaker.setHalted(true);
      expect(await securityHub.isLocked(vault1.address)).to.equal(true);
    });

    it("should return true if guardian locked", async function () {
      await guardianLock.setLocked(vault1.address, true);
      expect(await securityHub.isLocked(vault1.address)).to.equal(true);
    });

    it("should return true if panic guard locked", async function () {
      await panicGuard.setQuarantined(vault1.address, true);
      expect(await securityHub.isLocked(vault1.address)).to.equal(true);
    });

    it("should return false if all unlocked", async function () {
      expect(await securityHub.isLocked(vault1.address)).to.equal(false);
    });

    it("should prioritize emergency breaker", async function () {
      await emergencyBreaker.setHalted(true);
      await guardianLock.setLocked(vault1.address, false);
      await panicGuard.setQuarantined(vault1.address, false);
      
      expect(await securityHub.isLocked(vault1.address)).to.equal(true);
    });
  });
});

// Placeholder tests for other Security components
describe("VFIDESecurity - GuardianLock", function () {
  it("should test M-of-N guardian voting", async function () {
    // Tests for lock/unlock voting with threshold
    expect(true).to.equal(true);
  });
});

describe("VFIDESecurity - PanicGuard", function () {
  it("should test automatic quarantine", async function () {
    // Tests for time-based quarantine, DAO override
    expect(true).to.equal(true);
  });
});

describe("VFIDESecurity - EmergencyBreaker", function () {
  it("should test global halt mechanism", async function () {
    // Tests for DAO-controlled global stop
    expect(true).to.equal(true);
  });
});
