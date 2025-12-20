const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("VFIDECommerce.extra.focused", function () {
    let owner, dao, registry, escrow, token, vault, seer, ledger, user1, merchant1;

    beforeEach(async function () {
        [owner, dao, user1, merchant1] = await ethers.getSigners();
        ({ registry, escrow, token, vault, seer, ledger } = await deployCommerce(owner, dao));
    });

    it("should initialize commerce with correct parameters", async function () {
        expect(await escrow.merchants()).to.equal(await registry.getAddress());
        expect(await escrow.token()).to.equal(await token.getAddress());
    });

    it("should handle merchant registration", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("store"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });
});
