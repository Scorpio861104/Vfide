const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.forceRight", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should reject merchants without vault or with low score", async function () {
        // Test rejection for no vault
        const [, , , , , , user3] = await ethers.getSigners();
        await seer.connect(owner).setScore(user3.address, 600);
        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");

        // Test rejection for low score
        await seer.connect(owner).setScore(user2.address, 0);
        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
