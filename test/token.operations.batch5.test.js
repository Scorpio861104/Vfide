const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("token.operations.batch5", function () {
    let owner, dao, user1, user2, user3, token, vault, seer;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer } = await deployContracts(owner, dao, user1, user2));
    });

    it("should transfer tokens between users - batch 5", async function () {
        const amount = ethers.parseEther("200");
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).transfer(user2.address, ethers.parseEther("50"));
        expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("50"));
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("150"));
    });

    it("should handle multiple approvals", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user3.address, ethers.parseEther("200"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("100"));
        expect(await token.allowance(user1.address, user3.address)).to.equal(ethers.parseEther("200"));
    });

    it("should reject transfer with insufficient balance", async function () {
        await expect(token.connect(user2).transfer(user1.address, ethers.parseEther("100")))
            .to.be.revertedWith("balance");
    });
});
