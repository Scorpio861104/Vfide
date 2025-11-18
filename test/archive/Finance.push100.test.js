const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance: Push to 100% Coverage", function() {
  let registry, vault, token, dao, ledger, admin, user;

  beforeEach(async function() {
    [admin, dao, user] = await ethers.getSigners();
    
    // Deploy mocks
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);
    
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test", "TST");
    
    // Deploy StablecoinRegistry first
    const SR = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
    registry = await SR.deploy(dao.address, ledger.target);
    
    // Deploy EcoTreasuryVault with registry reference
    const EV = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");
    vault = await EV.deploy(dao.address, ledger.target, await registry.getAddress(), ethers.ZeroAddress);
  });

  describe("StablecoinRegistry TEST Helpers", function() {
    it("should exercise TEST_setOnlyDAOOff", async function() {
      await registry.connect(admin).TEST_setOnlyDAOOff(true);
      expect(await registry.TEST_onlyDAO_off()).to.equal(true);
      
      // Now non-DAO can call onlyDAO functions
      await registry.connect(admin).setDAO(admin.address);
      expect(await registry.dao()).to.equal(admin.address);
    });

    it("should exercise TEST_setForceDecimals", async function() {
      await registry.connect(admin).TEST_setForceDecimals(6, true);
      expect(await registry.TEST_forceDecimalsValue()).to.equal(6);
      expect(await registry.TEST_forceDecimalsReturn()).to.equal(true);
      
      // Turn off
      await registry.connect(admin).TEST_setForceDecimals(0, false);
      expect(await registry.TEST_forceDecimalsReturn()).to.equal(false);
    });

    it("should exercise TEST_if_deposit_zeroAmount - true branch", async function() {
      const result = await registry.TEST_if_deposit_zeroAmount(0);
      expect(result).to.equal(true);
    });

    it("should exercise TEST_if_deposit_zeroAmount - false branch", async function() {
      const result = await registry.TEST_if_deposit_zeroAmount(100);
      expect(result).to.equal(false);
    });

    it("should exercise TEST_if_send_zeroToOrAmt - zero address", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100);
      expect(result).to.equal(true);
    });

    it("should exercise TEST_if_send_zeroToOrAmt - zero amount", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(user.address, 0);
      expect(result).to.equal(true);
    });

    it("should exercise TEST_if_send_zeroToOrAmt - both non-zero", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(user.address, 100);
      expect(result).to.equal(false);
    });

    it("should exercise TEST_if_send_tokenIsZero - true branch", async function() {
      const result = await registry.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
      expect(result).to.equal(true);
    });

    it("should exercise TEST_if_send_tokenIsZero - false branch", async function() {
      const result = await registry.TEST_if_send_tokenIsZero(token.target);
      expect(result).to.equal(false);
    });
  });

  describe("StablecoinRegistry TEST Helpers - Additional", function() {
    it("should exercise TEST_cover_decimals_and_deposit with forceDecimalsReturn=true", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target,
        true, // forceDecimalsReturn
        6,    // forcedVal
        100,  // amount
        user.address // to
      );
      expect(result.usedForceReturn).to.equal(true);
    });

    it("should exercise TEST_cover_decimals_and_deposit with forceDecimalsReturn=false", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target,
        false, // forceDecimalsReturn
        0,
        100,
        user.address
      );
      expect(result.staticcallOk).to.equal(true);
    });

    it("should exercise TEST_cover_decimals_and_deposit with non-whitelisted token", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target,
        false,
        0,
        100,
        user.address
      );
      expect(result.depositNotWhite).to.equal(true);
    });

    it("should exercise TEST_cover_decimals_and_deposit with zero amount", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target,
        false,
        0,
        0, // zero amount
        user.address
      );
      expect(result.depositZeroAmt).to.equal(true);
    });

    it("should exercise TEST_cover_decimals_and_deposit with zero address recipient", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target,
        false,
        0,
        100,
        ethers.ZeroAddress // zero to
      );
      expect(result.sendZeroToOrAmt).to.equal(true);
    });

    it("should exercise TEST_cover_decimals_and_deposit with zero token address", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        ethers.ZeroAddress, // zero token
        false,
        0,
        100,
        user.address
      );
      expect(result.sendTokenZero).to.equal(true);
    });
  });

  describe("StablecoinRegistry Modifier Branches", function() {
    it("should test onlyDAO modifier - DAO can call", async function() {
      await registry.connect(dao).setDAO(user.address);
      expect(await registry.dao()).to.equal(user.address);
    });

    it("should test onlyDAO modifier - non-DAO reverts", async function() {
      await expect(
        registry.connect(admin).setDAO(user.address)
      ).to.be.reverted;
    });

    it("should test onlyDAO modifier - TEST_onlyDAO_off bypasses check", async function() {
      await registry.connect(admin).TEST_setOnlyDAOOff(true);
      await registry.connect(admin).setDAO(user.address);
      expect(await registry.dao()).to.equal(user.address);
    });
  });

  describe("StablecoinRegistry Admin Functions", function() {
    beforeEach(async function() {
      await registry.connect(admin).TEST_setOnlyDAOOff(true);
    });

    it("should test setLedger", async function() {
      const newLedger = await (await ethers.getContractFactory("LedgerMock")).deploy(false);
      await registry.connect(admin).setLedger(newLedger.target);
      expect(await registry.ledger()).to.equal(newLedger.target);
    });

    it("should test addAsset with forced decimals", async function() {
      await registry.connect(admin).TEST_setForceDecimals(6, true);
      await registry.connect(admin).addAsset(token.target, "USDC");
      
      const asset = await registry.assets(token.target);
      expect(asset.ok).to.equal(true);
      expect(asset.decimals).to.equal(6);
    });

    it("should test addAsset with staticcall decimals", async function() {
      await registry.connect(admin).TEST_setForceDecimals(0, false);
      await registry.connect(admin).addAsset(token.target, "TST");
      
      const asset = await registry.assets(token.target);
      expect(asset.ok).to.equal(true);
      expect(asset.decimals).to.equal(18);
    });

    it("should test removeAsset", async function() {
      await registry.connect(admin).addAsset(token.target, "TST");
      await registry.connect(admin).removeAsset(token.target);
      
      const asset = await registry.assets(token.target);
      expect(asset.ok).to.equal(false);
    });

    it("should test setSymbolHint", async function() {
      await registry.connect(admin).addAsset(token.target, "TST");
      await registry.connect(admin).setSymbolHint(token.target, "TEST");
      
      const asset = await registry.assets(token.target);
      expect(asset.symbolHint).to.equal("TEST");
    });
  });

  describe("EcoTreasuryVault Admin Functions", function() {
    beforeEach(async function() {
      await vault.connect(admin).TEST_setOnlyDAOOff_Tx(true);
    });

    it("should test setModules", async function() {
      const newLedger = await (await ethers.getContractFactory("LedgerMock")).deploy(false);
      const newRegistry = await (await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry")).deploy(dao.address, newLedger.target);
      
      await vault.connect(admin).setModules(user.address, newLedger.target, newRegistry.target, ethers.ZeroAddress);
      
      expect(await vault.dao()).to.equal(user.address);
      expect(await vault.ledger()).to.equal(newLedger.target);
      expect(await vault.stable()).to.equal(newRegistry.target);
    });
  });
});
