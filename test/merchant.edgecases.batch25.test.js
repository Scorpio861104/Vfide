const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("merchant.edgecases.batch25", function () {
    let owner, dao, merchant1, merchant2, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, merchant1, merchant2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, merchant1, merchant2));
    });

    it("should register with exact minimum score - batch 25", async function () {
        const minScore = await registry.minScore();
        await seer.connect(owner).setScore(merchant1.address, minScore);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should reject one point below minimum", async function () {
        const minScore = await registry.minScore();
        await seer.connect(owner).setScore(merchant1.address, minScore - 1n);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await expect(registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop")))
            .to.be.revertedWithCustomError(registry, "COM_BadRating");
    });

    it("should accept high score", async function () {
        await seer.connect(owner).setScore(merchant1.address, 1000);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("premium"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should handle empty metadata", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String(""));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });
});
