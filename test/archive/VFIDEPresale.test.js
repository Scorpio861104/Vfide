const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEPresale", function () {
  let presale, vfide, vaultHub, registry, ledger, securityHub;
  let owner, buyer1, buyer2, referrer;
  let usdc;

  beforeEach(async function () {
    [owner, buyer1, buyer2, referrer] = await ethers.getSigners();

    // Mock VFIDE Token
    const VFIDEMock = await ethers.getContractFactory("VFIDEPresaleMock");
    vfide = await VFIDEMock.deploy();

    // Mock VaultHub
    const VaultHubMock = await ethers.getContractFactory("VaultHubPresaleMock");
    vaultHub = await VaultHubMock.deploy();

    // Mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20PresaleMock");
    usdc = await ERC20Mock.deploy();

    // Mock StablecoinRegistry
    const RegistryMock = await ethers.getContractFactory("StablecoinRegistryPresaleMock");
    registry = await RegistryMock.deploy();
    await registry.allow(await usdc.getAddress());

    // Mock Ledger
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    // Mock SecurityHub
    const SecurityMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityMock.deploy();

    // Deploy VFIDEPresale
    const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
    presale = await VFIDEPresale.deploy(
      await vfide.getAddress(),
      await vaultHub.getAddress(),
      await registry.getAddress(),
      await ledger.getAddress(),
      await securityHub.getAddress()
    );

    // Mint USDC to buyers
    await usdc.mint(buyer1.address, 1000000e6); // 1M USDC
    await usdc.mint(buyer2.address, 1000000e6);
  });

  describe("Deployment", function () {
    it("should deploy with correct vfide", async function () {
      expect(await presale.vfide()).to.equal(await vfide.getAddress());
    });

    it("should deploy with correct vaultHub", async function () {
      expect(await presale.vaultHub()).to.equal(await vaultHub.getAddress());
    });

    it("should deploy with correct registry", async function () {
      expect(await presale.registry()).to.equal(await registry.getAddress());
    });

    it("should start as active", async function () {
      expect(await presale.active()).to.equal(true);
    });

    it("should set default tier prices", async function () {
      expect(await presale.pricesMicroUSD(0)).to.equal(30000);
      expect(await presale.pricesMicroUSD(1)).to.equal(50000);
      expect(await presale.pricesMicroUSD(2)).to.equal(70000);
    });

    it("should enable all tiers by default", async function () {
      expect(await presale.tierEnabled(0)).to.equal(true);
      expect(await presale.tierEnabled(1)).to.equal(true);
      expect(await presale.tierEnabled(2)).to.equal(true);
    });

    it("should set default maxPerAddress", async function () {
      expect(await presale.maxPerAddress()).to.equal(ethers.parseEther("1500000"));
    });

    it("should set default referral bonuses", async function () {
      expect(await presale.buyerBonusBps()).to.equal(100);
      expect(await presale.referrerBonusBps()).to.equal(200);
    });

    it("should revert on zero vfide", async function () {
      const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
      await expect(VFIDEPresale.deploy(
        ethers.ZeroAddress,
        await vaultHub.getAddress(),
        await registry.getAddress(),
        await ledger.getAddress(),
        await securityHub.getAddress()
      )).to.be.revertedWithCustomError(presale, "PR_Zero");
    });

    it("should revert on zero vaultHub", async function () {
      const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
      await expect(VFIDEPresale.deploy(
        await vfide.getAddress(),
        ethers.ZeroAddress,
        await registry.getAddress(),
        await ledger.getAddress(),
        await securityHub.getAddress()
      )).to.be.revertedWithCustomError(presale, "PR_Zero");
    });

    it("should revert on zero registry", async function () {
      const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
      await expect(VFIDEPresale.deploy(
        await vfide.getAddress(),
        await vaultHub.getAddress(),
        ethers.ZeroAddress,
        await ledger.getAddress(),
        await securityHub.getAddress()
      )).to.be.revertedWithCustomError(presale, "PR_Zero");
    });

    it("should allow zero ledger (optional)", async function () {
      const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
      const p = await VFIDEPresale.deploy(
        await vfide.getAddress(),
        await vaultHub.getAddress(),
        await registry.getAddress(),
        ethers.ZeroAddress,
        await securityHub.getAddress()
      );
      expect(await p.ledger()).to.equal(ethers.ZeroAddress);
    });

    it("should allow zero securityHub (optional)", async function () {
      const VFIDEPresale = await ethers.getContractFactory("VFIDEPresale");
      const p = await VFIDEPresale.deploy(
        await vfide.getAddress(),
        await vaultHub.getAddress(),
        await registry.getAddress(),
        await ledger.getAddress(),
        ethers.ZeroAddress
      );
      expect(await p.securityHub()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setActive", function () {
    it("should allow owner to deactivate", async function () {
      await presale.setActive(false);
      expect(await presale.active()).to.equal(false);
    });

    it("should allow owner to reactivate", async function () {
      await presale.setActive(false);
      await presale.setActive(true);
      expect(await presale.active()).to.equal(true);
    });

    it("should emit ActiveSet event", async function () {
      await expect(presale.setActive(false))
        .to.emit(presale, "ActiveSet")
        .withArgs(false);
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).setActive(false))
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("setTierEnabled", function () {
    it("should allow owner to disable tier", async function () {
      await presale.setTierEnabled(0, false);
      expect(await presale.tierEnabled(0)).to.equal(false);
    });

    it("should allow owner to enable disabled tier", async function () {
      await presale.setTierEnabled(1, false);
      await presale.setTierEnabled(1, true);
      expect(await presale.tierEnabled(1)).to.equal(true);
    });

    it("should emit TierEnabled event", async function () {
      await expect(presale.setTierEnabled(2, false))
        .to.emit(presale, "TierEnabled")
        .withArgs(2, false);
    });

    it("should revert on invalid tier", async function () {
      await expect(presale.setTierEnabled(3, true))
        .to.be.revertedWithCustomError(presale, "PR_BadTier");
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).setTierEnabled(0, false))
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("setPrices", function () {
    it("should allow owner to update prices", async function () {
      await presale.setPrices(40000, 60000, 80000);
      expect(await presale.pricesMicroUSD(0)).to.equal(40000);
      expect(await presale.pricesMicroUSD(1)).to.equal(60000);
      expect(await presale.pricesMicroUSD(2)).to.equal(80000);
    });

    it("should emit PricesSet event", async function () {
      await expect(presale.setPrices(40000, 60000, 80000))
        .to.emit(presale, "PricesSet")
        .withArgs(40000, 60000, 80000);
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).setPrices(40000, 60000, 80000))
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("setMaxPerAddress", function () {
    it("should allow owner to update cap", async function () {
      const newCap = ethers.parseEther("2000000");
      await presale.setMaxPerAddress(newCap);
      expect(await presale.maxPerAddress()).to.equal(newCap);
    });

    it("should emit MaxPerAddressSet event", async function () {
      const newCap = ethers.parseEther("2000000");
      await expect(presale.setMaxPerAddress(newCap))
        .to.emit(presale, "MaxPerAddressSet")
        .withArgs(newCap);
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).setMaxPerAddress(ethers.parseEther("2000000")))
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("setReferralBps", function () {
    it("should allow owner to update bonuses", async function () {
      await presale.setReferralBps(150, 300);
      expect(await presale.buyerBonusBps()).to.equal(150);
      expect(await presale.referrerBonusBps()).to.equal(300);
    });

    it("should emit ReferralBpsSet event", async function () {
      await expect(presale.setReferralBps(150, 300))
        .to.emit(presale, "ReferralBpsSet")
        .withArgs(150, 300);
    });

    it("should allow zero bonuses", async function () {
      await presale.setReferralBps(0, 0);
      expect(await presale.buyerBonusBps()).to.equal(0);
      expect(await presale.referrerBonusBps()).to.equal(0);
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).setReferralBps(150, 300))
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("launch", function () {
    it("should set presaleStartTime", async function () {
      await presale.launchNow();
      const startTime = await presale.presaleStartTime();
      expect(startTime).to.be.gt(0);
    });

    it("should emit Launched event", async function () {
      const tx = await presale.launchNow();
      await expect(tx).to.emit(presale, "Launched");
    });

    it("should revert if already launched", async function () {
      await presale.launchNow();
      await expect(presale.launchNow())
        .to.be.revertedWithCustomError(presale, "PR_StartSet");
    });

    it("should revert if non-owner tries", async function () {
      await expect(presale.connect(buyer1).launchNow())
        .to.be.revertedWith("OWN:not-owner");
    });
  });

  describe("Edge Cases", function () {
    it("should handle transferOwnership", async function () {
      await presale.transferOwnership(buyer1.address);
      expect(await presale.owner()).to.equal(buyer1.address);
    });

    it("should allow new owner to call admin functions", async function () {
      await presale.transferOwnership(buyer1.address);
      await expect(presale.connect(buyer1).setActive(false))
        .to.not.be.reverted;
    });

    it("should prevent old owner from calling admin functions", async function () {
      await presale.transferOwnership(buyer1.address);
      await expect(presale.connect(owner).setActive(false))
        .to.be.revertedWith("OWN:not-owner");
    });

    it("should handle all tiers disabled", async function () {
      await presale.setTierEnabled(0, false);
      await presale.setTierEnabled(1, false);
      await presale.setTierEnabled(2, false);
      
      expect(await presale.tierEnabled(0)).to.equal(false);
      expect(await presale.tierEnabled(1)).to.equal(false);
      expect(await presale.tierEnabled(2)).to.equal(false);
    });

    it("should handle very low prices", async function () {
      await presale.setPrices(1, 1, 1);
      expect(await presale.pricesMicroUSD(0)).to.equal(1);
    });

    it("should handle very high prices", async function () {
      const maxPrice = 2**32 - 1;
      await presale.setPrices(maxPrice, maxPrice, maxPrice);
      expect(await presale.pricesMicroUSD(0)).to.equal(maxPrice);
    });

    it("should handle very high maxPerAddress", async function () {
      const hugeCap = ethers.parseEther("75000000");
      await presale.setMaxPerAddress(hugeCap);
      expect(await presale.maxPerAddress()).to.equal(hugeCap);
    });

    it("should handle zero maxPerAddress", async function () {
      await presale.setMaxPerAddress(0);
      expect(await presale.maxPerAddress()).to.equal(0);
    });

    it("should handle max referral bonuses", async function () {
      await presale.setReferralBps(2000, 3000); // Max allowed: 20% buyer, 30% referrer
      expect(await presale.buyerBonusBps()).to.equal(2000);
      expect(await presale.referrerBonusBps()).to.equal(3000);
    });
  });

  describe("Module Updates", function () {
    it("should allow owner to update all modules", async function () {
      const newVfide = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      const newRegistry = ethers.Wallet.createRandom().address;
      
      await presale.setModules(newVfide, newHub, newRegistry, await ledger.getAddress(), await securityHub.getAddress());
      
      expect(await presale.vfide()).to.equal(newVfide);
      expect(await presale.vaultHub()).to.equal(newHub);
      expect(await presale.registry()).to.equal(newRegistry);
    });

    it("should emit ModulesSet", async function () {
      const newVfide = ethers.Wallet.createRandom().address;
      const newHub = ethers.Wallet.createRandom().address;
      const newRegistry = ethers.Wallet.createRandom().address;
      
      await expect(presale.setModules(newVfide, newHub, newRegistry, await ledger.getAddress(), await securityHub.getAddress()))
        .to.emit(presale, "ModulesSet");
    });

    it("should revert on zero vfide in setModules", async function () {
      await expect(presale.setModules(
        ethers.ZeroAddress,
        await vaultHub.getAddress(),
        await registry.getAddress(),
        await ledger.getAddress(),
        await securityHub.getAddress()
      )).to.be.revertedWithCustomError(presale, "PR_Zero");
    });

    it("should revert if non-owner tries setModules", async function () {
      const newVfide = ethers.Wallet.createRandom().address;
      await expect(presale.connect(buyer1).setModules(
        newVfide,
        await vaultHub.getAddress(),
        await registry.getAddress(),
        await ledger.getAddress(),
        await securityHub.getAddress()
      )).to.be.revertedWith("OWN:not-owner");
    });
  });
});
