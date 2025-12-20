const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("registry.policy.batch6", function () {
    let owner, dao, merchant1, merchant2, merchant3, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, merchant1, merchant2, merchant3] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, merchant1, merchant2, merchant3));
    });

    it("should enforce policy thresholds - batch 6", async function () {
        await registry.connect(dao).setPolicy(600, 5, 3);
        
        expect(await registry.minScore()).to.equal(600);
        expect(await registry.autoSuspendRefunds()).to.equal(5);
        expect(await registry.autoSuspendDisputes()).to.equal(3);
    });

    it("should reject merchants below new threshold", async function () {
        await registry.connect(dao).setPolicy(700, 5, 3);
        
        await seer.connect(owner).setScore(merchant1.address, 650);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        
        await expect(registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("low")))
            .to.be.revertedWithCustomError(registry, "COM_BadRating");
    });

    it("should allow merchants above threshold", async function () {
        await registry.connect(dao).setPolicy(600, 5, 3);
        
        await seer.connect(owner).setScore(merchant1.address, 750);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("high"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should update policy parameters independently", async function () {
        await registry.connect(dao).setPolicy(550, 10, 8);
        
        expect(await registry.minScore()).to.equal(550);
        expect(await registry.autoSuspendRefunds()).to.equal(10);
        expect(await registry.autoSuspendDisputes()).to.equal(8);
    });
});
