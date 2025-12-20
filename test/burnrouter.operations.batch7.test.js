const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("burnrouter.operations.batch7", function () {
    let owner, dao, user1, seer, burnRouter, ledger;

    beforeEach(async function () {
        [owner, dao, user1] = await ethers.getSigners();
        
        const Seer = await ethers.getContractFactory("SeerMock");
        seer = await Seer.deploy();
        
        const Ledger = await ethers.getContractFactory("LedgerMock");
        ledger = await Ledger.deploy(false);
        
        const BurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
        burnRouter = await BurnRouter.deploy(seer.target, dao.address, owner.address, dao.address);
        
        await seer.setMin(500);
    });

    it("should preview fees for user - batch 7", async function () {
        await seer.connect(owner).setScore(user1.address, 800);
        const amount = ethers.parseEther("1000");
        const [burnFee, sanctumFee, ecoFee] = await burnRouter.previewFees(user1.address, amount);
        expect(burnFee).to.be.lte(amount);
        expect(sanctumFee).to.be.lte(amount);
    });

    it("should get effective burn rate", async function () {
        await seer.connect(owner).setScore(user1.address, 600);
        const [burnBps, sanctumBps, ecoBps] = await burnRouter.getEffectiveBurnRate(user1.address);
        expect(burnBps).to.be.gte(0);
        expect(sanctumBps).to.be.gte(0);
    });

    it("should get split ratio", async function () {
        const [burnPercent, sanctumPercent, ecoPercent] = await burnRouter.getSplitRatio();
        expect(burnPercent + sanctumPercent + ecoPercent).to.be.closeTo(100, 2);
    });

    it("should allow owner to set policy", async function () {
        await burnRouter.connect(owner).setPolicy(300, 100, 100, 50, 150, 0, 1000);
        const [burnPercent] = await burnRouter.getSplitRatio();
        expect(burnPercent).to.equal(60);
    });
});
