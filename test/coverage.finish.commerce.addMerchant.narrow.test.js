const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should successfully register a merchant with valid credentials", async function () {
        // user1 has vault and score from helper setup
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE
    });

    it("should reject a merchant without a vault", async function () {
        const [, , , , , , user3] = await ethers.getSigners();
        await seer.connect(owner).setScore(user3.address, 600);
        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should reject a merchant with low score", async function () {
        await seer.connect(owner).setScore(user2.address, 0);
        await expect(
            registry.connect(user2).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });

    it("should reject an already registered merchant", async function () {
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });
});
