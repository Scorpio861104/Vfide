const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.250_410", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry, token, vaultHub: vault, seer, ledger } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("should test merchant registration functionality", async function () {
        await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
        const merchantData = await registry.merchants(user1.address);
        expect(merchantData.status).to.equal(1);
        
        await expect(
            registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"))
        ).to.be.revertedWithCustomError(registry, "COM_AlreadyMerchant");
    });
});
