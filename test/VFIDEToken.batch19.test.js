const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("VFIDEToken.batch19", function () {
    let owner, dao, user1, user2, token, vault, seer;

    beforeEach(async function () {
        [owner, dao, user1, user2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer } = await deployContracts(owner, dao, user1, user2));
    });

    it("should have correct token metadata", async function () {
        expect(await token.name()).to.equal("VFIDE");
        expect(await token.symbol()).to.equal("VFIDE");
        expect(await token.decimals()).to.equal(18);
    });

    it("should handle token transfers - batch 19", async function () {
        const amount = ethers.parseEther("100");
        await token.connect(owner).transfer(user1.address, amount);
        expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("should handle token approvals", async function () {
        const amount = ethers.parseEther("50");
        await token.connect(user1).approve(user2.address, amount);
        expect(await token.allowance(user1.address, user2.address)).to.equal(amount);
    });
});
