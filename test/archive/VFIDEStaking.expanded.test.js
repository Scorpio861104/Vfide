const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEStaking Expanded Tests", function () {
  let deployer, alice, bob;
  let staking, vfide, vaultHub, securityHub, seer, ledger;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    vfide = await VFIDEToken.deploy(
      deployer.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );
    await vfide.deployed();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.deployed();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.deployed();

    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.deployed();

    const ProofLedgerMock = await ethers.getContractFactory("ProofLedgerMock");
    ledger = await ProofLedgerMock.deploy();
    await ledger.deployed();

    const VFIDEStaking = await ethers.getContractFactory("VFIDEStaking");
    staking = await VFIDEStaking.deploy(
      vfide.address,
      vaultHub.address,
      securityHub.address,
      seer.address,
      ledger.address
    );
    await staking.deployed();
  });

  it("should allow staking with valid parameters", async () => {
    await vaultHub.setVault(alice.address, alice.address);
    await vfide.transfer(alice.address, ethers.utils.parseEther("100"));
    await vfide.connect(alice).approve(staking.address, ethers.utils.parseEther("50"));

    await expect(staking.connect(alice).stake(ethers.utils.parseEther("50"), 30 * 24 * 60 * 60))
      .to.emit(staking, "Staked")
      .withArgs(alice.address, alice.address, ethers.utils.parseEther("50"), anyValue, anyValue);
  });

  it("should calculate rewards correctly", async () => {
    await vaultHub.setVault(alice.address, alice.address);
    await vfide.transfer(alice.address, ethers.utils.parseEther("100"));
    await vfide.connect(alice).approve(staking.address, ethers.utils.parseEther("50"));

    await staking.connect(alice).stake(ethers.utils.parseEther("50"), 30 * 24 * 60 * 60);

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const rewards = await staking.pendingRewards(alice.address);
    expect(rewards).to.be.gt(0);
  });

  it("should prevent unstaking before lock period", async () => {
    await vaultHub.setVault(alice.address, alice.address);
    await vfide.transfer(alice.address, ethers.utils.parseEther("100"));
    await vfide.connect(alice).approve(staking.address, ethers.utils.parseEther("50"));

    await staking.connect(alice).stake(ethers.utils.parseEther("50"), 30 * 24 * 60 * 60);

    await expect(staking.connect(alice).unstake(ethers.utils.parseEther("50")))
      .to.be.revertedWith("STAKE_StakeLocked");
  });

  it("should allow unstaking after lock period", async () => {
    await vaultHub.setVault(alice.address, alice.address);
    await vfide.transfer(alice.address, ethers.utils.parseEther("100"));
    await vfide.connect(alice).approve(staking.address, ethers.utils.parseEther("50"));

    await staking.connect(alice).stake(ethers.utils.parseEther("50"), 30 * 24 * 60 * 60);

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(staking.connect(alice).unstake(ethers.utils.parseEther("50")))
      .to.emit(staking, "Unstaked")
      .withArgs(alice.address, alice.address, ethers.utils.parseEther("50"), anyValue);
  });

  it("should handle emergency withdrawals correctly", async () => {
    await vaultHub.setVault(alice.address, alice.address);
    await vfide.transfer(alice.address, ethers.utils.parseEther("100"));
    await vfide.connect(alice).approve(staking.address, ethers.utils.parseEther("50"));

    await staking.connect(alice).stake(ethers.utils.parseEther("50"), 30 * 24 * 60 * 60);

    await expect(staking.connect(alice).emergencyWithdraw())
      .to.emit(staking, "EmergencyWithdraw")
      .withArgs(alice.address, alice.address, ethers.utils.parseEther("50"));
  });
});