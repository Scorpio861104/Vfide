const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance Incentives (Council Salary)", function () {
  let owner, member1, member2, member3, badActor;
  let vfide;
  let seer, vaultHub, election, salary;

  beforeEach(async function () {
    [owner, member1, member2, member3, badActor] = await ethers.getSigners();

    // 1. Deploy Token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    vfide = await ERC20Mock.deploy("VFIDE", "VFIDE");

    // 2. Deploy Dependencies
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    
    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    
    // Setup Vaults & Scores (scale is 0-10000, minCouncilScore is 7000)
    const members = [member1, member2, member3, badActor];
    for (const m of members) {
        await vaultHub.setVault(m.address, m.address);
        await seer.setScore(m.address, 8000); // High score on 0-10000 scale (>7000 required)
    }

    // 3. Deploy Election
    const CouncilElection = await ethers.getContractFactory("CouncilElection");
    election = await CouncilElection.deploy(owner.address, seer.target, vaultHub.target, ethers.ZeroAddress);

    // 4. Deploy Salary
    const CouncilSalary = await ethers.getContractFactory("CouncilSalary");
    salary = await CouncilSalary.deploy(election.target, seer.target, vfide.target, owner.address);

    // 5. Setup Council
    // We need to set the council in Election
    await election.setCouncil([member1.address, member2.address, member3.address, badActor.address]);
    
    // Fund Salary Contract
    await vfide.mint(salary.target, ethers.parseEther("4000"));
  });

  it("should distribute salary to eligible members", async function () {
    // Fast forward 4 months
    await ethers.provider.send("evm_increaseTime", [120 * 24 * 3600 + 1]);
    await ethers.provider.send("evm_mine");

    // Distribute
    await expect(salary.distributeSalary())
      .to.emit(salary, "SalaryPaid");

    // 4 members, 4000 tokens -> 1000 each
    expect(await vfide.balanceOf(member1.address)).to.equal(ethers.parseEther("1000"));
    expect(await vfide.balanceOf(badActor.address)).to.equal(ethers.parseEther("1000"));
  });

  it("should skip members with low score", async function () {
    // Bad Actor score drops (on 0-10000 scale, below 7000 is not eligible)
    await seer.setScore(badActor.address, 5000); // Below 7000

    // Fast forward
    await ethers.provider.send("evm_increaseTime", [120 * 24 * 3600 + 1]);
    await ethers.provider.send("evm_mine");

    await salary.distributeSalary();

    // 3 eligible members, 4000 tokens -> 1333 each
    // Bad actor gets 0
    expect(await vfide.balanceOf(badActor.address)).to.equal(0);
    expect(await vfide.balanceOf(member1.address)).to.be.closeTo(ethers.parseEther("1333"), ethers.parseEther("1"));
  });

  it("should allow council to vote out a member", async function () {
    // 4 members. Need > 2 votes to remove.
    
    // Member 1 votes to remove Bad Actor
    await salary.connect(member1).voteToRemove(badActor.address);
    
    // Member 2 votes to remove Bad Actor
    await salary.connect(member2).voteToRemove(badActor.address);
      
    // Member 3 votes (Trigger)
    await expect(salary.connect(member3).voteToRemove(badActor.address))
      .to.emit(salary, "MemberRemoved")
      .withArgs(badActor.address, member3.address);
    // Now 3 > 2 -> True.
    
    // Fast forward and pay
    await ethers.provider.send("evm_increaseTime", [120 * 24 * 3600 + 1]);
    await ethers.provider.send("evm_mine");
    
    await salary.distributeSalary();
    
    // Bad actor gets 0
    expect(await vfide.balanceOf(badActor.address)).to.equal(0);
  });
});
