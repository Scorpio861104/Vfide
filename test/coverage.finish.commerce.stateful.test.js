const { expect } = require("chai");
const { deployContracts, deployCommerce } = require("./helpers");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.stateful", function () {
    let owner, user1, user2, merchant1, merchant2, dao, registry, escrow, token, vault, seer, ledger;

    beforeEach(async function () {
        [owner, user1, user2, merchant1, merchant2, dao] = await ethers.getSigners();
        const deployments = await deployCommerce(owner, dao);
        registry = deployments.registry;
        escrow = deployments.escrow;
        token = deployments.token;
        vault = deployments.vault;
        seer = deployments.seer;
        ledger = deployments.ledger;

        // Setup for stateful tests
        await registry.connect(dao).setReporter(owner.address, true);
        await seer.connect(owner).setScore(merchant1.address, 1);
        await seer.connect(owner).setScore(user1.address, 1);
        await vault.connect(owner).setVault(merchant1.address, merchant1.address);
        await vault.connect(owner).setVault(user1.address, user1.address);
    });

    it("should handle the full lifecycle of a merchant and multiple escrows", async function () {
        // 1. Merchant signs up
        await registry.connect(merchant1).addMerchant(ethers.encodeBytes32String("meta"));
        let merchantData = await registry.merchants(merchant1.address);
        expect(merchantData.status).to.equal(1); // ACTIVE

        const amount = ethers.parseEther("100");

        // 2. Escrow 1: Open
        await escrow.connect(user1).open(merchant1.address, amount, ethers.encodeBytes32String("escrow1"));
        const escrowId1 = await escrow.escrowCount();
        let e1 = await escrow.escrows(escrowId1);
        expect(e1.state).to.equal(1); // OPEN
        expect(e1.buyerOwner).to.equal(user1.address);
        expect(e1.merchantOwner).to.equal(merchant1.address);

        // 3. Trigger refund auto-suspension by calling reportRefund multiple times
        const refundThreshold = await registry.autoSuspendRefunds();
        for (let i = 0; i < refundThreshold; i++) {
            await registry.reportRefund(merchant1.address);
        }
        merchantData = await registry.merchants(merchant1.address);
        expect(merchantData.status).to.equal(2); // SUSPENDED
        expect(merchantData.refunds).to.be.gte(refundThreshold);

        // 4. Trigger dispute auto-suspension (already suspended, so count should NOT increase)
        const disputeThreshold = await registry.autoSuspendDisputes();
        const initialDisputes = merchantData.disputes;
        for (let i = 0; i < disputeThreshold; i++) {
            await registry.reportDispute(merchant1.address);
        }
        merchantData = await registry.merchants(merchant1.address);
        expect(merchantData.disputes).to.equal(initialDisputes);
    });
});
