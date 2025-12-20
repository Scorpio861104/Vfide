const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("allowance.comprehensive.batch17", function () {
    let owner, dao, user1, user2, user3, token;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        ({ token } = await deployContracts(owner, dao, user1, user2));
    });

    it("should approve and check allowance - batch 17", async function () {
        const amount = ethers.parseEther("1000");
        await token.connect(user1).approve(user2.address, amount);
        expect(await token.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("should handle zero allowance", async function () {
        expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("should approve maximum uint256", async function () {
        const maxUint = ethers.MaxUint256;
        await token.connect(user1).approve(user2.address, maxUint);
        expect(await token.allowance(user1.address, user2.address)).to.equal(maxUint);
    });

    it("should overwrite previous allowance", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user2.address, ethers.parseEther("500"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("500"));
    });

    it("should handle multiple spenders independently", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user3.address, ethers.parseEther("200"));
        
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("100"));
        expect(await token.allowance(user1.address, user3.address)).to.equal(ethers.parseEther("200"));
    });
});
