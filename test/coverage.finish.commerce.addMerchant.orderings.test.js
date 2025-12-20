const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.orderings", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should allow a user with a vault and score to become a merchant", async function () {
        // user1 is set up with a vault and score in helpers
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE
    });

    it("should reject a user without a vault", async function () {
        const [, , , , , , user3] = await ethers.getSigners(); // A new signer with no vault
        await seer.connect(owner).setScore(user3.address, 1); // Give them a passing score
        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should reject a user with a low score", async function () {
        // user2 has a vault, but we'll set their score to 0
        await seer.connect(owner).setScore(user2.address, 0);
        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should reject an existing merchant", async function () {
        // First, add user1 as a merchant
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        // Then, try to add them again
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });
});
