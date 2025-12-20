const { expect } = require("chai");
const { deployContracts, deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("boundary.tests.batch13", function () {
    let owner, dao, user1, user2, merchant1, token, vault, seer, registry, escrow;

    beforeEach(async function () {
        [owner, dao, user1, user2, merchant1] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, user2, merchant1));
        ({ escrow } = await deployCommerce(owner, dao));
    });

    it("should handle zero address checks - batch 13", async function () {
        expect(await token.balanceOf(ethers.ZeroAddress)).to.equal(0);
    });

    it("should handle maximum uint256 approval", async function () {
        const maxUint = ethers.MaxUint256;
        await token.connect(user1).approve(user2.address, maxUint);
        expect(await token.allowance(user1.address, user2.address)).to.equal(maxUint);
    });

    it("should handle score at exact boundaries", async function () {
        const minScore = await registry.minScore();
        await seer.connect(owner).setScore(merchant1.address, minScore);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("exact"));
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });

    it("should handle empty bytes32 metadata", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant("0x0000000000000000000000000000000000000000000000000000000000000000");
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
    });
});
