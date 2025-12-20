const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("token.approvals.batch4", function () {
    let owner, dao, user1, user2, user3, token;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        ({ token } = await deployContracts(owner, dao, user1, user2));
    });

    it("should handle approve and allowance - batch 4", async function () {
        const amount = ethers.parseEther("500");
        await token.connect(user1).approve(user2.address, amount);
        expect(await token.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("should update allowance with new approval", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user2.address, ethers.parseEther("200"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("200"));
    });

    it("should handle zero allowance", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user2.address, 0);
        expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("should support multiple spenders", async function () {
        await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        await token.connect(user1).approve(user3.address, ethers.parseEther("200"));
        expect(await token.allowance(user1.address, user2.address)).to.equal(ethers.parseEther("100"));
        expect(await token.allowance(user1.address, user3.address)).to.equal(ethers.parseEther("200"));
    });
});
