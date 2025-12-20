const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("token.mechanics.batch2", function () {
    let owner, dao, user1, user2, user3, token, vault;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        ({ token, vaultHub: vault } = await deployContracts(owner, dao, user1, user2));
    });

    it("should handle transferFrom with approval - batch 2", async function () {
        const amount = ethers.parseEther("100");
        
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, amount);
        
        await token.connect(user2).transferFrom(user1.address, user2.address, amount);
        
        expect(await token.balanceOf(user2.address)).to.equal(amount);
        expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("should update allowance after transferFrom", async function () {
        const amount = ethers.parseEther("200");
        const transferAmount = ethers.parseEther("50");
        
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, amount);
        
        await token.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
        
        expect(await token.allowance(user1.address, user2.address)).to.equal(amount - transferAmount);
    });

    it("should reject transferFrom exceeding allowance", async function () {
        const amount = ethers.parseEther("100");
        
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, ethers.parseEther("50"));
        
        await expect(
            token.connect(user2).transferFrom(user1.address, user2.address, amount)
        ).to.be.revertedWith("allow");
    });

    it("should handle zero approval reset", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user2.address, 0);
        
        expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });
});
