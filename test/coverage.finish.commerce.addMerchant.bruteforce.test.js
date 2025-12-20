const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.bruteforce", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vaultHub: vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should handle various merchant registration scenarios", async function () {
        // Successfully register a merchant
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("merchant1"));
        expect((await registry.merchants(user1.address)).status).to.equal(1);

        // Attempt to register again - should fail
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("merchant1"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");

        // Setup and register another merchant
        await seer.connect(owner).setScore(user2.address, 600);
        await vault.connect(owner).setVault(user2.address, user2.address);
        await registry.connect(user2).addMerchant(ethers.encodeBytes32String("merchant2"));
        expect((await registry.merchants(user2.address)).status).to.equal(1);

        // Test with user without vault
        const [, , , , , , user3] = await ethers.getSigners();
        await seer.connect(owner).setScore(user3.address, 600);
        await expect(
            registry.connect(user3).addMerchant(ethers.encodeBytes32String("merchant3"))
        ).to.be.revertedWithCustomError(registry, "COM_NotAllowed");
    });
});
