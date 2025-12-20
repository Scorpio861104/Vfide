const { expect } = require("chai");
const { deployContracts, deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("boundaries.comprehensive.batch26", function () {
    let owner, dao, user1, user2, merchant, token, vault, seer, registry, escrow;

    beforeEach(async function () {
        [owner, dao, user1, user2, merchant] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, user2, merchant));
        const commerce = await deployCommerce(owner, dao); escrow = commerce.escrow; registry = commerce.registry;
    });

    it("should handle maximum uint256 approval - batch 26", async function () {
        const maxUint = ethers.MaxUint256;
        await token.connect(user1).approve(user2.address, maxUint);
        expect(await token.allowance(user1.address, user2.address)).to.equal(maxUint);
    });

    it("should handle zero address checks", async function () {
        const amount = ethers.parseEther("100");
        await expect(token.connect(owner).transfer(ethers.ZeroAddress, amount))
            .to.be.revertedWithCustomError(token, "VF_ZERO");
    });

    it("should test score boundaries", async function () {
        const maxScore = 1000;
        await seer.connect(owner).setScore(user1.address, maxScore);
        expect(await seer.getScore(user1.address)).to.equal(maxScore);
        
        await seer.connect(owner).setScore(user1.address, 1);
        expect(await seer.getScore(user1.address)).to.equal(1);
    });

    it("should handle minimum viable amounts", async function () {
        await token.connect(owner).transfer(user1.address, 1);
        expect(await token.balanceOf(user1.address)).to.equal(1);
        
        await token.connect(user1).transfer(user2.address, 1);
        expect(await token.balanceOf(user2.address)).to.equal(1);
    });

});
