const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.bruteforce2", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should handle edge cases in merchant registration", async function () {
        // Set min score policy
        await registry.connect(dao).setPolicy(500, 5, 3);

        // Test with low score
        await seer.connect(owner).setScore(user1.address, 1);
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("merchant"))
        ).to.be.revertedWithCustomError(registry, "COM_BadRating");

        // Restore score and register successfully
        await seer.connect(owner).setScore(user1.address, 600);
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("merchant"));
        expect((await registry.merchants(user1.address)).status).to.equal(1);
    });
});
