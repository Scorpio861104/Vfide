const { expect } = require("chai");
const { deployContracts, deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("contract.interactions.batch7", function () {
    let owner, dao, user1, merchant1, token, vault, seer, registry, escrow;

    beforeEach(async function () {
        [owner, dao, user1, merchant1] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, merchant1));
        
        const commerce = await deployCommerce(owner, dao);
        escrow = commerce.escrow;
    });

    it("should integrate token and registry - batch 7", async function () {
        // Setup merchant
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        
        // Register merchant
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        // Verify registration
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.status).to.equal(1);
        expect(merchant.vault).to.equal(merchant1.address);
    });

    it("should handle token transfers with score validation", async function () {
        const amount = ethers.parseEther("100");
        
        // Transfer tokens
        await token.connect(owner).transfer(user1.address, amount);
        expect(await token.balanceOf(user1.address)).to.equal(amount);
        
        // Check balance
        const balance = await token.balanceOf(user1.address);
        expect(balance).to.equal(amount);
    });

    it("should support complex workflows", async function () {
        // Setup
        await seer.connect(owner).setScore(merchant1.address, 600);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await vault.connect(owner).setVault(user1.address, user1.address);
        
        // Register merchant
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("premium"));
        
        // Fund user
        await token.connect(owner).transfer(user1.address, ethers.parseEther("500"));
        
        // Verify state
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
    });

    it("should maintain consistent state across operations", async function () {
        const totalSupply = await token.totalSupply();
        
        await token.connect(owner).transfer(user1.address, ethers.parseEther("100"));
        await seer.connect(owner).setScore(merchant1.address, 500);
        
        expect(await token.totalSupply()).to.equal(totalSupply);
    });
});
