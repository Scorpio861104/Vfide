const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("token.transferFrom.batch3", function () {
    let owner, dao, user1, user2, user3, token;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        ({ token } = await deployContracts(owner, dao, user1, user2));
    });

    it("should handle transferFrom with approval - batch 3", async function () {
        const amount = ethers.parseEther("100");
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, amount);
        
        await token.connect(user2).transferFrom(user1.address, user3.address, amount);
        expect(await token.balanceOf(user3.address)).to.equal(amount);
        expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("should decrease allowance after transferFrom", async function () {
        const amount = ethers.parseEther("200");
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, amount);
        
        await token.connect(user2).transferFrom(user1.address, user3.address, ethers.parseEther("50"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("150"));
    });

    it("should reject transferFrom without approval", async function () {
        const amount = ethers.parseEther("100");
        await token.connect(owner).transfer(user1.address, amount);
        
        await expect(token.connect(user2).transferFrom(user1.address, user3.address, amount))
            .to.be.revertedWith("allow");
    });

    it("should reject transferFrom exceeding allowance", async function () {
        const amount = ethers.parseEther("100");
        await token.connect(owner).transfer(user1.address, amount);
        await token.connect(user1).approve(user2.address, ethers.parseEther("50"));
        
        await expect(token.connect(user2).transferFrom(user1.address, user3.address, amount))
            .to.be.revertedWith("allow");
    });
});
