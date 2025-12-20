const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("registry.policy.batch19", function () {
    let owner, dao, merchant1, merchant2, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, merchant1, merchant2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, merchant1, merchant2)); await registry.connect(dao).setReporter(owner.address, true);
    });

    it("should enforce auto-suspend on refunds - batch 19", async function () {
        await registry.connect(dao).setPolicy(500, 2, 5);
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        await registry.connect(owner).reportRefund(merchant1.address);
        let merchant = await registry.merchants(merchant1.address);
        expect(merchant.refunds).to.equal(1);
        
        await registry.connect(owner).reportRefund(merchant1.address);
        merchant = await registry.merchants(merchant1.address);
        expect(merchant.status).to.equal(2); // SUSPENDED
    });

    it("should enforce auto-suspend on disputes", async function () {
        await registry.connect(dao).setPolicy(500, 5, 2);
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        await registry.connect(owner).reportDispute(merchant1.address);
        await registry.connect(owner).reportDispute(merchant1.address);
        
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.status).to.equal(2); // SUSPENDED
    });

    it("should track refund counter", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        await registry.connect(owner).reportRefund(merchant1.address);
        await registry.connect(owner).reportRefund(merchant1.address);
        await registry.connect(owner).reportRefund(merchant1.address);
        
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.refunds).to.equal(3);
    });

    it("should track dispute counter", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        await registry.connect(owner).reportDispute(merchant1.address);
        await registry.connect(owner).reportDispute(merchant1.address);
        
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.disputes).to.equal(2);
    });
});
