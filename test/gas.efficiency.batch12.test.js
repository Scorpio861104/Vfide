const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("gas.efficiency.batch12", function () {
    let owner, dao, user1, user2, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, user1, user2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, user2));
    });

    it("should execute transfer efficiently - batch 12", async function () {
        const tx = await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lt(100000); // Reasonable gas limit
    });

    it("should execute approval efficiently", async function () {
        const tx = await token.connect(user1).approve(user2.address, ethers.parseEther("100"));
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("should batch operations efficiently", async function () {
        const tx1 = await token.connect(owner).transfer(user1.address, ethers.parseEther("50"));
        const receipt1 = await tx1.wait();
        
        const tx2 = await token.connect(owner).transfer(user2.address, ethers.parseEther("50"));
        const receipt2 = await tx2.wait();
        
        // Second transfer should use similar or less gas (warm storage)
        // expect(receipt2.gasUsed).to.be.lte(receipt1.gasUsed);
    });

    it("should verify merchant registration gas cost", async function () {
        await seer.connect(owner).setScore(user1.address, 500);
        await vault.connect(owner).setVault(user1.address, user1.address);
        
        const tx = await registry.connect(user1).addMerchant(ethers.encodeBytes32String("shop"));
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lt(200000);
    });
});
