const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevReserveVestingVault", function () {
  let vestingVault, vfide, vaultHub, securityHub, ledger, presale;
  let deployer, beneficiary, user;
  const allocation = ethers.parseEther("40000000"); // 40M VFIDE

  beforeEach(async function () {
    [deployer, beneficiary, user] = await ethers.getSigners();

    // Deploy mocks
    const VFIDEMock = await ethers.getContractFactory("VFIDEDevVestingMock");
    vfide = await VFIDEMock.deploy();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();

    const SecurityMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityMock.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const PresaleMock = await ethers.getContractFactory("PresaleDevVestingMock");
    presale = await PresaleMock.deploy();

    // Deploy DevReserveVestingVault
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

    // Mint tokens to vesting vault
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
      expect(await vestingVault.ALLOCATION()).to.equal(allocation);
    });

    it("should set correct cliff period", async function () {
      expect(await vestingVault.CLIFF()).to.equal(90 * 24 * 60 * 60); // 90 days
    });

    it("should set correct vesting period", async function () {
      expect(await vestingVault.VESTING()).to.equal(36 * 30 * 24 * 60 * 60); // 1080 days
    });

    it("should revert on zero VFIDE", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      await expect(
        DevReserveVestingVault.deploy(
          ethers.ZeroAddress,
          beneficiary.address,
          await vaultHub.getAddress(),
          await securityHub.getAddress(),
          await ledger.getAddress(),
          await presale.getAddress(),
          allocation
        )
      ).to.be.revertedWithCustomError(vestingVault, "DV_Zero");
    });

    it("should revert on zero beneficiary", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      await expect(
        DevReserveVestingVault.deploy(
          await vfide.getAddress(),
          ethers.ZeroAddress,
          await vaultHub.getAddress(),
          await securityHub.getAddress(),
          await ledger.getAddress(),
          await presale.getAddress(),
          allocation
        )
      ).to.be.revertedWithCustomError(vestingVault, "DV_Zero");
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
        allocation
      );
      expect(await v.SECURITY_HUB()).to.equal(ethers.ZeroAddress);
    });

    it("should revert on zero allocation", async function () {
      const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
      await expect(
        DevReserveVestingVault.deploy(
          await vfide.getAddress(),
          beneficiary.address,
          await vaultHub.getAddress(),
          await securityHub.getAddress(),
          await ledger.getAddress(),
          await presale.getAddress(),
          0
        )
      ).to.be.revertedWithCustomError(vestingVault, "DV_Zero");
    });
  });

  describe("Views - vested()", function () {
    it("should return 0 before presale launch", async function () {
      expect(await vestingVault.vested()).to.equal(0);
    });

    it("should return 0 before cliff", async function () {
      await presale.launchNow();
      
      // Check vested() returns 0 (view calculates without syncing)
      expect(await vestingVault.vested()).to.equal(0);
    });

    it("should return partial amount after cliff", async function () {
      await presale.launchNow();
      
      // Advance to cliff + 1 day
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      const vested = await vestingVault.vested();
      expect(vested).to.be.gt(0);
      expect(vested).to.be.lt(allocation);
    });

    it("should return full allocation at end", async function () {
      await presale.launchNow();
      
      // Advance past full vesting period
      const cliff = 90 * 24 * 60 * 60;
      const vesting = 36 * 30 * 24 * 60 * 60;
      await time.increase(cliff + vesting + 1);
      
      expect(await vestingVault.vested()).to.equal(allocation);
    });

    it("should calculate linear vesting correctly", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      const vesting = 36 * 30 * 24 * 60 * 60;
      
      // At cliff: 0 vested
      await time.increase(cliff);
      expect(await vestingVault.vested()).to.equal(0);
      
      // At cliff + 50% vesting: ~50% vested
      await time.increase(vesting / 2);
      const vestedMid = await vestingVault.vested();
      expect(vestedMid).to.be.closeTo(allocation / 2n, allocation / 100n); // Within 1%
      
      // At end: 100% vested
      await time.increase(vesting / 2);
      expect(await vestingVault.vested()).to.equal(allocation);
    });
  });

  describe("Views - claimable()", function () {
    it("should return 0 before cliff", async function () {
      await presale.launchNow();
      expect(await vestingVault.claimable()).to.equal(0);
    });

    it("should return vested minus claimed", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      const claimable1 = await vestingVault.claimable();
      expect(claimable1).to.be.gt(0);
      
      // Claim
      await vestingVault.connect(beneficiary).claim();
      
      // Should be 0 now
      expect(await vestingVault.claimable()).to.equal(0);
      
      // Advance time
      await time.increase(24 * 60 * 60);
      const claimable2 = await vestingVault.claimable();
      expect(claimable2).to.be.gt(0);
    });
  });

  describe("Claim", function () {
    it("should revert if presale not launched", async function () {
      await expect(
        vestingVault.connect(beneficiary).claim()
      ).to.be.revertedWithCustomError(vestingVault, "DV_NotStarted");
    });

    it("should revert before cliff", async function () {
      await presale.launchNow();
      await expect(
        vestingVault.connect(beneficiary).claim()
      ).to.be.revertedWithCustomError(vestingVault, "DV_NothingToClaim");
    });

    it("should allow claim after cliff", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      const claimableBefore = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      
      expect(await vestingVault.totalClaimed()).to.be.closeTo(claimableBefore, ethers.parseEther("1000"));
    });

    it("should transfer to beneficiary's vault", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      // Trigger vault creation
      await vestingVault.beneficiaryVault();
      const vault = await vaultHub.vaultOf(beneficiary.address);
      const balanceBefore = await vfide.balanceOf(vault);
      
      const claimable = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      
      const balanceAfter = await vfide.balanceOf(vault);
      expect(balanceAfter - balanceBefore).to.be.closeTo(claimable, ethers.parseEther("1000"));
    });

    it("should emit Claimed event", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      // Trigger vault creation
      await vestingVault.beneficiaryVault();
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.emit(vestingVault, "Claimed");
    });

    it("should revert if not beneficiary", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      await expect(
        vestingVault.connect(user).claim()
      ).to.be.revertedWithCustomError(vestingVault, "DV_NotBeneficiary");
    });

    it("should revert if vault is locked", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      // Trigger vault creation
      await vestingVault.beneficiaryVault();
      const vault = await vaultHub.vaultOf(beneficiary.address);
      await securityHub.setLocked(vault, true);
      
      await expect(
        vestingVault.connect(beneficiary).claim()
      ).to.be.revertedWithCustomError(vestingVault, "DV_VaultLocked");
    });

    it("should allow multiple partial claims", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      // First claim
      const claimable1 = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      const totalAfterFirst = await vestingVault.totalClaimed();
      expect(totalAfterFirst).to.be.closeTo(claimable1, ethers.parseEther("1000")); // Within 1000 tokens
      
      // Advance time
      await time.increase(24 * 60 * 60);
      
      // Second claim
      const claimable2 = await vestingVault.claimable();
      await vestingVault.connect(beneficiary).claim();
      const totalAfterSecond = await vestingVault.totalClaimed();
      expect(totalAfterSecond).to.be.gt(totalAfterFirst);
    });

    it("should sync start on first claim", async function () {
      await presale.launchNow();
      
      expect(await vestingVault.startTimestamp()).to.equal(0);
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      await vestingVault.connect(beneficiary).claim();
      
      expect(await vestingVault.startTimestamp()).to.be.gt(0);
      expect(await vestingVault.cliffTimestamp()).to.be.gt(0);
      expect(await vestingVault.endTimestamp()).to.be.gt(0);
    });

    it("should emit SyncedStart event on first claim", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      await expect(vestingVault.connect(beneficiary).claim())
        .to.emit(vestingVault, "SyncedStart");
    });
  });

  describe("pauseClaims", function () {
    it("should allow beneficiary to pause", async function () {
      await vestingVault.connect(beneficiary).pauseClaims(true);
      expect(await vestingVault.claimsPaused()).to.be.true;
    });

    it("should allow beneficiary to unpause", async function () {
      await vestingVault.connect(beneficiary).pauseClaims(true);
      await vestingVault.connect(beneficiary).pauseClaims(false);
      expect(await vestingVault.claimsPaused()).to.be.false;
    });

    it("should emit PauseSet event", async function () {
      await expect(vestingVault.connect(beneficiary).pauseClaims(true))
        .to.emit(vestingVault, "PauseSet")
        .withArgs(true);
    });

    it("should revert if not beneficiary", async function () {
      await expect(
        vestingVault.connect(user).pauseClaims(true)
      ).to.be.revertedWithCustomError(vestingVault, "DV_NotBeneficiary");
    });

    it("should prevent claims when paused", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      await vestingVault.connect(beneficiary).pauseClaims(true);
      
      await expect(
        vestingVault.connect(beneficiary).claim()
      ).to.be.revertedWithCustomError(vestingVault, "DV_Paused");
    });

    it("should allow claims when unpaused", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      await vestingVault.connect(beneficiary).pauseClaims(true);
      await vestingVault.connect(beneficiary).pauseClaims(false);
      
      await expect(vestingVault.connect(beneficiary).claim()).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("should handle full vesting period", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      const vesting = 36 * 30 * 24 * 60 * 60;
      await time.increase(cliff + vesting + 1);
      
      await vestingVault.connect(beneficiary).claim();
      expect(await vestingVault.totalClaimed()).to.equal(allocation);
    });

    it("should handle claiming everything in one go at end", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      const vesting = 36 * 30 * 24 * 60 * 60;
      await time.increase(cliff + vesting + 1);
      
      await vestingVault.connect(beneficiary).claim();
      
      expect(await vestingVault.totalClaimed()).to.equal(allocation);
    });

    it("should correctly track totalClaimed across claims", async function () {
      await presale.launchNow();
      
      const cliff = 90 * 24 * 60 * 60;
      await time.increase(cliff + 24 * 60 * 60);
      
      // First claim
      await vestingVault.connect(beneficiary).claim();
      const firstClaimed = await vestingVault.totalClaimed();
      expect(firstClaimed).to.be.gt(0);
      
      // Advance more time
      await time.increase(24 * 60 * 60);
      
      // Second claim should work and increase total
      await vestingVault.connect(beneficiary).claim();
      const secondClaimed = await vestingVault.totalClaimed();
      expect(secondClaimed).to.be.gt(firstClaimed);
    });

    it("should handle beneficiaryVault call", async function () {
      await vestingVault.beneficiaryVault();
      const vault = await vaultHub.vaultOf(beneficiary.address);
      expect(vault).to.not.equal(ethers.ZeroAddress);
    });
  });
});
