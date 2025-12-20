const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow3", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should revert when trying to add an existing merchant", async function () {
        // Add user1 as a merchant first
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        // Try to add user1 again and expect a revert
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });

    it("should revert if the caller does not have a vault", async function () {
        // user2 is set up with a vault in helpers, so let's use a different signer
        const [, , , , , , user3] = await ethers.getSigners();

        // Ensure user3 has a score to pass that check
        await seer.connect(owner).setScore(user3.address, 1);

        // Expect revert because user3 has no vault
        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should successfully add a new merchant with a valid vault and score", async function () {
        // user1 has a vault and score from the helper setup
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        const merchantData = await registry.merchants(user1.address);
        // MerchantStatus enum: NONE, PENDING, ACTIVE, SUSPENDED, BANNED
        // It should be PENDING (1) after being added
        expect(merchantData.status).to.equal(1);
    });
});
