const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("burnrouter.batch17", function () {
    let owner, dao, user1, user2, seer, burnRouter, ledger;

    beforeEach(async function () {
        [owner, dao, user1, user2] = await ethers.getSigners();
        
        const Seer = await ethers.getContractFactory("SeerMock");
        seer = await Seer.deploy();
        
        const Ledger = await ethers.getContractFactory("LedgerMock");
        ledger = await Ledger.deploy(false);
        
        const BurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
        burnRouter = await BurnRouter.deploy(seer.target, dao.address, ledger.target, dao.address);
    });

    it("should initialize with correct seer - batch 17", async function () {
        expect(await burnRouter.seer()).to.equal(seer.target);
    });


});
