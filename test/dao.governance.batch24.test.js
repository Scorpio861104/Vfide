const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts } = require("./helpers");

describe("dao.governance.batch$i", function () {
    let owner, dao, user1, user2, merchant1, merchant2;
    let token, vaultHub, seer, ledger, registry, daoContract, timelock;

    beforeEach(async function () {
        [owner, dao, user1, user2, merchant1, merchant2] = await ethers.getSigners();
        ({ token, vaultHub, seer, ledger, registry } = await deployContracts(owner, dao, user1, user2, merchant1, merchant2));
        
        // Deploy DAOTimelock - constructor only takes admin address
        const Timelock = await ethers.getContractFactory("DAOTimelock");
        timelock = await Timelock.deploy(dao.address);
        
        // Deploy DAO
        const DAO = await ethers.getContractFactory("DAO");
        daoContract = await DAO.deploy(owner.address, await timelock.getAddress(), await seer.getAddress(), await vaultHub.getAddress(), ethers.ZeroAddress);
        
        // Setup vault and score for user1
        await vaultHub.connect(owner).setVault(user1.address, user1.address);
        await seer.connect(owner).setScore(user1.address, 600);
    });

    it("should create proposal successfully", async function () {
        const target = await token.getAddress();
        const data = token.interface.encodeFunctionData("transfer", [user2.address, ethers.parseEther("100")]);
        
        await daoContract.connect(user1).propose(0, target, 0, data, "Test proposal");
        expect(await daoContract.proposalCount()).to.equal(1);
    });

    it("should allow eligible voter to vote", async function () {
        const target = await token.getAddress();
        const data = token.interface.encodeFunctionData("transfer", [user2.address, ethers.parseEther("100")]);
        
        await daoContract.connect(user1).propose(0, target, 0, data, "Test proposal");
        
        await vaultHub.connect(owner).setVault(user2.address, user2.address);
        await seer.connect(owner).setScore(user2.address, 600);
        
        await daoContract.connect(user2).vote(1, true);
    });

});
