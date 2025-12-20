const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("merchant.lifecycle.batch1", function () {
    let owner, dao, merchant1, merchant2, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, merchant1, merchant2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, merchant1, merchant2));
    });

    it("should track merchant metadata - batch 1", async function () {
        const metaHash = ethers.encodeBytes32String("ipfs://QmHash");
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(metaHash);
        
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.metaHash).to.equal(metaHash);
        expect(merchant.owner).to.equal(merchant1.address);
    });

    it("should initialize merchant counters", async function () {
        await seer.connect(owner).setScore(merchant1.address, 500);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("meta"));
        
        const merchant = await registry.merchants(merchant1.address);
        expect(merchant.refunds).to.equal(0);
        expect(merchant.disputes).to.equal(0);
    });

    it("should verify merchant info query", async function () {
        await seer.connect(owner).setScore(merchant1.address, 550);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("shop"));
        
        const info = await registry.info(merchant1.address);
        expect(info.status).to.equal(1);
        expect(info.owner).to.equal(merchant1.address);
        expect(info.vault).to.equal(merchant1.address);
    });
});
