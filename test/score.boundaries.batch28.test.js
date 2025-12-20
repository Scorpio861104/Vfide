const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("score.boundaries.batch28", function () {
    let owner, dao, user1, user2, merchant1, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, user1, user2, merchant1] = await ethers.getSigners();
        ({ vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, user2, merchant1));
    });

    it("should set and retrieve scores - batch 28", async function () {
        await seer.connect(owner).setScore(merchant1.address, 750);
        expect(await seer.getScore(merchant1.address)).to.equal(750);
    });

    it("should handle minimum boundary score", async function () {
        await seer.connect(owner).setScore(merchant1.address, 1);
        expect(await seer.getScore(merchant1.address)).to.equal(1);
    });

    it("should handle maximum score values", async function () {
        await seer.connect(owner).setScore(merchant1.address, 1000);
        expect(await seer.getScore(merchant1.address)).to.equal(1000);
    });

    it("should update scores correctly", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await seer.connect(owner).setScore(merchant1.address, 600);
        await seer.connect(owner).setScore(merchant1.address, 700);
        expect(await seer.getScore(merchant1.address)).to.equal(700);
    });

    it("should validate score for merchant registration", async function () {
        const minScore = await registry.minScore();
        await seer.connect(owner).setScore(merchant1.address, minScore);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("test"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });
});
