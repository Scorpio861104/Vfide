const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DevReserveVestingVault", function () {
  let vestingVault, vfide, vaultHub, securityHub, ledger, presale;
  let deployer, beneficiary, user;

  beforeEach(async function () {
    [deployer, beneficiary, user] = await ethers.getSigners();

    // Mock VFIDE
    const VFIDEMock = await ethers.getContractFactory("VFIDEDevVestingMock");
    vfide = await VFIDEMock.deploy();

    // Mock VaultHub
    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();

    // Mock SecurityHub
    const SecurityMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityMock.deploy();

    // Mock Ledger
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    // Mock Presale
    const PresaleMock = await ethers.getContractFactory("PresaleDevVestingMock");
    presale = await PresaleMock.deploy();

    // Deploy DevReserveVestingVault
    const allocation = ethers.parseEther("40000000"); // 40M VFIDE
    const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
    vestingVault = await DevReserveVestingVault.deploy(
      await vfide.getAddress(),
      beneficiary.address,
      await vaultHub.getAddress(),
      await securityHub.getAddress(),
      await ledger.getAddress(),
      await presale.getAddress(),
      allocation
    );

    // Fund the vesting vault
    await vfide.mint(await vestingVault.getAddress(), allocation);
  });

  describe("Deployment", function () {
    it("should deploy with correct VFIDE", async function () {
      expect(await vestingVault.VFIDE()).to.equal(await vfide.getAddress());
    });

    it("should deploy with correct beneficiary", async function () {
      expect(await vestingVault.BENEFICIARY()).to.equal(beneficiary.address);
    });

    it("should deploy with correct vaultHub", async function () {
      expect(await vestingVault.VAULT_HUB()).to.equal(await vaultHub.getAddress());
    });

    it("should deploy with correct allocation", async function () {
      expect(await vestingVault.ALLOCATION()).to.equal(ethers.parseEther("40000000"));
    });

    it("should set correct cliff period", async function () {
      expect(await vestingVault.CLIFF()).to.equal(90 * 24 * 60 * 60); // 90 days
    });

    it("should set correct vesting period", async function () {
      expect(await vestingVault.VESTING()).to.equal(36 * 30 * 24 * 60 * 60); // 1080 days
    });

    it("should revert on zero VFIDE", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      await expect(DevReserveVestingVault.deploy(
        ethers.ZeroAddress,
        beneficiary.address,
        await vaultHub.getAddress(),
        await securityHub.getAddress(),
        await ledger.getAddress(),
        await presale.getAddress(),
        ethers.parseEther("40000000")
      )).to.be.revertedWithCustomError(vestingVault, "DV_Zero");
    });

    it("should revert on zero beneficiary", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      await expect(DevReserveVestingVault.deploy(
        await vfide.getAddress(),
        ethers.ZeroAddress,
        await vaultHub.getAddress(),
        await securityHub.getAddress(),
        await ledger.getAddress(),
        await presale.getAddress(),
        ethers.parseEther("40000000")
      )).to.be.revertedWithCustomError(vestingVault, "DV_Zero");
    });

    it("should allow zero securityHub (optional)", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      const v = await DevReserveVestingVault.deploy(
        await vfide.getAddress(),
        beneficiary.address,
        await vaultHub.getAddress(),
        ethers.ZeroAddress,
        await ledger.getAddress(),
        await presale.getAddress(),
        ethers.parseEther("40000000")
      );
      expect(await v.SECURITY_HUB()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("syncStart", function () {
    it("should sync start time from presale", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      expect(await vestingVault.startTimestamp()).to.be.gt(0);
    });

    it("should calculate cliff timestamp correctly", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      const start = await vestingVault.startTimestamp();
      const cliff = await vestingVault.cliffTimestamp();
      const cliffPeriod = await vestingVault.CLIFF();
      
      expect(cliff).to.equal(start + cliffPeriod);
    });

    it("should calculate end timestamp correctly", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      const start = await vestingVault.startTimestamp();
      const end = await vestingVault.endTimestamp();
      const vesting = await vestingVault.VESTING();
      
      expect(end).to.equal(start + vesting);
    });

    it("should emit SyncedStart event", async function () {
      await presale.launch();
      await expect(vestingVault.syncStart())
        .to.emit(vestingVault, "SyncedStart");
    });

    it("should be idempotent", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      const start1 = await vestingVault.startTimestamp();
      
      await vestingVault.syncStart();
      const start2 = await vestingVault.startTimestamp();
      
      expect(start1).to.equal(start2);
    });
  });

  describe("claimable", function () {
    beforeEach(async function () {
      await presale.launch();
      await vestingVault.syncStart();
    });

    it("should return 0 before cliff", async function () {
      const claimable = await vestingVault.claimable();
      expect(claimable).to.equal(0);
    });

    it("should return partial amount after cliff", async function () {
      // Fast forward past cliff
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]); // +1 day
      await ethers.provider.send("evm_mine");
      
      const claimable = await vestingVault.claimable();
      expect(claimable).to.be.gt(0);
    });

    it("should return full allocation at end", async function () {
      // Fast forward to end
      const end = await vestingVault.endTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(end) + 1]);
      await ethers.provider.send("evm_mine");
      
      const claimable = await vestingVault.claimable();
      const allocation = await vestingVault.ALLOCATION();
      expect(claimable).to.equal(allocation);
    });

    it("should calculate linear vesting correctly", async function () {
      const start = await vestingVault.startTimestamp();
      const vesting = await vestingVault.VESTING();
      const allocation = await vestingVault.ALLOCATION();
      
      // Fast forward to 50% of vesting period
      const midpoint = Number(start) + Number(vesting) / 2;
      await ethers.provider.send("evm_setNextBlockTimestamp", [midpoint]);
      await ethers.provider.send("evm_mine");
      
      const claimable = await vestingVault.claimable();
      const expectedHalf = allocation / 2n;
      
      // Allow small deviation due to integer math
      expect(claimable).to.be.closeTo(expectedHalf, ethers.parseEther("10000"));
    });
  });

  describe("claim", function () {
    beforeEach(async function () {
      await presale.launch();
      await vestingVault.syncStart();
    });

    it("should revert before cliff", async function () {
      await expect(vestingVault.connect(beneficiary).claim())
        .to.be.revertedWith("DV_Cliff");
    });

    it("should allow claim after cliff", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.not.be.reverted;
    });

    it("should transfer to beneficiary's vault", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      const claimable = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      
      const vault = await vaultHub.vaultOf(beneficiary.address);
      const balance = await vfide.balanceOf(vault);
      
      expect(balance).to.equal(claimable);
    });

    it("should update totalClaimed", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      const claimableBefore = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      
      expect(await vestingVault.totalClaimed()).to.equal(claimableBefore);
    });

    it("should emit Claimed event", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.emit(vestingVault, "Claimed");
    });

    it("should revert if not beneficiary", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      await expect(vestingVault.connect(user).claim())
        .to.be.revertedWith("DV_NotBeneficiary");
    });

    it("should revert if vault locked", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      const vault = await vaultHub.ensureVault(beneficiary.address);
      await securityHub.setLocked(vault, true);
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.be.revertedWith("DV_VaultLocked");
    });

    it("should revert if claims paused", async function () {
      await vestingVault.connect(beneficiary).setPause(true);
      
      const cliff = await vestingVault.cliffTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.be.revertedWith("DV_Paused");
    });

    it("should handle multiple claims", async function () {
      const cliff = await vestingVault.cliffTimestamp();
      
      // First claim
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400]);
      await ethers.provider.send("evm_mine");
      await vestingVault.connect(beneficiary).claim();
      const claimed1 = await vestingVault.totalClaimed();
      
      // Second claim
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(cliff) + 86400 * 2]);
      await ethers.provider.send("evm_mine");
      await vestingVault.connect(beneficiary).claim();
      const claimed2 = await vestingVault.totalClaimed();
      
      expect(claimed2).to.be.gt(claimed1);
    });
  });

  describe("setPause", function () {
    it("should allow beneficiary to pause", async function () {
      await vestingVault.connect(beneficiary).setPause(true);
      expect(await vestingVault.claimsPaused()).to.equal(true);
    });

    it("should allow beneficiary to unpause", async function () {
      await vestingVault.connect(beneficiary).setPause(true);
      await vestingVault.connect(beneficiary).setPause(false);
      expect(await vestingVault.claimsPaused()).to.equal(false);
    });

    it("should emit PauseSet event", async function () {
      await expect(vestingVault.connect(beneficiary).setPause(true))
        .to.emit(vestingVault, "PauseSet")
        .withArgs(true);
    });

    it("should revert if not beneficiary", async function () {
      await expect(vestingVault.connect(user).setPause(true))
        .to.be.revertedWith("DV_NotBeneficiary");
    });
  });

  describe("Edge Cases", function () {
    it("should handle full vesting period", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      const end = await vestingVault.endTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(end) + 1]);
      await ethers.provider.send("evm_mine");
      
      await vestingVault.connect(beneficiary).claim();
      
      expect(await vestingVault.totalClaimed()).to.equal(await vestingVault.ALLOCATION());
    });

    it("should handle claiming everything in one go at end", async function () {
      await presale.launch();
      await vestingVault.syncStart();
      
      const end = await vestingVault.endTimestamp();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(end) + 1]);
      await ethers.provider.send("evm_mine");
      
      await vestingVault.connect(beneficiary).claim();
      
      const secondClaimable = await vestingVault.claimable();
      expect(secondClaimable).to.equal(0);
    });
  });
});
