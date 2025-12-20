const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.exec.addMerchant", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should successfully register a valid merchant", async function () {
        // user1 has a vault and passing score from the helper
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE
    });

    it("should revert when trying to register an existing merchant", async function () {
        // Register user1 first
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));

        // Try to register user1 again
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });

    it("should revert when a user with no vault tries to register", async function () {
        // user3 has no vault
        const [, , , , , , user3] = await ethers.getSigners();
        await seer.connect(owner).setScore(user3.address, 1); // Give a passing score

        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should revert when a user with a low score tries to register", async function () {
        // user2 has a vault, but we'll give them a low score
        await seer.connect(owner).setScore(user2.address, 0);

        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
