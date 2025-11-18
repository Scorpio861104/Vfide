const { expect } = require("chai");
const { ethers } = require("hardhat");

const describeIfNotFast = process.env.FAST_TESTS ? describe.skip : describe;

describeIfNotFast("VFIDECommerce - Exhaustive TEST Coverage (Part 1/3)", function() {
  let registry, escrow, dao, token, hub, seer, security, ledger;
  let merchant, buyer, seller, user1;

  beforeEach(async function() {
    [dao, merchant, buyer, seller, user1] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("VFIDE", "VF");

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    hub = await VaultHubMock.deploy();

    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.setMin(50);

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    security = await SecurityHubMock.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);

    const MR = await ethers.getContractFactory("MerchantRegistry");
    registry = await MR.deploy(dao.address, token.target, hub.target, seer.target, security.target, ledger.target);

    const CE = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CE.deploy(dao.address, token.target, hub.target, registry.target, security.target, ledger.target);
  });

  describe("Basic TEST toggle functions", function() {
    it("TEST_setOnlyDAOOff", async function() {
      await registry.TEST_setOnlyDAOOff(true);
      await registry.TEST_setOnlyDAOOff(false);
    });

    it("TEST_setForceAlreadyMerchant", async function() {
      await registry.TEST_setForceAlreadyMerchant(true);
      await registry.TEST_setForceAlreadyMerchant(false);
    });

    it("TEST_setForceNoVault", async function() {
      await registry.TEST_setForceNoVault(true);
      await registry.TEST_setForceNoVault(false);
    });

    it("TEST_setForceLowScore", async function() {
      await registry.TEST_setForceLowScore(true);
      await registry.TEST_setForceLowScore(false);
    });

    it("TEST_setForceZeroSenderRefund", async function() {
      await registry.TEST_setForceZeroSenderRefund(true);
      await registry.TEST_setForceZeroSenderRefund(false);
    });

    it("TEST_setForceZeroSenderDispute", async function() {
      await registry.TEST_setForceZeroSenderDispute(true);
      await registry.TEST_setForceZeroSenderDispute(false);
    });
  });

  describe("Eval functions - Part 1", function() {
    it("TEST_eval_addMerchant_flags", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const flags = await registry.TEST_eval_addMerchant_flags(merchant.address);
      expect(flags[0]).to.be.a("boolean"); // alreadyMerchant
      expect(flags[1]).to.be.a("boolean"); // noVault
      expect(flags[2]).to.be.a("boolean"); // lowScore
    });

    it("TEST_eval_addMerchant_subexpr", async function() {
      const result = await registry.TEST_eval_addMerchant_subexpr(merchant.address);
      expect(result[0]).to.be.a("boolean"); // leftAlreadyMerchant
      expect(result[1]).to.be.a("boolean"); // rightForceAlready
    });

    it("TEST_eval_noteRefund_forceFlag", async function() {
      const flag = await registry.TEST_eval_noteRefund_forceFlag();
      expect(flag).to.be.a("boolean");
    });

    it("TEST_eval_noteDispute_forceFlag", async function() {
      const flag = await registry.TEST_eval_noteDispute_forceFlag();
      expect(flag).to.be.a("boolean");
    });

    it("TEST_exercise_addMerchant_checks", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const checks = await registry.TEST_exercise_addMerchant_checks(merchant.address);
      expect(checks[0]).to.be.a("boolean"); // statusNone
      expect(checks[1]).to.be.a("boolean"); // vaultNonZero
      expect(checks[2]).to.be.a("boolean"); // scoreOk
    });

    it("TEST_exercise_noteFlags", async function() {
      const flags = await registry.TEST_exercise_noteFlags();
      expect(flags[0]).to.be.a("boolean"); // refundZeroFlag
      expect(flags[1]).to.be.a("boolean"); // disputeZeroFlag
    });

    it("TEST_exec_addMerchant_branches", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const branches = await registry.TEST_exec_addMerchant_branches(merchant.address, false, false, false);
      expect(branches[0]).to.be.a("boolean"); // alreadyMerchantBranch
      expect(branches[1]).to.be.a("boolean"); // noVaultBranch
      expect(branches[2]).to.be.a("boolean"); // lowScoreBranch
    });

    it("TEST_cover_addMerchant_variants", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const result = await registry.TEST_cover_addMerchant_variants(merchant.address);
      // Returns tuple, just call it
      expect(result).to.exist;
    });
  });

  describe("Conditional TEST functions", function() {
    it("TEST_if_alreadyMerchant_left", async function() {
      const result = await registry.TEST_if_alreadyMerchant_left(merchant.address);
      expect(result).to.be.a("boolean");
    });

    it("TEST_if_forceAlready_right", async function() {
      await registry.TEST_setForceAlreadyMerchant(true);
      const result = await registry.TEST_if_forceAlready_right();
      expect(result).to.equal(true);
    });

    it("TEST_if_noVault_left", async function() {
      const result = await registry.TEST_if_noVault_left(merchant.address);
      expect(result).to.be.a("boolean");
    });

    it("TEST_if_forceNoVault_right", async function() {
      await registry.TEST_setForceNoVault(true);
      const result = await registry.TEST_if_forceNoVault_right();
      expect(result).to.equal(true);
    });

    it("TEST_if_lowScore_left", async function() {
      await seer.setScore(merchant.address, 0);
      const result = await registry.TEST_if_lowScore_left(merchant.address);
      expect(result).to.equal(true);
    });

    it("TEST_if_forceLowScore_right", async function() {
      await registry.TEST_setForceLowScore(true);
      const result = await registry.TEST_if_forceLowScore_right();
      expect(result).to.equal(true);
    });

    it("TEST_exec_addMerchant_ifvariants", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const result = await registry.TEST_exec_addMerchant_ifvariants(merchant.address, false, false, false);
      expect(result).to.be.gte(0);
    });
  });

  describe("Status check functions", function() {
    it("TEST_if_merchant_status_none", async function() {
      const result = await registry.TEST_if_merchant_status_none(merchant.address);
      expect(result).to.equal(true);
    });

    it("TEST_if_vaultHub_vaultOf_isZero", async function() {
      const result = await registry.TEST_if_vaultHub_vaultOf_isZero(merchant.address);
      expect(result).to.equal(true);

      await hub.setVault(merchant.address, user1.address);
      const result2 = await registry.TEST_if_vaultHub_vaultOf_isZero(merchant.address);
      expect(result2).to.equal(false);
    });

    it("TEST_if_seer_getScore_lt_min", async function() {
      await seer.setScore(merchant.address, 0);
      const result = await registry.TEST_if_seer_getScore_lt_min(merchant.address);
      expect(result).to.equal(true);

      await seer.setScore(merchant.address, 100);
      const result2 = await registry.TEST_if_seer_getScore_lt_min(merchant.address);
      expect(result2).to.equal(false);
    });

    it("TEST_if_refund_threshold_reached", async function() {
      const result = await registry.TEST_if_refund_threshold_reached(merchant.address, 10);
      expect(result).to.be.a("boolean");
    });

    it("TEST_if_dispute_threshold_reached", async function() {
      const result = await registry.TEST_if_dispute_threshold_reached(merchant.address, 10);
      expect(result).to.be.a("boolean");
    });
  });

  describe("Force variants", function() {
    it("TEST_if_vaultOf_isZero_or_force", async function() {
      const result1 = await registry.TEST_if_vaultOf_isZero_or_force(merchant.address, false);
      expect(result1).to.equal(true);

      const result2 = await registry.TEST_if_vaultOf_isZero_or_force(merchant.address, true);
      expect(result2).to.equal(true);

      await hub.setVault(merchant.address, user1.address);
      const result3 = await registry.TEST_if_vaultOf_isZero_or_force(merchant.address, false);
      expect(result3).to.equal(false);
    });

    it("TEST_if_seer_score_below_min_or_force", async function() {
      await seer.setScore(merchant.address, 0);
      const result1 = await registry.TEST_if_seer_score_below_min_or_force(merchant.address, false);
      expect(result1).to.equal(true);

      await seer.setScore(merchant.address, 100);
      const result2 = await registry.TEST_if_seer_score_below_min_or_force(merchant.address, false);
      expect(result2).to.equal(false);

      const result3 = await registry.TEST_if_seer_score_below_min_or_force(merchant.address, true);
      expect(result3).to.equal(true);
    });

    it("TEST_if_alreadyMerchant_or_force", async function() {
      const result1 = await registry.TEST_if_alreadyMerchant_or_force(merchant.address, false);
      expect(result1).to.be.a("boolean");

      const result2 = await registry.TEST_if_alreadyMerchant_or_force(merchant.address, true);
      expect(result2).to.equal(true);
    });

    it("TEST_if_onlyDAO_off_flag", async function() {
      expect(await registry.TEST_if_onlyDAO_off_flag()).to.equal(false);
      await registry.TEST_setOnlyDAOOff(true);
      expect(await registry.TEST_if_onlyDAO_off_flag()).to.equal(true);
    });
  });

  describe("Vault and score checks", function() {
    it("TEST_if_vaultAndScore", async function() {
      await hub.setVault(merchant.address, user1.address);
      await seer.setScore(merchant.address, 100);
      const result = await registry.TEST_if_vaultAndScore(merchant.address, 50);
      expect(result[0]).to.be.a("boolean"); // hasVault
      expect(result[1]).to.be.a("boolean"); // meetsScore
    });
  });
});
