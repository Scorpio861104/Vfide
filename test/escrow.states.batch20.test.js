const { expect } = require("chai");
const { deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("escrow.states.batch20", function () {
    let owner, dao, buyer, merchant, registry, escrow, token, vault, seer;

    beforeEach(async function () {
        [owner, dao, buyer, merchant] = await ethers.getSigners();
        ({ registry, escrow, token, vault, seer } = await deployCommerce(owner, dao));
        
        await seer.connect(owner).setScore(merchant.address, 500);
        await vault.connect(owner).setVault(merchant.address, merchant.address);
        await registry.connect(merchant).addMerchant(ethers.encodeBytes32String("store"));
        await vault.connect(owner).setVault(buyer.address, buyer.address);
    });

    it("should initialize in OPEN state - batch 20", async function () {
        const amount = ethers.parseEther("100");
        await escrow.connect(buyer).open(merchant.address, amount, ethers.encodeBytes32String("order"));
        
        const escrowData = await escrow.escrows(1);
        expect(escrowData.state).to.equal(1); // State.OPEN
    });

    it("should track buyer and seller correctly", async function () {
        const amount = ethers.parseEther("200");
        await escrow.connect(buyer).open(merchant.address, amount, ethers.encodeBytes32String("tx"));
        
        const escrowData = await escrow.escrows(1);
        expect(escrowData.buyerOwner).to.equal(buyer.address);
        expect(escrowData.merchantOwner).to.equal(merchant.address);
    });

    it("should store exact amount", async function () {
        const amount = ethers.parseEther("123.456789");
        await escrow.connect(buyer).open(merchant.address, amount, ethers.encodeBytes32String("precise"));
        
        const escrowData = await escrow.escrows(1);
        expect(escrowData.amount).to.equal(amount);
    });

    it("should generate sequential IDs", async function () {
        await escrow.connect(buyer).open(merchant.address, ethers.parseEther("10"), ethers.encodeBytes32String("1"));
        await escrow.connect(buyer).open(merchant.address, ethers.parseEther("20"), ethers.encodeBytes32String("2"));
        await escrow.connect(buyer).open(merchant.address, ethers.parseEther("30"), ethers.encodeBytes32String("3"));
        
        expect(await escrow.escrowCount()).to.equal(3n);
    });
});
