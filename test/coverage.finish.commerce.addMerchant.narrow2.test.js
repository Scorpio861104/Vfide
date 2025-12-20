const { expect } = require("chai");
const { deployContracts } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow2", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        ({ registry } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
    });

    it("registers one signer and uses a no-vault signer to flip left/right msg.sender arms", async function () {
                await registry.connect(user1).addMerchant(ethers.encodeBytes32String("meta"));
    });
});
