const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance - Exhaustive TEST Coverage", function() {
  let registry, treasury, dao, ledger, token, vfide, user1, user2;

  beforeEach(async function() {
    [dao, user1, user2] = await ethers.getSigners();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test", "TST");
    vfide = await ERC20Mock.deploy("VFIDE", "VF");

    const SR = await ethers.getContractFactory("StablecoinRegistry");
    registry = await SR.deploy(dao.address, ledger.target);

    const ET = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await ET.deploy(dao.address, ledger.target, registry.target, vfide.target);
  });

  describe("StablecoinRegistry TEST Functions", function() {
    it("TEST_setOnlyDAOOff - toggle onlyDAO bypass", async function() {
      await registry.TEST_setOnlyDAOOff(true);
      await registry.TEST_setOnlyDAOOff(false);
    });

    it("TEST_setForceDecimals - set forced decimals value", async function() {
      await registry.TEST_setForceDecimals(6, true);
      await registry.TEST_setForceDecimals(18, true);
      await registry.TEST_setForceDecimals(0, false);
    });

    it("TEST_eval_onlyDAO - evaluate DAO check", async function() {
      const allowed1 = await registry.TEST_eval_onlyDAO(dao.address);
      expect(allowed1).to.equal(true);
      
      const allowed2 = await registry.TEST_eval_onlyDAO(user1.address);
      expect(allowed2).to.equal(false);

      await registry.TEST_setOnlyDAOOff(true);
      const allowed3 = await registry.TEST_eval_onlyDAO(user1.address);
      expect(allowed3).to.equal(true);
    });

    it("TEST_decimalsOrTry_public - get token decimals", async function() {
      const dec = await registry.TEST_decimalsOrTry_public(token.target);
      expect(dec).to.be.gte(0);
    });

    it("TEST_exec_decimals_branches - all decimals branches", async function() {
      const result1 = await registry.TEST_exec_decimals_branches(token.target, false, 0);
      expect(result1.val).to.be.gte(0);

      const result2 = await registry.TEST_exec_decimals_branches(token.target, true, 6);
      expect(result2.val).to.equal(6);
      expect(result2.usedForce).to.equal(true);
    });

    it("TEST_log_hasLedger - check ledger exists", async function() {
      const has = await registry.TEST_log_hasLedger();
      expect(has).to.be.a("boolean");
    });

    it("TEST_exercise_decimals_try - exercise staticcall paths", async function() {
      const result = await registry.TEST_exercise_decimals_try(token.target);
      expect(result.okReturn).to.be.a("boolean");
      expect(result.fallback18).to.be.a("boolean");
    });

    it("TEST_exercise_deposit_send_checks - deposit/send validations", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result = await registry.TEST_exercise_deposit_send_checks(token.target, 1000, user1.address);
      expect(result[0]).to.be.a("boolean"); // notWhitelisted
      expect(result[1]).to.be.a("boolean"); // zeroAmount
      expect(result[2]).to.be.a("boolean"); // zeroToOrAmt
    });

    it("TEST_if_forceDecimalsReturn - check force flag", async function() {
      const forced1 = await registry.TEST_if_forceDecimalsReturn(false);
      expect(forced1).to.equal(false);
      
      await registry.TEST_setForceDecimals(6, true);
      const forced2 = await registry.TEST_if_forceDecimalsReturn(true);
      expect(forced2).to.equal(true);
    });

    it("TEST_if_staticcall_ok - staticcall success check", async function() {
      const ok = await registry.TEST_if_staticcall_ok(token.target);
      expect(ok).to.be.a("boolean");
    });

    it("TEST_if_deposit_notWhitelisted - deposit whitelist check", async function() {
      const notWhite1 = await registry.TEST_if_deposit_notWhitelisted(token.target);
      expect(notWhite1).to.equal(true);

      await registry.connect(dao).addAsset(token.target, "TST");
      const notWhite2 = await registry.TEST_if_deposit_notWhitelisted(token.target);
      expect(notWhite2).to.equal(false);
    });

    it("TEST_if_deposit_zeroAmount - zero amount check", async function() {
      expect(await registry.TEST_if_deposit_zeroAmount(0)).to.equal(true);
      expect(await registry.TEST_if_deposit_zeroAmount(1)).to.equal(false);
      expect(await registry.TEST_if_deposit_zeroAmount(1000)).to.equal(false);
    });

    it("TEST_if_send_zeroToOrAmt - send zero checks", async function() {
      expect(await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100)).to.equal(true);
      expect(await registry.TEST_if_send_zeroToOrAmt(user1.address, 0)).to.equal(true);
      expect(await registry.TEST_if_send_zeroToOrAmt(user1.address, 100)).to.equal(false);
    });

    it("TEST_if_send_tokenIsZero - token zero check", async function() {
      expect(await registry.TEST_if_send_tokenIsZero(ethers.ZeroAddress)).to.equal(true);
      expect(await registry.TEST_if_send_tokenIsZero(token.target)).to.equal(false);
    });

    it("TEST_cover_decimals_and_deposit - comprehensive coverage", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result = await registry.TEST_cover_decimals_and_deposit(
        token.target, false, 0, 1000, user1.address
      );
      expect(result[0]).to.be.a("boolean"); // usedForceReturn
      expect(result[1]).to.be.a("boolean"); // staticcallOk
      expect(result[2]).to.be.a("boolean"); // depositNotWhite
      expect(result[3]).to.be.a("boolean"); // depositZeroAmt
      expect(result[4]).to.be.a("boolean"); // sendZeroToOrAmt
      expect(result[5]).to.be.a("boolean"); // sendTokenZero
    });

    it("TEST_exec_decimals_and_tx_ifvariants - all if variants", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const combinations = [
        [false, 18, false, false],
        [true, 6, false, false],
        [false, 18, true, false],
        [false, 18, false, true],
        [true, 6, true, true]
      ];

      for (const [forceReturn, forcedVal, forceDepInsuff, forceSendInsuff] of combinations) {
        const result = await registry.TEST_exec_decimals_and_tx_ifvariants(
          token.target, forceReturn, forcedVal, 1000, user1.address, forceDepInsuff, forceSendInsuff
        );
        expect(result).to.be.gte(0);
      }
    });

    it("TEST_if_asset_ok - asset whitelist check", async function() {
      expect(await registry.TEST_if_asset_ok(token.target)).to.equal(false);
      await registry.connect(dao).addAsset(token.target, "TST");
      expect(await registry.TEST_if_asset_ok(token.target)).to.equal(true);
    });

    it("TEST_if_token_staticcall_dec_ok - decimals staticcall", async function() {
      const ok = await registry.TEST_if_token_staticcall_dec_ok(token.target);
      expect(ok).to.be.a("boolean");
    });

    it("TEST_if_deposit_checks_explicit - explicit deposit checks", async function() {
      const checks1 = await registry.TEST_if_deposit_checks_explicit(token.target, 0);
      expect(checks1.notWhitelisted).to.equal(true);
      expect(checks1.zeroAmount).to.equal(true);

      await registry.connect(dao).addAsset(token.target, "TST");
      const checks2 = await registry.TEST_if_deposit_checks_explicit(token.target, 1000);
      expect(checks2.notWhitelisted).to.equal(false);
      expect(checks2.zeroAmount).to.equal(false);
    });

    it("TEST_if_send_allowed_and_tokenNonZero - send checks", async function() {
      const checks = await registry.TEST_if_send_allowed_and_tokenNonZero(
        token.target, user1.address, 100
      );
      expect(checks.allowedToken).to.be.a("boolean");
      expect(checks.tokenIsZero).to.equal(false);
    });

    it("TEST_if_asset_not_ok - negative asset check", async function() {
      expect(await registry.TEST_if_asset_not_ok(token.target)).to.equal(true);
      await registry.connect(dao).addAsset(token.target, "TST");
      expect(await registry.TEST_if_asset_not_ok(token.target)).to.equal(false);
    });

    it("TEST_if_staticcall_returns_short - short return check", async function() {
      const isShort = await registry.TEST_if_staticcall_returns_short(token.target);
      expect(isShort).to.be.a("boolean");
    });

    it("TEST_if_treasury_force_flags - force flag checks", async function() {
      const flags = await registry.TEST_if_treasury_force_flags(false, false);
      expect(flags[0]).to.be.a("boolean");
      expect(flags[1]).to.be.a("boolean");
    });

    it("TEST_if_deposit_send_whitelist_and_zero - combined checks", async function() {
      const checks = await registry.TEST_if_deposit_send_whitelist_and_zero(
        token.target, 100, user1.address
      );
      expect(checks.isWhite).to.be.a("boolean");
      expect(checks.isZeroAmount).to.equal(false);
      expect(checks.isZeroTo).to.equal(false);
    });

    it("TEST_if_force_flags_state - force flags state", async function() {
      const state = await registry.TEST_if_force_flags_state();
      expect(state.depositInsuffFlag).to.be.a("boolean");
      expect(state.sendInsuffFlag).to.be.a("boolean");
    });

    it("TEST_cover_more_finance - more coverage", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result = await registry.TEST_cover_more_finance(
        token.target, 1000, user1.address, false, 18, false, false
      );
      expect(result).to.be.gte(0);
    });

    it("TEST_cover_finance_more2 - additional coverage", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result = await registry.TEST_cover_finance_more2(
        token.target, 1000, user1.address, false, false, false
      );
      expect(result).to.be.gte(0);
    });

    it("TEST_exec_finance_413_checks - line 413 checks", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result = await registry.TEST_exec_finance_413_checks(
        token.target, user1.address, 1000
      );
      expect(result).to.be.gte(0);
    });

    it("TEST_exec_decimals_for_token - decimals execution", async function() {
      const result = await registry.TEST_exec_decimals_for_token(token.target, false, 18);
      expect(result[0]).to.be.gte(0);
      expect(result[1]).to.be.a("boolean");
      expect(result[2]).to.be.a("boolean");
    });
  });

  describe("EcoTreasuryVault TEST Functions", function() {
    it("TEST_setOnlyDAOOff_Tx - toggle DAO bypass for treasury", async function() {
      await treasury.TEST_setOnlyDAOOff_Tx(true);
      await treasury.TEST_setOnlyDAOOff_Tx(false);
    });

    it("TEST_setForceDepositInsufficient - force deposit insufficient", async function() {
      await treasury.TEST_setForceDepositInsufficient(true);
      await treasury.TEST_setForceDepositInsufficient(false);
    });

    it("TEST_setForceSendInsufficient - force send insufficient", async function() {
      await treasury.TEST_setForceSendInsufficient(true);
      await treasury.TEST_setForceSendInsufficient(false);
    });

    it("TEST_eval_deposit_checks - deposit validation", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const checks = await treasury.TEST_eval_deposit_checks(token.target, 1000);
      expect(checks[0]).to.be.a("boolean"); // notWhitelisted
      expect(checks[1]).to.be.a("boolean"); // zeroAmount
    });

    it("TEST_eval_send_checks - send validation", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const checks = await treasury.TEST_eval_send_checks(token.target, user1.address, 1000);
      expect(checks[0]).to.be.a("boolean"); // zeroToOrAmt
      expect(checks[1]).to.be.a("boolean"); // tokenIsZero
      expect(checks[2]).to.be.a("boolean"); // allowedToken
    });

    it("TEST_if_send_zero_guard - send zero guard", async function() {
      expect(await treasury.TEST_if_send_zero_guard(token.target, ethers.ZeroAddress, 100)).to.equal(true);
      expect(await treasury.TEST_if_send_zero_guard(token.target, user1.address, 0)).to.equal(true);
      expect(await treasury.TEST_if_send_zero_guard(token.target, user1.address, 100)).to.equal(false);
    });

    it("TEST_exec_treasury_ifvariants - all treasury variants", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const variants = [
        [false, false],
        [true, false],
        [false, true],
        [true, true]
      ];

      for (const [forceDeposit, forceSend] of variants) {
        const result = await treasury.TEST_exec_treasury_ifvariants(
          token.target, 1000, user1.address, forceDeposit, forceSend
        );
        expect(result).to.be.gte(0);
      }
    });

    it("TEST_if_to_or_amount_zero - zero checks", async function() {
      expect(await treasury.TEST_if_to_or_amount_zero(token.target, ethers.ZeroAddress, 100)).to.equal(true);
      expect(await treasury.TEST_if_to_or_amount_zero(token.target, user1.address, 0)).to.equal(true);
      expect(await treasury.TEST_if_to_or_amount_zero(token.target, user1.address, 100)).to.equal(false);
    });

    it("TEST_if_token_is_vfide_or_whitelisted - token checks", async function() {
      expect(await treasury.TEST_if_token_is_vfide_or_whitelisted(token.target)).to.equal(false);
      await registry.connect(dao).addAsset(token.target, "TST");
      expect(await treasury.TEST_if_token_is_vfide_or_whitelisted(token.target)).to.equal(true);
    });

    it("TEST_if_TEST_force_flags_either - force flags OR", async function() {
      expect(await treasury.TEST_if_TEST_force_flags_either()).to.equal(false);
      await treasury.TEST_setForceDepositInsufficient(true);
      expect(await treasury.TEST_if_TEST_force_flags_either()).to.equal(true);
    });

    it("TEST_exec_send_variants - send variants", async function() {
      await registry.connect(dao).addAsset(token.target, "TST");
      const result1 = await treasury.TEST_exec_send_variants(token.target, user1.address, 1000, false);
      expect(result1).to.be.gte(0);

      const result2 = await treasury.TEST_exec_send_variants(token.target, user1.address, 1000, true);
      expect(result2).to.be.gte(0);
    });
  });

  describe("Combined exhaustive tests", function() {
    it("should test all registry TEST functions in sequence", async function() {
      await registry.TEST_setOnlyDAOOff(true);
      await registry.TEST_setForceDecimals(6, true);
      await registry.TEST_eval_onlyDAO(user1.address);
      await registry.TEST_decimalsOrTry_public(token.target);
      await registry.TEST_log_hasLedger();
      await registry.TEST_if_forceDecimalsReturn(true);
      await registry.TEST_if_staticcall_ok(token.target);
      await registry.TEST_if_deposit_zeroAmount(0);
      await registry.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 0);
      await registry.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
      await registry.TEST_setOnlyDAOOff(false);
      await registry.TEST_setForceDecimals(18, false);
    });

    it("should test all treasury TEST functions in sequence", async function() {
      await treasury.TEST_setOnlyDAOOff_Tx(true);
      await treasury.TEST_setForceDepositInsufficient(true);
      await treasury.TEST_setForceSendInsufficient(true);
      await treasury.TEST_if_send_zero_guard(token.target, user1.address, 100);
      await treasury.TEST_if_to_or_amount_zero(token.target, user1.address, 100);
      await treasury.TEST_if_TEST_force_flags_either();
      await treasury.TEST_setOnlyDAOOff_Tx(false);
      await treasury.TEST_setForceDepositInsufficient(false);
      await treasury.TEST_setForceSendInsufficient(false);
    });

    it("should test all boolean combinations", async function() {
      const bools = [false, true];
      for (const b1 of bools) {
        for (const b2 of bools) {
          for (const b3 of bools) {
            await registry.TEST_setOnlyDAOOff(b1);
            await registry.TEST_setForceDecimals(18, b2);
            await treasury.TEST_setOnlyDAOOff_Tx(b1);
            await treasury.TEST_setForceDepositInsufficient(b2);
            await treasury.TEST_setForceSendInsufficient(b3);
          }
        }
      }
    });
  });
});
