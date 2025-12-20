const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("CommerceEdge", function () {
    let owner, dao, registry, escrow, token, vault, seer, ledger, user1, user2;

    beforeEach(async function () {
        [owner, dao, user1, user2] = await ethers.getSigners();
        ({ registry, escrow, token, vault, seer, ledger } = await deployCommerce(owner, dao));
        await seer.connect(owner).setScore(user1.address, 600);
        await vault.connect(owner).setVault(user1.address, user1.address);
    });

    it("should handle commerce escrow operations", async function () {
        // Register merchant
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("merchant"));
        expect((await registry.merchants(user1.address)).status).to.equal(1);

        // Open escrow
        const amount = ethers.parseEther("100");
        await vault.connect(owner).setVault(user2.address, user2.address);
        await escrow.connect(user2).open(user1.address, amount, ethers.encodeBytes32String("order"));
        const escrowId = await escrow.escrowCount();
        expect(escrowId).to.equal(1n);
    });
});
