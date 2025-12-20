const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.pinpoint", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should successfully add a valid merchant", async function () {
        // user1 has a vault and a passing score from the helper setup
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE
    });

    it("should revert if the user is already a merchant", async function () {
        // Add user1 as a merchant first
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        // Attempt to add them again
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });

    it("should revert if the user does not have a vault", async function () {
        // user3 is a new signer with no vault
        const [, , , , , , user3] = await ethers.getSigners();
        // Give them a passing score so the vault check is isolated
        await seer.connect(owner).setScore(user3.address, 1);

        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should revert if the user's score is too low", async function () {
        // user2 has a vault from the helper setup, but we'll set their score to 0
        await seer.connect(owner).setScore(user2.address, 0);

        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
