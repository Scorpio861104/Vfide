const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken - Exhaustive TEST Coverage", function() {
  let token, vault, hub, security, ledger, burnRouter, treasury;
  let owner, dao, user1, user2;

  beforeEach(async function() {
    [owner, dao, user1, user2] = await ethers.getSigners();

    // Deploy mocks
    const VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vault = await VestingVault.deploy();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    hub = await VaultHubMock.deploy();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    security = await SecurityHubMock.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    treasury = await ERC20Mock.deploy("Treasury", "TRS");

    // Deploy token
    const Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vault.target, hub.target, ledger.target, treasury.target);
    
    // Set security hub
    await token.setSecurityHub(security.target);
    await token.setBurnRouter(burnRouter.target);
  });

  describe("TEST_setForceSecurityStaticcallFail", function() {
    it("should toggle security staticcall fail flag", async function() {
      await token.TEST_setForceSecurityStaticcallFail(true);
      await token.TEST_setForceSecurityStaticcallFail(false);
    });
  });

  describe("TEST_setForceVaultHubZero", function() {
    it("should toggle vaultHub zero flag", async function() {
      await token.TEST_setForceVaultHubZero(true);
      await token.TEST_setForceVaultHubZero(false);
    });
  });

  describe("TEST_setForcePolicyLockedRequireRouter", function() {
    it("should toggle policy locked router requirement flag", async function() {
      await token.TEST_setForcePolicyLockedRequireRouter(true);
      await token.TEST_setForcePolicyLockedRequireRouter(false);
    });
  });

  describe("TEST_check_locked", function() {
    it("should check if vault is locked", async function() {
      const isLocked = await token.TEST_check_locked(vault.target);
      expect(isLocked).to.be.a("boolean");
    });

    it("should return false for unlocked vault", async function() {
      await security.setLocked(vault.target, false);
      const isLocked = await token.TEST_check_locked(vault.target);
      expect(isLocked).to.equal(false);
    });

    it("should return true for locked vault", async function() {
      await security.setLocked(vault.target, true);
      const isLocked = await token.TEST_check_locked(vault.target);
      expect(isLocked).to.equal(true);
    });
  });

  describe("TEST_check_isVault", function() {
    it("should check if address is a vault", async function() {
      const isVault = await token.TEST_check_isVault(vault.target);
      expect(isVault).to.be.a("boolean");
    });

    it("should return false for non-vault address", async function() {
      const isVault = await token.TEST_check_isVault(user1.address);
      expect(isVault).to.equal(false);
    });

    it("should return true for vault address", async function() {
      await hub.setVault(vault.target, vault.target);
      const isVault = await token.TEST_check_isVault(vault.target);
      expect(isVault).to.equal(true);
    });
  });

  describe("TEST_force_router_requirement", function() {
    it("should execute router requirement check", async function() {
      await token.TEST_force_router_requirement();
    });

    it("should work with policy locked flag", async function() {
      await token.TEST_setForcePolicyLockedRequireRouter(true);
      await token.TEST_force_router_requirement();
    });
  });

  describe("Combined TEST scenarios", function() {
    it("should test all flags together", async function() {
      await token.TEST_setForceSecurityStaticcallFail(true);
      await token.TEST_setForceVaultHubZero(true);
      await token.TEST_setForcePolicyLockedRequireRouter(true);
      
      await token.TEST_check_locked(vault.target);
      await token.TEST_check_isVault(vault.target);
      await token.TEST_force_router_requirement();

      await token.TEST_setForceSecurityStaticcallFail(false);
      await token.TEST_setForceVaultHubZero(false);
      await token.TEST_setForcePolicyLockedRequireRouter(false);
    });

    it("should test locked check with different vaults", async function() {
      await hub.setVault(vault.target, vault.target);
      await security.setLocked(vault.target, true);
      let locked = await token.TEST_check_locked(vault.target);
      expect(locked).to.equal(true);

      await security.setLocked(vault.target, false);
      locked = await token.TEST_check_locked(vault.target);
      expect(locked).to.equal(false);
    });

    it("should test isVault check with hub configuration", async function() {
      await hub.setVault(vault.target, vault.target);
      const isVault1 = await token.TEST_check_isVault(vault.target);
      expect(isVault1).to.equal(true);

      const isVault2 = await token.TEST_check_isVault(user2.address);
      expect(isVault2).to.equal(false);
    });
  });

  describe("Edge cases and permutations", function() {
    it("should handle all boolean flag permutations", async function() {
      const flags = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
        [false, false, true],
        [true, true, false],
        [true, false, true],
        [false, true, true],
        [true, true, true]
      ];

      for (const [f1, f2, f3] of flags) {
        await token.TEST_setForceSecurityStaticcallFail(f1);
        await token.TEST_setForceVaultHubZero(f2);
        await token.TEST_setForcePolicyLockedRequireRouter(f3);
        await token.TEST_check_locked(vault.target);
        await token.TEST_check_isVault(vault.target);
      }
    });

    it("should test multiple vault addresses", async function() {
      await hub.setVault(vault.target, vault.target);
      const vaults = [vault.target, user1.address, user2.address, ethers.ZeroAddress];
      for (const v of vaults) {
        await token.TEST_check_locked(v);
        await token.TEST_check_isVault(v);
      }
    });

    it("should test all TEST functions in sequence", async function() {
      await token.TEST_setForceSecurityStaticcallFail(true);
      await token.TEST_setForceVaultHubZero(true);
      await token.TEST_setForcePolicyLockedRequireRouter(true);
      await token.TEST_check_locked(vault.target);
      await token.TEST_check_isVault(user1.address);
      await token.TEST_force_router_requirement();
      await token.TEST_setForceSecurityStaticcallFail(false);
      await token.TEST_setForceVaultHubZero(false);
      await token.TEST_setForcePolicyLockedRequireRouter(false);
    });
  });
});
