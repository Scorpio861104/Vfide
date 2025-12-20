const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("VFIDECommerce.microbatch2", function () {
    let owner, dao, registry, escrow, token, vault, seer, ledger, user1, merchant1;

    beforeEach(async function () {
        [owner, dao, user1, merchant1] = await ethers.getSigners();
        ({ registry, escrow, token, vault, seer, ledger } = await deployCommerce(owner, dao));
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
    });

    it("should test merchant operations - batch 2", async function () {
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should test escrow opening", async function () {
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        await vault.connect(owner).setVault(user1.address, user1.address);
        const amount = ethers.parseEther("50");
        await escrow.connect(user1).open(merchant1.address, amount, ethers.encodeBytes32String("order"));
        expect(await escrow.escrowCount()).to.equal(1n);
    });
});
