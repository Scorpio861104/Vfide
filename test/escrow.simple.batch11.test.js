const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("escrow.simple.batch11", function () {
    let owner, dao, buyer, merchant, registry, escrow, vault, seer;

    beforeEach(async function () {
        [owner, dao, buyer, merchant] = await ethers.getSigners();
        ({ registry, escrow, vault, seer } = await deployCommerce(owner, dao));
        
        await seer.connect(owner).setScore(merchant.address, 500);
        await vault.connect(owner).setVault(merchant.address, merchant.address);
        await registry.connect(merchant).addMerchant(ethers.encodeBytes32String("store"));
        await vault.connect(owner).setVault(buyer.address, buyer.address);
    });

    it("should reject zero amount - batch 11", async function () {
        await expect(escrow.connect(buyer).open(merchant.address, 0, ethers.encodeBytes32String("x")))
            .to.be.revertedWithCustomError(escrow, "COM_BadAmount");
    });

    it("should create escrow with correct amount", async function () {
        const amount = ethers.parseEther("250");
        await escrow.connect(buyer).open(merchant.address, amount, ethers.encodeBytes32String("order"));
        
        const escrowData = await escrow.escrows(1);
        expect(escrowData.amount).to.equal(amount);
    });

    it("should increment escrow counter", async function () {
        await escrow.connect(buyer).open(merchant.address, ethers.parseEther("10"), ethers.encodeBytes32String("1"));
        await escrow.connect(buyer).open(merchant.address, ethers.parseEther("20"), ethers.encodeBytes32String("2"));
        
        expect(await escrow.escrowCount()).to.equal(2n);
    });
});
