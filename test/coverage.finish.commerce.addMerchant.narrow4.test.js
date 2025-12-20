const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow4", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should correctly identify an existing merchant", async function () {
        // Add user1 as a merchant
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        // Check their status
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // 1 is ACTIVE in the new contract
    });

    it("should revert when a user with no vault tries to register", async function () {
        // user3 is not set up with a vault in the helpers
        const [, , , , , , user3] = await ethers.getSigners();
        await seer.connect(owner).setScore(user3.address, 1); // Give them a passing score

        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should revert when a user with a low score tries to register", async function () {
        // user2 has a vault, but we'll set their score to 0
        await seer.connect(owner).setScore(user2.address, 0);

        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
