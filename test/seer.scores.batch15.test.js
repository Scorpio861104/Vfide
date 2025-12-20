const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("seer.scores.batch15", function () {
    let owner, dao, user1, user2, user3, seer, ledger;

    beforeEach(async function () {
        [owner, dao, user1, user2, user3] = await ethers.getSigners();
        
        const Ledger = await ethers.getContractFactory("LedgerMock");
        ledger = await Ledger.deploy(false);
        
        const Seer = await ethers.getContractFactory("Seer");
        seer = await Seer.deploy(dao.address, ledger.target, ethers.ZeroAddress);
    });

    it("should set and retrieve scores - batch 15", async function () {
        await seer.connect(dao).setScore(user1.address, 750, "admin_update");
        expect(await seer.getScore(user1.address)).to.equal(750);
    });

    it("should track multiple user scores", async function () {
        await seer.connect(dao).setScore(user1.address, 600, "admin_update");
        await seer.connect(dao).setScore(user2.address, 800, "admin_update");
        await seer.connect(dao).setScore(user3.address, 500, "admin_update");
        
        expect(await seer.getScore(user1.address)).to.equal(600);
        expect(await seer.getScore(user2.address)).to.equal(800);
        expect(await seer.getScore(user3.address)).to.equal(500);
    });

    it("should update existing scores", async function () {
        await seer.connect(dao).setScore(user1.address, 500, "admin_update");
        await seer.connect(dao).setScore(user1.address, 700, "admin_update");
        expect(await seer.getScore(user1.address)).to.equal(700);
    });
});
