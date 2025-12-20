const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("registry.operations.batch11", function () {
    let owner, dao, user1, merchant1, merchant2, token, vault, seer, registry;

    beforeEach(async function () {
        [owner, dao, user1, merchant1, merchant2] = await ethers.getSigners();
        ({ token, vaultHub: vault, seer, registry } = await deployContracts(owner, dao, user1, merchant1, merchant2));
    });

    it("should track merchant registration - batch 11", async function () {
        await seer.connect(owner).setScore(merchant1.address, 550);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("merchant1"));
        
        const info = await registry.info(merchant1.address);
        expect(info.status).to.equal(1);
        expect(info.owner).to.equal(merchant1.address);
        expect(info.vault).to.equal(merchant1.address);
    });

    it("should prevent duplicate merchant registration", async function () {
        await seer.connect(owner).setScore(merchant1.address, 550);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("merchant1"));
        
        await expect(registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("duplicate")))
            .to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });

    it("should allow multiple different merchants", async function () {
        await seer.connect(owner).setScore(merchant1.address, 550);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("merchant1"));
        
        await seer.connect(owner).setScore(merchant2.address, 550);
        await vault.connect(owner).setVault(merchant2.address, merchant2.address);
        await registry.connect(merchant2).addMerchant(ethers.encodeBytes32String("merchant2"));
        
        expect((await registry.merchants(merchant1.address)).status).to.equal(1);
        expect((await registry.merchants(merchant2.address)).status).to.equal(1);
    });
});
