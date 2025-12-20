const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("security.guardians.batch5", function () {
    let dao, vault1, guardian1, guardian2, guardian3, registry, guardianLock, securityHub, ledger;

    beforeEach(async function () {
        [dao, vault1, guardian1, guardian2, guardian3] = await ethers.getSigners();
        
        const Ledger = await ethers.getContractFactory("LedgerMock");
        ledger = await Ledger.deploy(false);
        
        const Registry = await ethers.getContractFactory("GuardianRegistry");
        registry = await Registry.deploy(dao.address);
        
        const Lock = await ethers.getContractFactory("GuardianLock");
        guardianLock = await Lock.deploy(dao.address, registry.target, ledger.target);
        
        const Panic = await ethers.getContractFactory("PanicGuard");
        const panicGuard = await Panic.deploy(dao.address, ledger.target, ethers.ZeroAddress);
        
        const Breaker = await ethers.getContractFactory("EmergencyBreaker");
        const breaker = await Breaker.deploy(dao.address, ledger.target);
        
        const Hub = await ethers.getContractFactory("SecurityHub");
        securityHub = await Hub.deploy(dao.address, guardianLock.target, panicGuard.target, breaker.target, ledger.target);
    });

    it("should add multiple guardians - batch 5", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
        await registry.connect(dao).addGuardian(vault1.address, guardian3.address);
        
        expect(await registry.guardianCount(vault1.address)).to.equal(3);
        expect(await registry.isGuardian(vault1.address, guardian1.address)).to.be.true;
        expect(await registry.isGuardian(vault1.address, guardian2.address)).to.be.true;
        expect(await registry.isGuardian(vault1.address, guardian3.address)).to.be.true;
    });

    it("should set threshold", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
        await registry.connect(dao).setThreshold(vault1.address, 2);
        
        expect(await registry.threshold(vault1.address)).to.equal(2);
    });

    it("should remove guardian and update count", async function () {
        await registry.connect(dao).addGuardian(vault1.address, guardian1.address);
        await registry.connect(dao).addGuardian(vault1.address, guardian2.address);
        
        await registry.connect(dao).removeGuardian(vault1.address, guardian1.address);
        
        expect(await registry.guardianCount(vault1.address)).to.equal(1);
        expect(await registry.isGuardian(vault1.address, guardian1.address)).to.be.false;
    });

    it("should enforce DAO-only guardian management", async function () {
        await expect(registry.connect(guardian1).addGuardian(vault1.address, guardian2.address))
            .to.be.revertedWithCustomError(registry, "SEC_NotDAO");
    });
});
