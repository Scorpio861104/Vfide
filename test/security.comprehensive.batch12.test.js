const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("security.comprehensive.batch12", function () {
    let owner, dao, vault1, guardian1, guardian2, registry, guardianLock, panicGuard, breaker, securityHub, ledger;

    beforeEach(async function () {
        [owner, dao, vault1, guardian1, guardian2] = await ethers.getSigners();
        
        // Deploy ProofLedger mock
        const Ledger = await ethers.getContractFactory("LedgerMock");
        ledger = await Ledger.deploy(false);
        
        // Deploy GuardianRegistry
        const Registry = await ethers.getContractFactory("GuardianRegistry");
        registry = await Registry.deploy(dao.address);
        
        // Deploy GuardianLock
        const Lock = await ethers.getContractFactory("GuardianLock");
        guardianLock = await Lock.deploy(dao.address, registry.target, ledger.target);
        
        // Deploy PanicGuard
        const Panic = await ethers.getContractFactory("PanicGuard");
        panicGuard = await Panic.deploy(dao.address, ledger.target, ethers.ZeroAddress);
        
        // Deploy EmergencyBreaker
        const Breaker = await ethers.getContractFactory("EmergencyBreaker");
        breaker = await Breaker.deploy(dao.address, ledger.target);
        
        // Deploy SecurityHub
        const Hub = await ethers.getContractFactory("SecurityHub");
        securityHub = await Hub.deploy(dao.address, guardianLock.target, panicGuard.target, breaker.target, ledger.target);
    });

    it("should add guardians to vault - batch 12", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        expect(await registry.isGuardian(vault1.address, guardian1.address)).to.be.true;
        expect(await registry.guardianCount(vault1.address)).to.equal(1);
    });

    it("should prevent duplicate guardians", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        await expect(registry.connect(dao).addGuardian(vault1.address, guardian1.address))
            .to.be.revertedWithCustomError(registry, "SEC_AlreadyMember");
    });

    it("should remove guardians", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        await registry.connect(dao).removeGuardian(vault1.address, guardian1.address);
        expect(await registry.isGuardian(vault1.address, guardian1.address)).to.be.false;
        expect(await registry.guardianCount(vault1.address)).to.equal(0);
    });

    it("should check SecurityHub lock status", async function () {
        expect(await securityHub.isLocked(vault1.address)).to.be.false;
    });
});
