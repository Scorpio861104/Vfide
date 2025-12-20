const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("concurrent.batch16", function () {
    let owner, dao, user1, user2, user3, user4, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3, user4] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, user2));
    });

    it("should handle parallel transfers - batch 16", async function () {
        const amount = ethers.parseEther("100");
        await Promise.all([
            token.connect(owner).transfer(user1.address, amount),
            token.connect(owner).transfer(user2.address, amount),
            token.connect(owner).transfer(user3.address, amount)
        ]);
        
        expect(await token.balanceOf(user1.address)).to.equal(amount);
        expect(await token.balanceOf(user2.address)).to.equal(amount);
        expect(await token.balanceOf(user3.address)).to.equal(amount);
    });

    it("should handle parallel approvals", async function () {
        await Promise.all([
            token.connect(user1).approve(user2.address, ethers.parseEther("50")),
            token.connect(user2).approve(user3.address, ethers.parseEther("75")),
            token.connect(user3).approve(user4.address, ethers.parseEther("100"))
        ]);
        
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("50"));
        expect(await token.allowance(user2.address, user3.address)).to.equal(ethers.parseEther("75"));
        expect(await token.allowance(user3.address, user4.address)).to.equal(ethers.parseEther("100"));
    });

    it("should handle sequential state changes", async function () {
        for (let i = 0; i < 5; i++) {
            await token.connect(owner).transfer(user1.address, ethers.parseEther("10"));
        }
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
    });

    it("should maintain state across multiple operations", async function () {
        await token.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
        await token.connect(user1).approve(user2.address, ethers.parseEther("500"));
        await token.connect(user1).transfer(user3.address, ethers.parseEther("200"));
        
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("800"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("500"));
    });
});
