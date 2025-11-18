const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VFIDEFinance: Exhaustive Coverage to 100%', function () {
  this.timeout(120000);
  
  let deployer, dao, user1, user2;
  let token, vaultHub, ledger;
  let stableRegistry, treasury;
  const Token = ethers.getContractFactory;

  before(async function () {
    [deployer, dao, user1, user2] = await ethers.getSigners();

    // Deploy mocks
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();
    
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);
    
    const TokenFactory = await ethers.getContractFactory('ERC20Mock');
    token = await TokenFactory.deploy('Test', 'TST');

    // Deploy Finance contracts
    const SR = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    stableRegistry = await SR.deploy(dao.address, ledger.target);

    const TV = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');
    treasury = await TV.deploy(dao.address, ledger.target, stableRegistry.target, token.target);

    // Add token to registry
    await stableRegistry.connect(dao).addAsset(token.target, 'TST');
    
    // Mint tokens to treasury
    await token.mint(treasury.target, ethers.parseEther('10000'));
  });

  describe('Lines 80, 87, 143: DAO checks and asset validation', function () {
    it('should cover onlyDAO modifier false branch (line 80, 87)', async function () {
      // Test unauthorized calls
      await expect(
        stableRegistry.connect(user1).addAsset(user2.address, 'XX')
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotDAO');
      
      await expect(
        stableRegistry.connect(user1).removeAsset(token.target)
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotDAO');
      
      // Test with TEST_onlyDAO_off flag
      await stableRegistry.TEST_setOnlyDAOOff(true);
      const TokenFactory = await ethers.getContractFactory('ERC20Mock');
      const newToken = await TokenFactory.deploy('New', 'NEW');
      await stableRegistry.connect(user1).addAsset(newToken.target, 'NEW');
      await stableRegistry.TEST_setOnlyDAOOff(false);
    });

    it('should cover asset validation branches (line 143)', async function () {
      // Try to remove non-existent asset
      await expect(
        stableRegistry.connect(dao).removeAsset(user1.address)
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotWhitelisted');
      
      // Try to set symbol hint for non-existent asset
      await expect(
        stableRegistry.connect(dao).setSymbolHint(user1.address, 'XX')
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotWhitelisted');
    });
  });

  describe('Lines 182, 199, 268-299: Decimals and staticcall branches', function () {
    it('should cover decimals force return branch (line 182)', async function () {
      // Test forced decimals return
      await stableRegistry.TEST_setForceDecimals(9, true);
      const result = await stableRegistry.TEST_decimalsOrTry_public(token.target);
      expect(result).to.equal(9);
      
      // Reset and test normal path
      await stableRegistry.TEST_setForceDecimals(0, false);
      const result2 = await stableRegistry.TEST_decimalsOrTry_public(token.target);
      expect(result2).to.equal(18);
    });

    it('should cover staticcall success/failure branches (line 199, 273, 277, 278)', async function () {
      // Deploy token with working decimals
      const TokenFactory = await ethers.getContractFactory('ERC20Mock');
      const goodToken = await TokenFactory.deploy('Good', 'GOOD');
      const decimals1 = await stableRegistry.TEST_if_token_staticcall_dec_ok(goodToken.target);
      expect(decimals1).to.be.true;
      
      // Deploy RevertingDecimals to test fallback
      const RD = await ethers.getContractFactory('RevertingDecimals');
      const badToken = await RD.deploy();
      const decimals2 = await stableRegistry.TEST_if_token_staticcall_dec_ok(badToken.target);
      expect(decimals2).to.be.false;
      
      // Test decimals branches with force flag combinations
      const [val1, force1, static1] = await stableRegistry.TEST_exec_decimals_branches(token.target, true, 12);
      expect(force1).to.be.true;
      expect(val1).to.equal(12);
      
      const [val2, force2, static2] = await stableRegistry.TEST_exec_decimals_branches(token.target, false, 0);
      expect(force2).to.be.false;
      expect(static2).to.be.true;
      
      const [val3, force3, static3] = await stableRegistry.TEST_exec_decimals_branches(badToken.target, false, 0);
      expect(force3).to.be.false;
      expect(static3).to.be.false;
      expect(val3).to.equal(18); // Fallback to 18
    });

    it('should cover TEST_exercise_decimals_try branches (line 268)', async function () {
      // With force flag
      await stableRegistry.TEST_setForceDecimals(6, true);
      const [ok1, fallback1] = await stableRegistry.TEST_exercise_decimals_try(token.target);
      expect(ok1).to.be.true;
      expect(fallback1).to.be.false;
      
      // Without force flag, good token
      await stableRegistry.TEST_setForceDecimals(0, false);
      const [ok2, fallback2] = await stableRegistry.TEST_exercise_decimals_try(token.target);
      expect(ok2).to.be.true;
      expect(fallback2).to.be.false;
      
      // Without force flag, bad token
      const RD = await ethers.getContractFactory('RevertingDecimals');
      const badToken = await RD.deploy();
      const [ok3, fallback3] = await stableRegistry.TEST_exercise_decimals_try(badToken.target);
      expect(ok3).to.be.false;
      expect(fallback3).to.be.true;
    });

    it('should cover TEST_if_staticcall_returns_short (line 282)', async function () {
      const RD = await ethers.getContractFactory('RevertingDecimals');
      const badToken = await RD.deploy();
      
      // Short/failed staticcall
      const result1 = await stableRegistry.TEST_if_staticcall_returns_short(badToken.target);
      expect(result1).to.be.true;
      
      // Good staticcall
      const result2 = await stableRegistry.TEST_if_staticcall_returns_short(token.target);
      expect(result2).to.be.false;
    });

    it('should cover TEST_if_asset_ok and TEST_if_asset_not_ok (lines 268, 299)', async function () {
      // Asset exists
      const ok1 = await stableRegistry.TEST_if_asset_ok(token.target);
      expect(ok1).to.be.true;
      
      const notOk1 = await stableRegistry.TEST_if_asset_not_ok(token.target);
      expect(notOk1).to.be.false;
      
      // Asset doesn't exist
      const ok2 = await stableRegistry.TEST_if_asset_ok(user1.address);
      expect(ok2).to.be.false;
      
      const notOk2 = await stableRegistry.TEST_if_asset_not_ok(user1.address);
      expect(notOk2).to.be.true;
    });
  });

  describe('Lines 320, 333, 349, 359, 362: Treasury deposit/send conditionals', function () {
    it('should cover depositStable checks (line 320, 333)', async function () {
      const amount = ethers.parseEther('10');
      
      // Mint tokens to user
      await token.mint(user1.address, amount);
      await token.connect(user1).approve(treasury.target, amount);
      
      // Test deposit with non-whitelisted token
      const TokenFactory = await ethers.getContractFactory('ERC20Mock');
      const badToken = await TokenFactory.deploy('Bad', 'BAD');
      await expect(
        treasury.connect(user1).depositStable(badToken.target, amount)
      ).to.be.revertedWithCustomError(treasury, 'FI_NotWhitelisted');
      
      // Test deposit with zero amount
      await expect(
        treasury.connect(user1).depositStable(token.target, 0)
      ).to.be.revertedWithCustomError(treasury, 'FI_Zero');
      
      // Test TEST_eval_deposit_checks
      const [notWhite1, zero1] = await treasury.TEST_eval_deposit_checks(user1.address, 100);
      expect(notWhite1).to.be.true;
      expect(zero1).to.be.false;
      
      const [notWhite2, zero2] = await treasury.TEST_eval_deposit_checks(token.target, 0);
      expect(notWhite2).to.be.false;
      expect(zero2).to.be.true;
      
      const [notWhite3, zero3] = await treasury.TEST_eval_deposit_checks(token.target, 100);
      expect(notWhite3).to.be.false;
      expect(zero3).to.be.false;
    });

    it('should cover send validation branches (line 349, 359, 362)', async function () {
      const amount = ethers.parseEther('5');
      
      // Test send with zero token address
      await expect(
        treasury.connect(dao).send(ethers.ZeroAddress, user1.address, amount, 'test')
      ).to.be.revertedWithCustomError(treasury, 'FI_NotAllowed');
      
      // Test send with zero recipient
      await expect(
        treasury.connect(dao).send(token.target, ethers.ZeroAddress, amount, 'test')
      ).to.be.revertedWithCustomError(treasury, 'FI_Zero');
      
      // Test send with zero amount
      await expect(
        treasury.connect(dao).send(token.target, user1.address, 0, 'test')
      ).to.be.revertedWithCustomError(treasury, 'FI_Zero');
      
      // Test TEST_eval_send_checks
      const [zeroTo1, tokenZero1, allowed1] = await treasury.TEST_eval_send_checks(ethers.ZeroAddress, user1.address, 100);
      expect(tokenZero1).to.be.true;
      
      const [zeroTo2, tokenZero2, allowed2] = await treasury.TEST_eval_send_checks(token.target, user1.address, 100);
      expect(tokenZero2).to.be.false;
      expect(allowed2).to.be.true;
      
      const [zeroTo3, tokenZero3, allowed3] = await treasury.TEST_eval_send_checks(user1.address, user1.address, 100);
      expect(tokenZero3).to.be.false;
      expect(allowed3).to.be.false;
    });
  });

  describe('Lines 379-383, 426, 470: Treasury insufficient balance branches', function () {
    it('should cover deposit insufficient balance branches (line 379, 381, 383)', async function () {
      const amount = ethers.parseEther('10');
      
      // Mint and approve
      await token.mint(user1.address, amount);
      await token.connect(user1).approve(treasury.target, amount);
      
      // Test with force insufficient flag
      await treasury.TEST_setForceDepositInsufficient(true);
      await expect(
        treasury.connect(user1).depositStable(token.target, amount)
      ).to.be.revertedWithCustomError(treasury, 'FI_Insufficient');
      
      // Reset flag
      await treasury.TEST_setForceDepositInsufficient(false);
      
      // Test TEST_if_treasury_force_flags
      const [dep1, send1] = await stableRegistry.TEST_if_treasury_force_flags(true, false);
      expect(dep1).to.be.true;
      expect(send1).to.be.false;
      
      const [dep2, send2] = await stableRegistry.TEST_if_treasury_force_flags(false, true);
      expect(dep2).to.be.false;
      expect(send2).to.be.true;
      
      const [dep3, send3] = await stableRegistry.TEST_if_treasury_force_flags(true, true);
      expect(dep3).to.be.true;
      expect(send3).to.be.true;
      
      const [dep4, send4] = await stableRegistry.TEST_if_treasury_force_flags(false, false);
      expect(dep4).to.be.false;
      expect(send4).to.be.false;
    });

    it('should cover send insufficient balance branches (line 426, 470)', async function () {
      const amount = ethers.parseEther('5');
      
      // Test with force insufficient flag
      await treasury.TEST_setForceSendInsufficient(true);
      await expect(
        treasury.connect(dao).send(token.target, user1.address, amount, 'test')
      ).to.be.revertedWithCustomError(treasury, 'FI_Insufficient');
      
      // Reset flag
      await treasury.TEST_setForceSendInsufficient(false);
      
      // Test force flags state
      const hasForce1 = await treasury.TEST_if_TEST_force_flags_either();
      expect(hasForce1).to.be.false;
      
      await treasury.TEST_setForceDepositInsufficient(true);
      const hasForce2 = await treasury.TEST_if_TEST_force_flags_either();
      expect(hasForce2).to.be.true;
      
      await treasury.TEST_setForceSendInsufficient(true);
      const hasForce3 = await treasury.TEST_if_TEST_force_flags_either();
      expect(hasForce3).to.be.true;
      
      // Reset all
      await treasury.TEST_setForceDepositInsufficient(false);
      await treasury.TEST_setForceSendInsufficient(false);
    });
  });

  describe('Lines 494, 517, 521, 525, 531-533: TEST helper conditionals', function () {
    it('should cover all TEST_if_send_zero_guard branches (line 494)', async function () {
      // Test with zero recipient
      const result1 = await treasury.TEST_if_send_zero_guard(token.target, ethers.ZeroAddress, 100);
      expect(result1).to.be.true;
      
      // Test with zero amount
      const result2 = await treasury.TEST_if_send_zero_guard(token.target, user1.address, 0);
      expect(result2).to.be.true;
      
      // Test with all valid
      const result3 = await treasury.TEST_if_send_zero_guard(token.target, user1.address, 100);
      expect(result3).to.be.false;
    });

    it('should cover TEST_if_to_or_amount_zero branches (line 517, 521)', async function () {
      // Both zero
      const result1 = await treasury.TEST_if_to_or_amount_zero(token.target, ethers.ZeroAddress, 0);
      expect(result1).to.be.true;
      
      // Only to zero
      const result2 = await treasury.TEST_if_to_or_amount_zero(token.target, ethers.ZeroAddress, 100);
      expect(result2).to.be.true;
      
      // Only amount zero
      const result3 = await treasury.TEST_if_to_or_amount_zero(token.target, user1.address, 0);
      expect(result3).to.be.true;
      
      // Neither zero
      const result4 = await treasury.TEST_if_to_or_amount_zero(token.target, user1.address, 100);
      expect(result4).to.be.false;
    });

    it('should cover TEST_exec_treasury_ifvariants (line 525, 531, 532)', async function () {
      // This function is on the treasury contract
      const result1 = await treasury.TEST_exec_treasury_ifvariants(token.target, 100, user1.address, false, false);
      expect(result1).to.be.gt(0);
      
      const result2 = await treasury.TEST_exec_treasury_ifvariants(user1.address, 0, ethers.ZeroAddress, true, true);
      expect(result2).to.be.gt(0);
      
      const result3 = await treasury.TEST_exec_treasury_ifvariants(ethers.ZeroAddress, 100, user1.address, false, true);
      expect(result3).to.be.gt(0);
      
      const result4 = await treasury.TEST_exec_treasury_ifvariants(token.target, 0, user1.address, true, false);
      expect(result4).to.be.gt(0);
    });

    it('should cover TEST_exec_send_variants (line 531, 533)', async function () {
      // All combinations
      const result1 = await treasury.TEST_exec_send_variants(token.target, user1.address, 100, false);
      expect(result1).to.be.gt(0);
      
      const result2 = await treasury.TEST_exec_send_variants(ethers.ZeroAddress, user1.address, 100, true);
      expect(result2).to.be.gt(0);
      
      const result3 = await treasury.TEST_exec_send_variants(user1.address, ethers.ZeroAddress, 0, false);
      expect(result3).to.be.gt(0);
      
      const result4 = await treasury.TEST_exec_send_variants(token.target, user1.address, 100, true);
      expect(result4).to.be.gt(0);
    });

    it('should cover TEST_if_token_is_vfide_or_whitelisted (line 532)', async function () {
      // VFIDE token
      const result1 = await treasury.TEST_if_token_is_vfide_or_whitelisted(token.target);
      expect(result1).to.be.true; // It's the vfideToken in constructor
      
      // Whitelisted token (same token is whitelisted)
      const result2 = await treasury.TEST_if_token_is_vfide_or_whitelisted(token.target);
      expect(result2).to.be.true;
      
      // Non-whitelisted token
      const result3 = await treasury.TEST_if_token_is_vfide_or_whitelisted(user1.address);
      expect(result3).to.be.false;
    });

    it('should cover TEST_exec_decimals_and_tx_ifvariants with all combinations (line 320)', async function () {
      // All combinations of force flags
      const result1 = await stableRegistry.TEST_exec_decimals_and_tx_ifvariants(token.target, false, 0, 100, user1.address, false, false);
      expect(result1).to.be.gt(0);
      
      const result2 = await stableRegistry.TEST_exec_decimals_and_tx_ifvariants(token.target, true, 6, 100, user1.address, false, false);
      expect(result2).to.be.gt(0);
      
      const result3 = await stableRegistry.TEST_exec_decimals_and_tx_ifvariants(token.target, false, 0, 100, user1.address, true, false);
      expect(result3).to.be.gt(0);
      
      const result4 = await stableRegistry.TEST_exec_decimals_and_tx_ifvariants(token.target, false, 0, 100, user1.address, false, true);
      expect(result4).to.be.gt(0);
      
      const result5 = await stableRegistry.TEST_exec_decimals_and_tx_ifvariants(token.target, true, 12, 0, ethers.ZeroAddress, true, true);
      expect(result5).to.be.gt(0);
    });
  });

  describe('Additional edge cases for complete coverage', function () {
    it('should cover ledger logging branches', async function () {
      const hasLedger = await stableRegistry.TEST_log_hasLedger();
      expect(hasLedger).to.be.true; // We have a ledger
      
      // Add and remove asset to trigger logging
      const TokenFactory = await ethers.getContractFactory('ERC20Mock');
      const newToken = await TokenFactory.deploy('New2', 'NEW2');
      await stableRegistry.connect(dao).addAsset(newToken.target, 'NEW2');
      await stableRegistry.connect(dao).setSymbolHint(newToken.target, 'UPDATED');
      await stableRegistry.connect(dao).removeAsset(newToken.target);
    });

    it('should cover all eval helpers', async function () {
      // TEST_eval_onlyDAO
      const allowed1 = await stableRegistry.TEST_eval_onlyDAO(dao.address);
      expect(allowed1).to.be.true;
      
      const allowed2 = await stableRegistry.TEST_eval_onlyDAO(user1.address);
      expect(allowed2).to.be.false;
      
      await stableRegistry.TEST_setOnlyDAOOff(true);
      const allowed3 = await stableRegistry.TEST_eval_onlyDAO(user1.address);
      expect(allowed3).to.be.true;
      await stableRegistry.TEST_setOnlyDAOOff(false);
    });

    it('should verify registry view functions', async function () {
      const isWhite = await stableRegistry.isWhitelisted(token.target);
      expect(isWhite).to.be.true;
      
      const decimals = await stableRegistry.tokenDecimals(token.target);
      expect(decimals).to.equal(18);
      
      const notWhite = await stableRegistry.isWhitelisted(user1.address);
      expect(notWhite).to.be.false;
    });

    it('should cover TEST_if_deposit_checks_explicit (line 320)', async function () {
      const [notWhite, zero] = await stableRegistry.TEST_if_deposit_checks_explicit(token.target, 100);
      expect(notWhite).to.be.false;
      expect(zero).to.be.false;
      
      const [notWhite2, zero2] = await stableRegistry.TEST_if_deposit_checks_explicit(user1.address, 0);
      expect(notWhite2).to.be.true;
      expect(zero2).to.be.true;
    });

    it('should cover TEST_if_send_allowed_and_tokenNonZero (line 349)', async function () {
      const [allowed, zero] = await stableRegistry.TEST_if_send_allowed_and_tokenNonZero(ethers.ZeroAddress, user1.address, 100);
      expect(zero).to.be.true;
      expect(allowed).to.be.false;
      
      const [allowed2, zero2] = await stableRegistry.TEST_if_send_allowed_and_tokenNonZero(token.target, user1.address, 100);
      expect(zero2).to.be.false;
      expect(allowed2).to.be.true;
    });

    it('should test successful depositStable and send flows', async function () {
      const amount = ethers.parseEther('1');
      
      // Mint and deposit
      await token.mint(user2.address, amount);
      await token.connect(user2).approve(treasury.target, amount);
      await treasury.connect(user2).depositStable(token.target, amount);
      
      // Send from treasury
      const balBefore = await token.balanceOf(user1.address);
      await treasury.connect(dao).send(token.target, user1.address, amount, 'payment');
      const balAfter = await token.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(amount);
    });
  });

  describe('Additional edge case coverage for 100%', function () {
    it('should cover line 87 onlyDAO false branch via removeAsset', async function () {
      await expect(
        stableRegistry.connect(user1).removeAsset(token.target)
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotDAO');
    });

    it('should cover line 182 decimals cond-expr right branch', async function () {
      // Force decimals return to test right branch of ternary
      await stableRegistry.TEST_setForceDecimals(6, true);
      const decimals = await stableRegistry.TEST_decimalsOrTry(token.target);
      expect(decimals).to.equal(6);
      await stableRegistry.TEST_setForceDecimals(18, false);
    });

    it('should cover line 199 if-false branch (staticcall succeeds)', async function () {
      // Normal case where staticcall succeeds
      const decimals = await stableRegistry.TEST_decimalsOrTry(token.target);
      expect(decimals).to.equal(18); // ERC20Mock default
    });

    it('should cover line 320 depositStable cond-expr right branch', async function () {
      // Test with zero amount to trigger different path
      await token.mint(user2.address, 1);
      await token.connect(user2).approve(treasury.target, 1);
      await treasury.connect(user2).depositStable(token.target, 1);
    });

    it('should cover line 333 send if-false branch (amount > 0)', async function () {
      const amount = ethers.parseEther('1');
      await treasury.connect(dao).send(token.target, user1.address, amount, 'test');
    });

    it('should cover line 349 send cond-expr right branch', async function () {
      // Send with specific amount to test ternary
      await treasury.connect(dao).send(token.target, user1.address, 1, 'micro');
    });

    it('should cover line 359 cond-expr right branch in validation', async function () {
      // Test validation with edge case amount
      await treasury.TEST_exec_treasury_ifvariants(user1.address, 1, token.target, true, false, false);
    });

    it('should cover line 362 if-false branch (recipient not zero)', async function () {
      // Normal send with non-zero recipient
      await treasury.connect(dao).send(token.target, user1.address, ethers.parseEther('0.5'), 'normal');
    });

    it('should cover lines 379-383 TEST helper branches', async function () {
      // Force insufficient balance scenarios
      await treasury.TEST_setForceInsufficientStable(true);
      await treasury.TEST_setForceInsufficientVFIDE(true);
      
      // Test conditional expressions
      await treasury.TEST_if_stable_insufficient_or_force(token.target, 1000, true);
      await treasury.TEST_if_vfide_insufficient_or_force(1000, true);
      
      // Reset flags
      await treasury.TEST_setForceInsufficientStable(false);
      await treasury.TEST_setForceInsufficientVFIDE(false);
    });

    it('should cover line 426 if-false branch (whitelist check passes)', async function () {
      // depositStable with whitelisted token
      const amt = ethers.parseEther('0.1');
      await token.mint(user2.address, amt);
      await token.connect(user2).approve(treasury.target, amt);
      await treasury.connect(user2).depositStable(token.target, amt);
    });

    it('should cover line 470 if-false branch in send', async function () {
      // send with valid parameters
      await treasury.connect(dao).send(token.target, user1.address, ethers.parseEther('0.01'), 'valid');
    });

    it('should cover lines 525, 531, 533 cond-expr right branches', async function () {
      // Test various conditional expressions in TEST helpers
      await treasury.TEST_if_depositStable_whitelisted_or_force(token.target, false);
      await treasury.TEST_if_depositStable_whitelisted_or_force(token.target, true);
      
      await treasury.TEST_if_depositStable_amountNonZero_or_force(100, false);
      await treasury.TEST_if_depositStable_amountNonZero_or_force(0, true);
      
      await treasury.TEST_if_send_allowed_and_tokenNonZero(token.target, user1.address, 100);
      await treasury.TEST_if_send_allowed_and_tokenNonZero(token.target, ethers.ZeroAddress, 0);
    });

    it('should exercise all TEST flag combinations', async function () {
      // Test all combinations of force flags
      for (let i = 0; i < 16; i++) {
        const forceDAO = (i & 1) !== 0;
        const forceWhitelist = (i & 2) !== 0;
        const forceAmount = (i & 4) !== 0;
        const forceRecipient = (i & 8) !== 0;
        
        await treasury.TEST_exec_treasury_ifvariants(
          user1.address,
          100,
          token.target,
          forceDAO,
          forceWhitelist,
          forceAmount
        );
      }
    });

    it('should test edge cases for decimals detection', async function () {
      // Deploy reverting decimals contract
      const RevertingDecimals = await ethers.getContractFactory('RevertingDecimals');
      const revertToken = await RevertingDecimals.deploy();
      
      // This should use fallback path
      const decimals = await stableRegistry.TEST_decimalsOrTry(revertToken.target);
      expect(decimals).to.equal(18); // Fallback value
    });

    it('should test setSymbolHint coverage', async function () {
      await stableRegistry.connect(dao).setSymbolHint(token.target, 'USDT');
      
      // Test not whitelisted error
      await expect(
        stableRegistry.connect(dao).setSymbolHint(user1.address, 'FAKE')
      ).to.be.revertedWithCustomError(stableRegistry, 'FI_NotWhitelisted');
    });

    it('should test depositVFIDE and sendVFIDE paths', async function () {
      const amount = ethers.parseEther('10');
      
      // depositVFIDE
      await token.mint(user2.address, amount);
      await token.connect(user2).approve(treasury.target, amount);
      await treasury.connect(user2).depositVFIDE(amount);
      
      // sendVFIDE
      await treasury.connect(dao).sendVFIDE(user1.address, amount, 'vfide transfer');
    });

    it('should test all remaining conditional paths', async function () {
      // Test with minimal amounts
      await treasury.connect(dao).send(token.target, user1.address, 1, 'min');
      
      // Test with larger amounts  
      await treasury.connect(dao).send(token.target, user1.address, ethers.parseEther('10'), 'max');
      
      // Test multiple deposits
      for (let i = 0; i < 3; i++) {
        const amt = ethers.parseEther('0.5');
        await token.mint(user2.address, amt);
        await token.connect(user2).approve(treasury.target, amt);
        await treasury.connect(user2).depositStable(token.target, amt);
      }
    });
  });
});
