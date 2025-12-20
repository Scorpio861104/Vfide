const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("policy.config.batch18", function () {
    let owner, dao, user1, merchant1, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, user1, merchant1] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, merchant1));
    });

    it("should update policy settings - batch 18", async function () {
        await registry.connect(dao).setPolicy(550, 10, 5);
        
        expect(await registry.minScore()).to.equal(550);
        expect(await registry.autoSuspendRefunds()).to.equal(10);
        expect(await registry.autoSuspendDisputes()).to.equal(5);
    });

    it("should enforce updated minimum score", async function () {
        await registry.connect(dao).setPolicy(600, 5, 5);
        
        await seer.connect(owner).setScore(merchant1.address, 550);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        
        await expect(registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("store")))
            .to.be.revertedWithCustomError(registry, "COM_BadRating");
        
        await seer.connect(owner).setScore(merchant1.address, 600);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("store"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should restrict policy changes to DAO only", async function () {
        await expect(registry.connect(user1).setPolicy(700, 10, 10))
            .to.be.revertedWithCustomError(registry, "COM_NotDAO");
    });
});
