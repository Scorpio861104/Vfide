const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowManager (Consumer Protection)", function () {
  let owner, buyer, merchant, arbiter;
  let vfide;
  let seer, escrowManager;

  beforeEach(async function () {
    [owner, buyer, merchant, arbiter] = await ethers.getSigners();

    // Deploy Token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    vfide = await ERC20Mock.deploy("VFIDE", "VFIDE");
    await vfide.mint(buyer.address, ethers.parseEther("1000"));

    // Deploy Seer Mock
    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();

    // Deploy EscrowManager
    const EscrowManager = await ethers.getContractFactory("EscrowManager");
    escrowManager = await EscrowManager.deploy(arbiter.address, seer.target);

    // Setup
    await vfide.connect(buyer).approve(escrowManager.target, ethers.parseEther("1000"));
  });

  it("should create an escrow with dynamic release time", async function () {
    // Set Merchant Score to 850 (High Trust) -> 3 days lock
    await seer.setScore(merchant.address, 850);

    await escrowManager.connect(buyer).createEscrow(
      merchant.address,
      vfide.target,
      ethers.parseEther("100"),
      "ORDER-1"
    );

    const escrow = await escrowManager.escrows(1);
    expect(escrow.state).to.equal(0); // CREATED
    
    // Check lock period (approx 3 days)
    const now = await ethers.provider.getBlock("latest").then(b => b.timestamp);
    expect(escrow.releaseTime).to.be.closeTo(now + 3 * 24 * 3600, 10);
  });

  it("should allow buyer to release funds early", async function () {
    await escrowManager.connect(buyer).createEscrow(
      merchant.address,
      vfide.target,
      ethers.parseEther("100"),
      "ORDER-1"
    );

    await expect(escrowManager.connect(buyer).release(1))
      .to.emit(escrowManager, "EscrowReleased")
      .withArgs(1, merchant.address);

    expect(await vfide.balanceOf(merchant.address)).to.equal(ethers.parseEther("100"));
  });

  it("should allow merchant to claim after timeout", async function () {
    // Low trust merchant -> 14 days
    await seer.setScore(merchant.address, 400);

    await escrowManager.connect(buyer).createEscrow(
      merchant.address,
      vfide.target,
      ethers.parseEther("100"),
      "ORDER-1"
    );

    // Try early claim
    await expect(escrowManager.connect(merchant).claimTimeout(1)).to.be.revertedWith("too early");

    // Fast forward 15 days
    await ethers.provider.send("evm_increaseTime", [15 * 24 * 3600]);
    await ethers.provider.send("evm_mine");

    // Claim success
    await escrowManager.connect(merchant).claimTimeout(1);
    expect(await vfide.balanceOf(merchant.address)).to.equal(ethers.parseEther("100"));
  });

  it("should handle disputes correctly", async function () {
    await escrowManager.connect(buyer).createEscrow(
      merchant.address,
      vfide.target,
      ethers.parseEther("100"),
      "ORDER-1"
    );

    // Buyer raises dispute
    await escrowManager.connect(buyer).raiseDispute(1);
    
    const escrow = await escrowManager.escrows(1);
    expect(escrow.state).to.equal(3); // DISPUTED

    // Merchant cannot claim even after timeout
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await expect(escrowManager.connect(merchant).claimTimeout(1)).to.be.revertedWith("bad state");

    // Arbiter resolves in favor of Buyer
    await expect(escrowManager.connect(arbiter).resolveDispute(1, true))
      .to.emit(escrowManager, "DisputeResolved")
      .withArgs(1, buyer.address);

    // Buyer gets refund
    expect(await vfide.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000")); // Original balance
  });
});
