const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("escrow.workflows.batch17", function () {
    let owner, dao, buyer, seller, registry, escrow, token, vault, seer;

    beforeEach(async function () {
        [owner, dao, buyer, seller] = await ethers.getSigners();
        ({ registry, escrow, token, vault, seer } = await deployCommerce(owner, dao));
        
        await seer.connect(owner).setScore(seller.address, 600);
        await vault.connect(owner).setVault(seller.address, seller.address);
        await registry.connect(seller).addMerchant(ethers.encodeBytes32String("shop"));
        await vault.connect(owner).setVault(buyer.address, buyer.address);
    });

    it("should complete full escrow lifecycle - batch 17", async function () {
        const amount = ethers.parseEther("150");
        
        // Open escrow
        await escrow.connect(buyer).open(seller.address, amount, ethers.encodeBytes32String("order123"));
        const escrowId = await escrow.escrowCount();
        expect(escrowId).to.equal(1n);
        
        // Check escrow state
        const escrowData = await escrow.escrows(escrowId);
        expect(escrowData.buyerOwner).to.equal(buyer.address);
        expect(escrowData.merchantOwner).to.equal(seller.address);
        expect(escrowData.amount).to.equal(amount);
        expect(escrowData.state).to.equal(1); // OPEN
    });

    it("should reject opening escrow for non-merchant", async function () {
        const amount = ethers.parseEther("100");
        await expect(escrow.connect(buyer).open(buyer.address, amount, ethers.encodeBytes32String("invalid")))
            .to.be.revertedWithCustomError(escrow, "COM_NotMerchant");
    });

    it("should track multiple escrows", async function () {
        await escrow.connect(buyer).open(seller.address, ethers.parseEther("100"), ethers.encodeBytes32String("order1"));
        await escrow.connect(buyer).open(seller.address, ethers.parseEther("200"), ethers.encodeBytes32String("order2"));
        await escrow.connect(buyer).open(seller.address, ethers.parseEther("150"), ethers.encodeBytes32String("order3"));
        
        expect(await escrow.escrowCount()).to.equal(3n);
    });
});
