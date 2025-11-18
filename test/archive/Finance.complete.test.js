const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Finance Complete Coverage", function() {
  let registry, vault, ledger, token, dao, admin, user;

  beforeEach(async function() {
    [dao, admin, user] = await ethers.getSigners();

    const LedgerMock = await ethers.getContractFactory("contracts-min/mocks/LedgerMock.sol:LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const TK = await ethers.getContractFactory("contracts-min/mocks/ERC20Mock.sol:ERC20Mock");
    token = await TK.deploy("Test", "TST");

    const SR = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
    registry = await SR.deploy(dao.address, ledger.target);

    const EV = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");
    vault = await EV.deploy(dao.address, ledger.target, await registry.getAddress(), ethers.ZeroAddress);
  });

  describe("StablecoinRegistry Additional TEST Helpers", function() {
    it("TEST_eval_onlyDAO - with DAO", async function() {
      const result = await registry.TEST_eval_onlyDAO(dao.address);
      expect(result).to.be.true;
    });

    it("TEST_eval_onlyDAO - with non-DAO", async function() {
      const result = await registry.TEST_eval_onlyDAO(user.address);
      expect(result).to.be.false;
    });

    it("TEST_eval_onlyDAO - with TEST_onlyDAO_off enabled", async function() {
      await registry.connect(dao).TEST_setOnlyDAOOff(true);
      const result = await registry.TEST_eval_onlyDAO(user.address);
      expect(result).to.be.true;
    });

    it("TEST_decimalsOrTry_public - with valid token", async function() {
      const decimals = await registry.TEST_decimalsOrTry_public(token.target);
      expect(decimals).to.equal(18);
    });

    it("TEST_decimalsOrTry_public - with invalid address", async function() {
      const decimals = await registry.TEST_decimalsOrTry_public(ethers.ZeroAddress);
      expect(decimals).to.equal(18);
    });

    it("TEST_exec_decimals_branches - force return", async function() {
      const [val, usedForce, usedStaticcall] = await registry.TEST_exec_decimals_branches(
        token.target, true, 6
      );
      expect(val).to.equal(6);
      expect(usedForce).to.be.true;
      expect(usedStaticcall).to.be.false;
    });

    it("TEST_exec_decimals_branches - staticcall", async function() {
      const [val, usedForce, usedStaticcall] = await registry.TEST_exec_decimals_branches(
        token.target, false, 0
      );
      expect(val).to.equal(18);
      expect(usedForce).to.be.false;
      expect(usedStaticcall).to.be.true;
    });

    it("TEST_exec_decimals_branches - fallback", async function() {
      const [val, usedForce, usedStaticcall] = await registry.TEST_exec_decimals_branches(
        ethers.ZeroAddress, false, 0
      );
      expect(val).to.equal(18);
      expect(usedForce).to.be.false;
      expect(usedStaticcall).to.be.false;
    });

    it("TEST_log_hasLedger", async function() {
      const hasLedger = await registry.TEST_log_hasLedger();
      expect(hasLedger).to.be.true;
    });

    it("TEST_exercise_decimals_try - with forceDecimalsReturn", async function() {
      await registry.connect(dao).TEST_setForceDecimals(true);
      const [okReturn, fallback18] = await registry.TEST_exercise_decimals_try(token.target);
      expect(okReturn).to.be.true;
      expect(fallback18).to.be.false;
    });

    it("TEST_exercise_decimals_try - with staticcall", async function() {
      await registry.connect(dao).TEST_setForceDecimals(false);
      const [okReturn, fallback18] = await registry.TEST_exercise_decimals_try(token.target);
      expect(okReturn).to.be.true;
      expect(fallback18).to.be.false;
    });

    it("TEST_exercise_decimals_try - with fallback", async function() {
      await registry.connect(dao).TEST_setForceDecimals(false);
      const [okReturn, fallback18] = await registry.TEST_exercise_decimals_try(ethers.ZeroAddress);
      expect(okReturn).to.be.false;
      expect(fallback18).to.be.true;
    });

    it("TEST_exercise_deposit_send_checks", async function() {
      const [notWhitelisted, zeroAmount, zeroToOrAmt] = await registry.TEST_exercise_deposit_send_checks(
        token.target, 0, ethers.ZeroAddress
      );
      expect(notWhitelisted).to.be.true;
      expect(zeroAmount).to.be.true;
      expect(zeroToOrAmt).to.be.true;
    });

    it("TEST_exercise_deposit_send_checks - with valid data", async function() {
      await registry.connect(dao).addAsset(token.target, "TEST");
      const [notWhitelisted, zeroAmount, zeroToOrAmt] = await registry.TEST_exercise_deposit_send_checks(
        token.target, 100, user.address
      );
      expect(notWhitelisted).to.be.false;
      expect(zeroAmount).to.be.false;
      expect(zeroToOrAmt).to.be.false;
    });

    it("TEST_if_forceDecimalsReturn - false", async function() {
      const result = await registry.TEST_if_forceDecimalsReturn(false);
      expect(result).to.be.false;
    });

    it("TEST_if_forceDecimalsReturn - true", async function() {
      const result = await registry.TEST_if_forceDecimalsReturn(true);
      expect(result).to.be.true;
    });

    it("TEST_if_staticcall_ok - valid token", async function() {
      const result = await registry.TEST_if_staticcall_ok(token.target);
      expect(result).to.be.true;
    });

    it("TEST_if_staticcall_ok - invalid address", async function() {
      const result = await registry.TEST_if_staticcall_ok(ethers.ZeroAddress);
      expect(result).to.be.false;
    });

    it("TEST_if_deposit_notWhitelisted - not whitelisted", async function() {
      const result = await registry.TEST_if_deposit_notWhitelisted(token.target);
      expect(result).to.be.true;
    });

    it("TEST_if_deposit_notWhitelisted - whitelisted", async function() {
      await registry.connect(dao).addAsset(token.target, "TEST");
      const result = await registry.TEST_if_deposit_notWhitelisted(token.target);
      expect(result).to.be.false;
    });

    it("TEST_if_deposit_zeroAmount - zero", async function() {
      const result = await registry.TEST_if_deposit_zeroAmount(0);
      expect(result).to.be.true;
    });

    it("TEST_if_deposit_zeroAmount - non-zero", async function() {
      const result = await registry.TEST_if_deposit_zeroAmount(100);
      expect(result).to.be.false;
    });

    it("TEST_if_send_zeroToOrAmt - zero address", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100);
      expect(result).to.be.true;
    });

    it("TEST_if_send_zeroToOrAmt - zero amount", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(user.address, 0);
      expect(result).to.be.true;
    });

    it("TEST_if_send_zeroToOrAmt - valid", async function() {
      const result = await registry.TEST_if_send_zeroToOrAmt(user.address, 100);
      expect(result).to.be.false;
    });

    it("TEST_if_send_tokenIsZero - zero", async function() {
      const result = await registry.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
      expect(result).to.be.true;
    });

    it("TEST_if_send_tokenIsZero - valid", async function() {
      const result = await registry.TEST_if_send_tokenIsZero(token.target);
      expect(result).to.be.false;
    });

    it("TEST_cover_decimals_and_deposit - comprehensive", async function() {
      await registry.connect(dao).addAsset(token.target, "TEST");
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target, false, 0, 100, user.address
      );
      expect(result.staticcallOk).to.be.true;
      expect(result.depositNotWhite).to.be.false;
      expect(result.depositZeroAmt).to.be.false;
      expect(result.sendZeroToOrAmt).to.be.false;
      expect(result.sendTokenZero).to.be.false;
    });

    it("TEST_cover_decimals_and_deposit - force decimals", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target, true, 6, 0, ethers.ZeroAddress
      );
      expect(result.usedForceReturn).to.be.true;
      expect(result.depositZeroAmt).to.be.true;
      expect(result.sendZeroToOrAmt).to.be.true;
    });

    it("TEST_cover_decimals_and_deposit - all zero states", async function() {
      const result = await registry.TEST_cover_decimals_and_deposit(
        ethers.ZeroAddress, false, 0, 0, ethers.ZeroAddress
      );
      expect(result.sendTokenZero).to.be.true;
      expect(result.depositZeroAmt).to.be.true;
      expect(result.sendZeroToOrAmt).to.be.true;
    });
  });

  describe("StablecoinRegistry Decimals Branch Exhaustive", function() {
    it("should cover all decimals branches with force flag", async function() {
      for (let force of [false, true]) {
        await registry.connect(dao).TEST_setForceDecimals(force);
        await registry.TEST_exercise_decimals_try(token.target);
        await registry.TEST_exercise_decimals_try(ethers.ZeroAddress);
      }
    });

    it("should cover all staticcall branches", async function() {
      await registry.TEST_if_staticcall_ok(token.target);
      await registry.TEST_if_staticcall_ok(ethers.ZeroAddress);
      await registry.TEST_if_staticcall_ok(user.address);
    });

    it("should cover all exec_decimals_branches paths", async function() {
      // Path 1: Force return
      await registry.TEST_exec_decimals_branches(token.target, true, 6);
      await registry.TEST_exec_decimals_branches(token.target, true, 12);
      // Path 2: Staticcall
      await registry.TEST_exec_decimals_branches(token.target, false, 0);
      // Path 3: Fallback
      await registry.TEST_exec_decimals_branches(ethers.ZeroAddress, false, 0);
      await registry.TEST_exec_decimals_branches(user.address, false, 0);
    });
  });

  describe("StablecoinRegistry Deposit/Send Validation Exhaustive", function() {
    it("should cover all deposit validation branches", async function() {
      // Not whitelisted
      await registry.TEST_if_deposit_notWhitelisted(token.target);
      await registry.TEST_if_deposit_notWhitelisted(user.address);
      
      // Whitelisted
      await registry.connect(dao).addAsset(token.target, "TEST");
      await registry.TEST_if_deposit_notWhitelisted(token.target);
    });

    it("should cover all amount validation branches", async function() {
      await registry.TEST_if_deposit_zeroAmount(0);
      await registry.TEST_if_deposit_zeroAmount(1);
      await registry.TEST_if_deposit_zeroAmount(100);
      await registry.TEST_if_deposit_zeroAmount(ethers.MaxUint256);
    });

    it("should cover all send validation branches", async function() {
      // Zero address
      await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 0);
      await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100);
      
      // Zero amount
      await registry.TEST_if_send_zeroToOrAmt(user.address, 0);
      
      // Valid
      await registry.TEST_if_send_zeroToOrAmt(user.address, 100);
    });

    it("should cover all token zero branches", async function() {
      await registry.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
      await registry.TEST_if_send_tokenIsZero(token.target);
      await registry.TEST_if_send_tokenIsZero(user.address);
    });
  });

  describe("StablecoinRegistry Combined Coverage", function() {
    it("should cover all combinations of deposit/send checks", async function() {
      const addresses = [ethers.ZeroAddress, token.target, user.address];
      const amounts = [0, 1, 100];
      const targets = [ethers.ZeroAddress, user.address, admin.address];

      for (let addr of addresses) {
        for (let amt of amounts) {
          for (let target of targets) {
            await registry.TEST_exercise_deposit_send_checks(addr, amt, target);
          }
        }
      }
    });

    it("should cover comprehensive decimals and deposit combinations", async function() {
      await registry.connect(dao).addAsset(token.target, "TEST");
      
      const forceFlags = [false, true];
      const forcedVals = [6, 18];
      const amounts = [0, 100];
      const targets = [ethers.ZeroAddress, user.address];

      for (let force of forceFlags) {
        for (let val of forcedVals) {
          for (let amt of amounts) {
            for (let target of targets) {
              await registry.TEST_cover_decimals_and_deposit(
                token.target, force, val, amt, target
              );
            }
          }
        }
      }
    });
  });

  describe("EcoTreasuryVault Additional TEST Helpers", function() {
    it("TEST_eval_onlyDAO - with DAO", async function() {
      const result = await vault.TEST_eval_onlyDAO(dao.address);
      expect(result).to.be.true;
    });

    it("TEST_eval_onlyDAO - with non-DAO", async function() {
      const result = await vault.TEST_eval_onlyDAO(user.address);
      expect(result).to.be.false;
    });

    it("TEST_eval_onlyDAO - with TEST_onlyDAO_off_Tx enabled", async function() {
      await vault.connect(dao).TEST_setOnlyDAOOff_Tx(true);
      const result = await vault.TEST_eval_onlyDAO(user.address);
      expect(result).to.be.true;
    });

    it("TEST_log_hasLedger", async function() {
      const hasLedger = await vault.TEST_log_hasLedger();
      expect(hasLedger).to.be.true;
    });

    it("TEST_eval_hasModules", async function() {
      const [hasLedger, hasRegistry] = await vault.TEST_eval_hasModules();
      expect(hasLedger).to.be.true;
      expect(hasRegistry).to.be.true;
    });

    it("TEST_if_deposit_zeroAmount - zero", async function() {
      const result = await vault.TEST_if_deposit_zeroAmount(0);
      expect(result).to.be.true;
    });

    it("TEST_if_deposit_zeroAmount - non-zero", async function() {
      const result = await vault.TEST_if_deposit_zeroAmount(100);
      expect(result).to.be.false;
    });

    it("TEST_if_send_zeroToOrAmt - zero address", async function() {
      const result = await vault.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100);
      expect(result).to.be.true;
    });

    it("TEST_if_send_zeroToOrAmt - zero amount", async function() {
      const result = await vault.TEST_if_send_zeroToOrAmt(user.address, 0);
      expect(result).to.be.true;
    });

    it("TEST_if_send_zeroToOrAmt - valid", async function() {
      const result = await vault.TEST_if_send_zeroToOrAmt(user.address, 100);
      expect(result).to.be.false;
    });

    it("TEST_if_token_not_ok - not whitelisted", async function() {
      const result = await vault.TEST_if_token_not_ok(token.target);
      expect(result).to.be.true;
    });

    it("TEST_if_token_not_ok - whitelisted", async function() {
      await registry.connect(dao).addAsset(token.target, "TEST");
      const result = await vault.TEST_if_token_not_ok(token.target);
      expect(result).to.be.false;
    });

    it("TEST_if_token_addr_zero - zero", async function() {
      const result = await vault.TEST_if_token_addr_zero(ethers.ZeroAddress);
      expect(result).to.be.true;
    });

    it("TEST_if_token_addr_zero - valid", async function() {
      const result = await vault.TEST_if_token_addr_zero(token.target);
      expect(result).to.be.false;
    });
  });

  describe("EcoTreasuryVault Validation Branch Exhaustive", function() {
    it("should cover all deposit amount validation branches", async function() {
      for (let amt of [0, 1, 100, 1000, ethers.MaxUint256]) {
        await vault.TEST_if_deposit_zeroAmount(amt);
      }
    });

    it("should cover all send validation branches", async function() {
      const targets = [ethers.ZeroAddress, user.address, admin.address];
      const amounts = [0, 1, 100];

      for (let target of targets) {
        for (let amt of amounts) {
          await vault.TEST_if_send_zeroToOrAmt(target, amt);
        }
      }
    });

    it("should cover all token validation branches", async function() {
      // Not whitelisted
      await vault.TEST_if_token_not_ok(token.target);
      await vault.TEST_if_token_not_ok(user.address);
      
      // Whitelisted
      await registry.connect(dao).addAsset(token.target, "TEST");
      await vault.TEST_if_token_not_ok(token.target);
    });

    it("should cover all token address zero branches", async function() {
      await vault.TEST_if_token_addr_zero(ethers.ZeroAddress);
      await vault.TEST_if_token_addr_zero(token.target);
      await vault.TEST_if_token_addr_zero(user.address);
    });
  });

  describe("EcoTreasuryVault Module and DAO Exhaustive", function() {
    it("should cover eval_onlyDAO for all states", async function() {
      // Default: only DAO allowed
      await vault.TEST_eval_onlyDAO(dao.address);
      await vault.TEST_eval_onlyDAO(user.address);
      
      // With TEST flag off
      await vault.connect(dao).TEST_setOnlyDAOOff_Tx(true);
      await vault.TEST_eval_onlyDAO(dao.address);
      await vault.TEST_eval_onlyDAO(user.address);
      
      // Reset
      await vault.connect(dao).TEST_setOnlyDAOOff_Tx(false);
      await vault.TEST_eval_onlyDAO(dao.address);
      await vault.TEST_eval_onlyDAO(user.address);
    });

    it("should cover hasModules check", async function() {
      await vault.TEST_eval_hasModules();
      
      // Change modules
      const newLedger = await (await ethers.getContractFactory("contracts-min/mocks/LedgerMock.sol:LedgerMock")).deploy(false);
      const newRegistry = await (await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry")).deploy(dao.address, newLedger.target);
      
      await vault.connect(dao).setModules(user.address, newLedger.target, newRegistry.target, ethers.ZeroAddress);
      await vault.TEST_eval_hasModules();
    });

    it("should cover log_hasLedger for all states", async function() {
      await vault.TEST_log_hasLedger();
      
      // Set to zero address
      await vault.connect(dao).setModules(user.address, ethers.ZeroAddress, registry.target, ethers.ZeroAddress);
      await vault.TEST_log_hasLedger();
    });
  });
});
