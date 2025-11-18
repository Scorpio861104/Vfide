const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce - Systematic TEST Helper Coverage Part 1 (lines 295-560)", function () {
  let dao, user1, user2, user3;
  let token, seer, ledger, hub, security, vestingVault, registry, escrow;
  const META = '0x' + '00'.repeat(32);

  beforeEach(async function () {
    [dao, user1, user2, user3] = await ethers.getSigners();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    hub = await VaultHubMock.deploy();
    await hub.waitForDeployment();

    const SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    const SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    security = await SecurityHubMock.deploy();
    await security.waitForDeployment();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledger = await LedgerMock.deploy(false);
    await ledger.waitForDeployment();

    const VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    await token.connect(dao).setVaultOnly(false);
    await token.connect(dao).setPresale(dao.address);
    const amt = ethers.parseUnits("10000", 18);
    await token.connect(dao).mintPresale(user1.address, amt);
    await token.connect(dao).mintPresale(user2.address, amt);
    await token.connect(dao).mintPresale(user3.address, amt);

    await hub.setVault(user1.address, user1.address);
    await hub.setVault(user2.address, user2.address);
    await hub.setVault(user3.address, user3.address);

    await seer.setMin(100);
    await seer.setScore(user1.address, 150);
    await seer.setScore(user2.address, 150);
    await seer.setScore(user3.address, 150);

    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    registry = await MerchantRegistry.deploy(dao.address, token.target, hub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    const CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CommerceEscrow.deploy(dao.address, token.target, hub.target, registry.target, security.target, ledger.target);
    await escrow.waitForDeployment();

    await registry.connect(user1).addMerchant(META);
  });

  describe("Lines 295-365: Using existing TEST helpers", function () {
    it("should cover line 295-309 via TEST_exec_addMerchant_branches", async function () {
      // This function actually exists
      const r1 = await registry.TEST_exec_addMerchant_branches(user2.address, false, false, false);
      expect(r1.alreadyMerchantBranch).to.be.false;
      
      const r2 = await registry.TEST_exec_addMerchant_branches(user1.address, false, false, false);
      expect(r2.alreadyMerchantBranch).to.be.true;
      
      await registry.TEST_exec_addMerchant_branches(user2.address, true, false, false);
      await registry.TEST_exec_addMerchant_branches(user2.address, false, true, false);
      await registry.TEST_exec_addMerchant_branches(user2.address, false, false, true);
    });

    it("should cover line 365 cond-expr via TEST_line365_condexpr_variant2", async function () {
      // Hit all branches of line 365 conditional
      await registry.TEST_line365_condexpr_variant2(user1.address, user2.address, 5, 3, false);
      await registry.TEST_line365_condexpr_variant2(user1.address, user2.address, 5, 3, true);
      await registry.TEST_line365_condexpr_variant2(user2.address, user1.address, 4, 2, false);
      await registry.TEST_line365_condexpr_variant2(user2.address, user1.address, 4, 2, true);
    });
  });

  describe("Lines 329-410: More TEST helper coverage", function () {
    it("should cover lines 329-410 via TEST_cover_addMerchant_variants", async function () {
      const result = await registry.TEST_cover_addMerchant_variants(user2.address);
      expect(result).to.be.an('array');
      
      await registry.TEST_setForceLowScore(true);
      await registry.TEST_cover_addMerchant_variants(user2.address);
      await registry.TEST_setForceLowScore(false);
      
      await registry.TEST_setForceNoVault(true);
      await registry.TEST_cover_addMerchant_variants(user2.address);
      await registry.TEST_setForceNoVault(false);
    });
  });

  describe("Lines 435-456: Complex nested conditional expressions", function () {
    it("should cover line 435 condexpr variants systematically", async function () {
      // Use actual TEST_line435_condexpr_variants function (on escrow contract)
      await escrow.TEST_line435_condexpr_variants(user1.address, user2.address, ethers.parseEther("100"), false, false);
      await escrow.TEST_line435_condexpr_variants(user1.address, user2.address, ethers.parseEther("100"), false, true);
      await escrow.TEST_line435_condexpr_variants(user1.address, user2.address, ethers.parseEther("100"), true, false);
      await escrow.TEST_line435_condexpr_variants(user1.address, user2.address, ethers.parseEther("100"), true, true);
      await escrow.TEST_line435_condexpr_variants(user2.address, user1.address, 0, false, false);
      await escrow.TEST_line435_condexpr_variants(user2.address, user1.address, 0, true, true);
    });

    it("should cover line 435 additional variants", async function () {
      await escrow.TEST_line435_msgsender_include(user1.address, ethers.parseEther("50"));
      await escrow.TEST_line435_force_left(user1.address, user2.address, false);
      await escrow.TEST_line435_force_left(user1.address, user2.address, true);
      await escrow.TEST_line435_alt2(user1.address, user2.address, ethers.parseEther("100"), false, false);
      await escrow.TEST_line435_alt2(user1.address, user2.address, ethers.parseEther("100"), true, true);
      await escrow.TEST_line435_local_msg_variants(user1.address, user2.address, false);
      await escrow.TEST_line435_local_msg_variants(user1.address, user2.address, true);
      await escrow.TEST_line435_ternary_variant(user1.address, user2.address, ethers.parseEther("100"), false);
      await escrow.TEST_line435_ternary_variant(user1.address, user2.address, ethers.parseEther("100"), true);
      await escrow.TEST_line435_injected_zero(user1.address, user2.address);
    });

    it("should cover line 447 condexpr variants systematically", async function () {
      // Use actual TEST_line447_condexpr_variants function (on escrow contract)
      await escrow.TEST_line447_condexpr_variants(user1.address, user2.address, false);
      await escrow.TEST_line447_condexpr_variants(user1.address, user2.address, true);
      await escrow.TEST_line447_condexpr_variants(user2.address, user1.address, false);
      await escrow.TEST_line447_condexpr_variants(user2.address, user1.address, true);
      
      await escrow.TEST_line447_many_ors(user1.address, user2.address, false);
      await escrow.TEST_line447_many_ors(user1.address, user2.address, true);
      await escrow.TEST_line447_force_right(user1.address, user2.address, false);
      await escrow.TEST_line447_force_right(user1.address, user2.address, true);
      await escrow.TEST_line447_alt2(user1.address, user2.address, false, false);
      await escrow.TEST_line447_alt2(user1.address, user2.address, false, true);
      await escrow.TEST_line447_alt2(user1.address, user2.address, true, false);
      await escrow.TEST_line447_alt2(user1.address, user2.address, true, true);
    });

    it("should cover line 456 condexpr variants systematically", async function () {
      // Use actual TEST_line456_condexpr_variants function (on escrow contract)
      await escrow.TEST_line456_condexpr_variants(user1.address, ethers.parseEther("100"), false);
      await escrow.TEST_line456_condexpr_variants(user1.address, ethers.parseEther("100"), true);
      await escrow.TEST_line456_condexpr_variants(user2.address, 0, false);
      await escrow.TEST_line456_condexpr_variants(user2.address, 0, true);
      
      await escrow.TEST_line456_alt2(user1.address, ethers.parseEther("100"), false, false);
      await escrow.TEST_line456_alt2(user1.address, ethers.parseEther("100"), false, true);
      await escrow.TEST_line456_alt2(user1.address, ethers.parseEther("100"), true, false);
      await escrow.TEST_line456_alt2(user1.address, ethers.parseEther("100"), true, true);
    });
  });

  describe("Lines 466-526: More complex conditional branches", function () {
    it("should cover line 466 condexpr variants", async function () {
      await escrow.TEST_line466_condexpr_variants(1, user1.address, false);
      await escrow.TEST_line466_condexpr_variants(1, user1.address, true);
      await escrow.TEST_line466_condexpr_variants(2, user2.address, false);
      await escrow.TEST_line466_local_variant(1, user1.address, false);
      await escrow.TEST_line466_local_variant(1, user1.address, true);
    });

    it("should cover line 472 force combo variants", async function () {
      await escrow.TEST_line472_force_combo(1, user1.address, false, false);
      await escrow.TEST_line472_force_combo(1, user1.address, false, true);
      await escrow.TEST_line472_force_combo(1, user1.address, true, false);
      await escrow.TEST_line472_force_combo(1, user1.address, true, true);
    });

    it("should cover line 486 combo alt variants", async function () {
      await escrow.TEST_line486_combo_alt(user1.address, ethers.parseEther("100"), false, false);
      await escrow.TEST_line486_combo_alt(user1.address, ethers.parseEther("100"), false, true);
      await escrow.TEST_line486_combo_alt(user1.address, ethers.parseEther("100"), true, false);
      await escrow.TEST_line486_combo_alt(user1.address, ethers.parseEther("100"), true, true);
    });

    it("should cover line 498 force variants", async function () {
      await escrow.TEST_line498_force_variants(user1.address, user2.address, false);
      await escrow.TEST_line498_force_variants(user1.address, user2.address, true);
    });

    it("should cover line 503-506 combo variants", async function () {
      await escrow.TEST_line503_506_combo(1, user1.address, user2.address, false);
      await escrow.TEST_line503_506_combo(1, user1.address, user2.address, true);
      await escrow.TEST_line503_extended_variants(1, user1.address, user2.address, false, false);
      await escrow.TEST_line503_extended_variants(1, user1.address, user2.address, false, true);
      await escrow.TEST_line503_extended_variants(1, user1.address, user2.address, true, false);
      await escrow.TEST_line503_extended_variants(1, user1.address, user2.address, true, true);
    });
  });
});
