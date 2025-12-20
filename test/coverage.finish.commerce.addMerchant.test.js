const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should allow a valid user to become a merchant", async function () {
        // user1 is set up with a vault and a passing score in the helpers
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE
    });

    it("should prevent an existing merchant from being added again", async function () {
        // Add user1 as a merchant
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        // Try to add them again and expect a revert
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });

    it("should prevent a user without a vault from becoming a merchant", async function () {
        // user3 is a new signer with no vault
        const [, , , , , , user3] = await ethers.getSigners();
        // Give them a passing score to isolate the vault check
        await seer.connect(owner).setScore(user3.address, 1);

        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should prevent a user with a low score from becoming a merchant", async function () {
        // user2 has a vault, but we will set their score to 0
        await seer.connect(owner).setScore(user2.address, 0);

        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
