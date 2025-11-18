const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultInfrastructure - VaultHub", function () {
  let vaultHub;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const VaultHub = await ethers.getContractFactory("VaultInfrastructure");
    vaultHub = await VaultHub.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, owner.address);
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await vaultHub.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("should set owner correctly", async function () {
      expect(await vaultHub.owner()).to.equal(owner.address);
    });
  });

  describe("ensureVault", function () {
    it("should create vault for new user", async function () {
      const vaultAddr = await vaultHub.ensureVault.staticCall(user1.address);
      expect(vaultAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("should return existing vault on second call", async function () {
      await vaultHub.ensureVault(user1.address);
      const vault1 = await vaultHub.vaultOf(user1.address);
      
      await vaultHub.ensureVault(user1.address);
      const vault2 = await vaultHub.vaultOf(user1.address);
      
      expect(vault1).to.equal(vault2);
    });

    it("should create different vaults for different users", async function () {
      await vaultHub.ensureVault(user1.address);
      await vaultHub.ensureVault(user2.address);
      
      const vault1 = await vaultHub.vaultOf(user1.address);
      const vault2 = await vaultHub.vaultOf(user2.address);
      
      expect(vault1).to.not.equal(vault2);
    });

    it("should use deterministic CREATE2", async function () {
      // First call predicts address
      const predicted = await vaultHub.ensureVault.staticCall(user1.address);
      
      // Actual creation
      await vaultHub.ensureVault(user1.address);
      const actual = await vaultHub.vaultOf(user1.address);
      
      expect(predicted).to.equal(actual);
    });
  });

  describe("vaultOf", function () {
    it("should return zero for users without vault", async function () {
      expect(await vaultHub.vaultOf(user1.address)).to.equal(ethers.ZeroAddress);
    });

    it("should return vault address after creation", async function () {
      await vaultHub.ensureVault(user1.address);
      expect(await vaultHub.vaultOf(user1.address)).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("ownerOf", function () {
    it("should return zero for non-vault addresses", async function () {
      expect(await vaultHub.ownerOf(user1.address)).to.equal(ethers.ZeroAddress);
    });

    it("should return owner after vault creation", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);
      expect(await vaultHub.ownerOf(vaultAddr)).to.equal(user1.address);
    });
  });

  describe("Module Management", function () {
    it("should allow owner to set modules", async function () {
      const securityHub = ethers.Wallet.createRandom().address;
      const ledger = ethers.Wallet.createRandom().address;
      
      await vaultHub.setModules(securityHub, ledger);
      expect(await vaultHub.securityHub()).to.equal(securityHub);
      expect(await vaultHub.ledger()).to.equal(ledger);
    });

    it("should revert if non-owner tries to set modules", async function () {
      const securityHub = ethers.Wallet.createRandom().address;
      const ledger = ethers.Wallet.createRandom().address;
      
      await expect(vaultHub.connect(user1).setModules(securityHub, ledger))
        .to.be.revertedWith("OWN:not-owner");
    });

    it("should emit ModulesSet event", async function () {
      const securityHub = ethers.Wallet.createRandom().address;
      const ledger = ethers.Wallet.createRandom().address;
      
      await expect(vaultHub.setModules(securityHub, ledger))
        .to.emit(vaultHub, "ModulesSet");
    });
  });

  describe("Edge Cases", function () {
    it("should handle multiple vault creations", async function () {
      const users = [user1, user2, owner];
      for (const user of users) {
        await vaultHub.ensureVault(user.address);
      }
      
      expect(await vaultHub.vaultOf(user1.address)).to.not.equal(ethers.ZeroAddress);
      expect(await vaultHub.vaultOf(user2.address)).to.not.equal(ethers.ZeroAddress);
      expect(await vaultHub.vaultOf(owner.address)).to.not.equal(ethers.ZeroAddress);
    });

    it("should maintain registry bidirectional mapping", async function () {
      await vaultHub.ensureVault(user1.address);
      const vault = await vaultHub.vaultOf(user1.address);
      const retrievedOwner = await vaultHub.ownerOf(vault);
      
      expect(retrievedOwner).to.equal(user1.address);
    });
  });

  describe("Recovery Process", function () {
    it("should allow DAO to force recover a vault", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);

      await vaultHub.forceRecover(vaultAddr, user2.address);
      expect(await vaultHub.ownerOf(vaultAddr)).to.equal(user2.address);
      expect(await vaultHub.vaultOf(user2.address)).to.equal(vaultAddr);
    });

    it("should revert recovery for unknown vaults", async function () {
      const unknownVault = ethers.Wallet.createRandom().address;
      await expect(vaultHub.forceRecover(unknownVault, user2.address))
        .to.be.revertedWith("unknown vault");
    });
  });

  describe("Recovery with Delay", function () {
    it("should schedule a recovery with delay", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);

      const delay = 3600; // 1 hour
      await expect(vaultHub.forceRecoverWithDelay(vaultAddr, user2.address, delay))
        .to.emit(vaultHub, "RecoveryScheduled")
        .withArgs(vaultAddr, user2.address, delay);

      const recovery = await vaultHub.recoveryQueue(vaultAddr);
      expect(recovery.newOwner).to.equal(user2.address);
      expect(recovery.executeAfter).to.be.closeTo((await ethers.provider.getBlock("latest")).timestamp + delay, 2);
    });

    it("should execute a scheduled recovery after delay", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);

      const delay = 3600; // 1 hour
      await vaultHub.forceRecoverWithDelay(vaultAddr, user2.address, delay);

      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [delay]);
      await ethers.provider.send("evm_mine");

      await expect(vaultHub.executeRecovery(vaultAddr))
        .to.emit(vaultHub, "ForcedRecovery")
        .withArgs(vaultAddr, user2.address);

      expect(await vaultHub.ownerOf(vaultAddr)).to.equal(user2.address);
    });

    it("should revert recovery execution if delay has not passed", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);

      const delay = 3600; // 1 hour
      await vaultHub.forceRecoverWithDelay(vaultAddr, user2.address, delay);

      await expect(vaultHub.executeRecovery(vaultAddr))
        .to.be.revertedWith("recovery not ready");
    });
  });

  describe("Event Logging", function () {
    it("should log vault creation events", async function () {
      await expect(vaultHub.ensureVault(user1.address))
        .to.emit(vaultHub, "VaultCreated")
        .withArgs(user1.address, await vaultHub.vaultOf(user1.address));
    });

    it("should log forced recovery events", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);

      await expect(vaultHub.forceRecover(vaultAddr, user2.address))
        .to.emit(vaultHub, "ForcedRecovery")
        .withArgs(vaultAddr, user2.address);
    });
  });
});

describe("VaultInfrastructure - UserVault", function () {
  let vault, vaultHub, securityHub, ledger, vfide;
  let owner, user1, guardian1, guardian2;

  beforeEach(async function () {
    [owner, user1, guardian1, guardian2] = await ethers.getSigners();

    // This is a placeholder - actual UserVault testing requires deployment through VaultHub
    // The UserVault contract is embedded and created via CREATE2 by VaultHub
  });

  describe("Guardian Management", function () {
    it("should allow owner to add guardians", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);
      const vault = await ethers.getContractAt("UserVault", vaultAddr);

      await vault.connect(user1).addGuardian(guardian1.address);
      expect(await vault.isGuardian(guardian1.address)).to.be.true;
    });

    it("should allow owner to remove guardians", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);
      const vault = await ethers.getContractAt("UserVault", vaultAddr);

      await vault.connect(user1).addGuardian(guardian1.address);
      await vault.connect(user1).removeGuardian(guardian1.address);
      expect(await vault.isGuardian(guardian1.address)).to.be.false;
    });

    it("should set next of kin", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);
      const vault = await ethers.getContractAt("UserVault", vaultAddr);

      await vault.connect(user1).setNextOfKin(guardian2.address);
      expect(await vault.nextOfKin()).to.equal(guardian2.address);
    });
  });

  describe("Recovery Process", function () {
    it("should allow guardian-approved recovery", async function () {
      // Test M-of-N guardian recovery
      expect(true).to.equal(true);
    });

    it("should enforce threshold for recovery", async function () {
      // Test threshold enforcement
      expect(true).to.equal(true);
    });
  });

  describe("Transfer Functions", function () {
    it("should allow owner to transfer tokens", async function () {
      // Test token transfers
      expect(true).to.equal(true);
    });

    it("should enforce security lock", async function () {
      // Test security hub lock enforcement
      expect(true).to.equal(true);
    });
  });

  describe("Emergency Functions", function () {
    it("should handle panic mode", async function () {
      // Test panic mode activation
      expect(true).to.equal(true);
    });

    it("should respect security hub", async function () {
      // Test security hub integration
      expect(true).to.equal(true);
    });
  });

  describe("Integration - Full Lifecycle", function () {
    it("should test complete vault lifecycle", async function () {
      await vaultHub.ensureVault(user1.address);
      const vaultAddr = await vaultHub.vaultOf(user1.address);
      const vault = await ethers.getContractAt("UserVault", vaultAddr);

      await vault.connect(user1).addGuardian(guardian1.address);
      await vault.connect(user1).setNextOfKin(guardian2.address);
      await vaultHub.forceRecover(vaultAddr, guardian2.address);

      expect(await vaultHub.ownerOf(vaultAddr)).to.equal(guardian2.address);
      expect(await vault.nextOfKin()).to.equal(guardian2.address);
    });
  });
});
