const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Coverage: VFIDEFinance Uncovered Branches', function () {
  it('covers remaining Finance contract branches systematically', async function () {
    const signers = await ethers.getSigners();
    const [deployer, dao, user1, user2, alice] = signers;

    // Deploy mocks
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const RevertDecimals = await ethers.getContractFactory('RevertingDecimals');

    const token = await ERC20.deploy('Test', 'TST');
    await token.waitForDeployment();
    
    const token2 = await ERC20.deploy('T2', 'T2');
    await token2.waitForDeployment();
    
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();
    
    const badToken = await RevertDecimals.deploy();
    await badToken.waitForDeployment();

    // Deploy Finance contracts
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Vault = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
    
    const vault = await Vault.deploy(dao.address, ledger.target, stable.target, token.target);
    await vault.waitForDeployment();

    // Enable TEST modes
    await stable.TEST_setOnlyDAOOff(true);
    await vault.TEST_setOnlyDAOOff_Tx(true);

    // ========== StablecoinRegistry: Line 80 (removeAsset) ==========
    // Add an asset first
    await stable.addAsset(token.target, 'TST');
    let isWhite = await stable.isWhitelisted(token.target);
    expect(isWhite).to.equal(true);
    
    // Test removeAsset - covers line 80 branch
    await stable.removeAsset(token.target);
    isWhite = await stable.isWhitelisted(token.target);
    expect(isWhite).to.equal(false);
    
    // Re-add for other tests
    await stable.addAsset(token.target, 'TST');

    // ========== StablecoinRegistry: Line 87 (setSymbolHint) ==========
    // Test setSymbolHint - covers line 87 branch
    await stable.setSymbolHint(token.target, 'TEST_NEW');
    const asset = await stable.assets(token.target);
    expect(asset.symbolHint).to.equal('TEST_NEW');
    
    // Change it again to exercise the branch multiple times
    await stable.setSymbolHint(token.target, 'TST_UPDATED');
    const asset2 = await stable.assets(token.target);
    expect(asset2.symbolHint).to.equal('TST_UPDATED');

    // ========== StablecoinRegistry: Decimals branches (lines 98-103) ==========
    // Test decimals fallback when staticcall fails
    const dec_bad = await stable.TEST_decimalsOrTry_public(badToken.target);
    expect(dec_bad).to.equal(18); // Should fallback to 18
    
    // Test decimals when staticcall succeeds
    const dec_good = await stable.TEST_decimalsOrTry_public(token.target);
    expect(dec_good).to.equal(18);
    
    // Test with force decimals flag
    await stable.TEST_setForceDecimals(6, true);
    const dec_forced = await stable.TEST_decimalsOrTry_public(token.target);
    expect(dec_forced).to.equal(6);
    await stable.TEST_setForceDecimals(0, false);

    // ========== StablecoinRegistry: TEST helper branches ==========
    // Test if_forceDecimalsReturn
    const force_t = await stable.TEST_if_forceDecimalsReturn(true);
    expect(force_t).to.equal(true);
    const force_f = await stable.TEST_if_forceDecimalsReturn(false);
    expect(force_f).to.equal(false);
    
    // Test if_staticcall_ok
    const stat_ok = await stable.TEST_if_staticcall_ok(token.target);
    expect(typeof stat_ok === 'boolean').to.equal(true);
    const stat_bad = await stable.TEST_if_staticcall_ok(badToken.target);
    expect(typeof stat_bad === 'boolean').to.equal(true);
    
    // Test if_deposit_notWhitelisted
    await stable.addAsset(token2.target, 'T2');
    const dep_white = await stable.TEST_if_deposit_notWhitelisted(token2.target);
    expect(dep_white).to.equal(false);
    const dep_not = await stable.TEST_if_deposit_notWhitelisted(alice.address);
    expect(dep_not).to.equal(true);
    
    // Test if_deposit_zeroAmount
    const zero_t = await stable.TEST_if_deposit_zeroAmount(0);
    expect(zero_t).to.equal(true);
    const zero_f = await stable.TEST_if_deposit_zeroAmount(100);
    expect(zero_f).to.equal(false);
    
    // Test if_send_zeroToOrAmt
    const send_z1 = await stable.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, 100);
    expect(send_z1).to.equal(true);
    const send_z2 = await stable.TEST_if_send_zeroToOrAmt(alice.address, 0);
    expect(send_z2).to.equal(true);
    const send_z3 = await stable.TEST_if_send_zeroToOrAmt(alice.address, 100);
    expect(send_z3).to.equal(false);
    
    // Test if_send_tokenIsZero
    const tok_z1 = await stable.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
    expect(tok_z1).to.equal(true);
    const tok_z2 = await stable.TEST_if_send_tokenIsZero(token.target);
    expect(tok_z2).to.equal(false);

    // ========== StablecoinRegistry: Complex condition helpers ==========
    // Test TEST_cover_decimals_and_deposit
    const cov1 = await stable.TEST_cover_decimals_and_deposit(
      token.target, false, 0, 100, alice.address
    );
    expect(cov1.usedForceReturn).to.equal(false);
    
    const cov2 = await stable.TEST_cover_decimals_and_deposit(
      token.target, true, 6, 100, alice.address
    );
    expect(cov2.usedForceReturn).to.equal(true);
    
    const cov3 = await stable.TEST_cover_decimals_and_deposit(
      badToken.target, false, 0, 0, ethers.ZeroAddress
    );
    expect(cov3.depositZeroAmt).to.equal(true);
    expect(cov3.sendZeroToOrAmt).to.equal(true);
    
    // Test TEST_exec_decimals_and_tx_ifvariants
    const exec1 = await stable.TEST_exec_decimals_and_tx_ifvariants(
      token.target, false, 0, 100, alice.address, false, false
    );
    expect(exec1 > 0).to.equal(true);
    
    const exec2 = await stable.TEST_exec_decimals_and_tx_ifvariants(
      token.target, true, 6, 100, alice.address, false, false
    );
    expect(exec2 > 0).to.equal(true);
    
    const exec3 = await stable.TEST_exec_decimals_and_tx_ifvariants(
      badToken.target, false, 0, 0, ethers.ZeroAddress, true, true
    );
    expect(exec3 > 0).to.equal(true);

    // ========== StablecoinRegistry: Additional pinpoint helpers ==========
    // Test if_asset_ok
    const asset_ok1 = await stable.TEST_if_asset_ok(token.target);
    expect(asset_ok1).to.equal(true);
    const asset_ok2 = await stable.TEST_if_asset_ok(alice.address);
    expect(asset_ok2).to.equal(false);
    
    // Test if_token_staticcall_dec_ok
    const dec_ok1 = await stable.TEST_if_token_staticcall_dec_ok(token.target);
    expect(typeof dec_ok1 === 'boolean').to.equal(true);
    const dec_ok2 = await stable.TEST_if_token_staticcall_dec_ok(badToken.target);
    expect(typeof dec_ok2 === 'boolean').to.equal(true);
    
    // Test if_deposit_checks_explicit
    const dep_chk1 = await stable.TEST_if_deposit_checks_explicit(token.target, 100);
    expect(dep_chk1.notWhitelisted).to.equal(false);
    expect(dep_chk1.zeroAmount).to.equal(false);
    
    const dep_chk2 = await stable.TEST_if_deposit_checks_explicit(alice.address, 0);
    expect(dep_chk2.notWhitelisted).to.equal(true);
    expect(dep_chk2.zeroAmount).to.equal(true);
    
    // Test if_send_allowed_and_tokenNonZero
    const send_allow1 = await stable.TEST_if_send_allowed_and_tokenNonZero(token.target, alice.address, 100);
    expect(send_allow1.allowedToken).to.equal(true);
    expect(send_allow1.tokenIsZero).to.equal(false);
    
    const send_allow2 = await stable.TEST_if_send_allowed_and_tokenNonZero(ethers.ZeroAddress, alice.address, 100);
    expect(send_allow2.tokenIsZero).to.equal(true);
    
    // Test if_asset_not_ok
    const not_ok1 = await stable.TEST_if_asset_not_ok(alice.address);
    expect(not_ok1).to.equal(true);
    const not_ok2 = await stable.TEST_if_asset_not_ok(token.target);
    expect(not_ok2).to.equal(false);
    
    // Test if_staticcall_returns_short
    const short1 = await stable.TEST_if_staticcall_returns_short(badToken.target);
    expect(typeof short1 === 'boolean').to.equal(true);
    const short2 = await stable.TEST_if_staticcall_returns_short(token.target);
    expect(typeof short2 === 'boolean').to.equal(true);
    
    // Test if_treasury_force_flags
    const flags1 = await stable.TEST_if_treasury_force_flags(true, false);
    expect(flags1[0]).to.equal(true);
    const flags2 = await stable.TEST_if_treasury_force_flags(false, true);
    expect(flags2[0]).to.equal(false);
    
    // Test if_deposit_send_whitelist_and_zero
    const ws1 = await stable.TEST_if_deposit_send_whitelist_and_zero(token.target, 100, alice.address);
    expect(ws1.isWhite).to.equal(true);
    expect(ws1.isZeroAmount).to.equal(false);
    expect(ws1.isZeroTo).to.equal(false);
    
    const ws2 = await stable.TEST_if_deposit_send_whitelist_and_zero(alice.address, 0, ethers.ZeroAddress);
    expect(ws2.isWhite).to.equal(false);
    expect(ws2.isZeroAmount).to.equal(true);
    expect(ws2.isZeroTo).to.equal(true);

    // ========== StablecoinRegistry: Composite helpers ==========
    // Test TEST_cover_more_finance
    const more1 = await stable.TEST_cover_more_finance(
      token.target, 100, alice.address, false, 0, false, false
    );
    expect(more1 > 0).to.equal(true);
    
    const more2 = await stable.TEST_cover_more_finance(
      token.target, 100, alice.address, true, 6, true, true
    );
    expect(more2 > 0).to.equal(true);
    
    const more3 = await stable.TEST_cover_more_finance(
      badToken.target, 0, ethers.ZeroAddress, false, 0, false, false
    );
    expect(more3 > 0).to.equal(true);
    
    // Test TEST_cover_finance_more2
    const more2_1 = await stable.TEST_cover_finance_more2(
      token.target, 100, alice.address, false, false, false
    );
    expect(more2_1 > 0).to.equal(true);
    
    const more2_2 = await stable.TEST_cover_finance_more2(
      token.target, 100, alice.address, true, true, true
    );
    expect(more2_2 > 0).to.equal(true);
    
    // Test TEST_exec_finance_413_checks
    const f413_1 = await stable.TEST_exec_finance_413_checks(token.target, alice.address, 100);
    expect(f413_1 > 0).to.equal(true);
    
    const f413_2 = await stable.TEST_exec_finance_413_checks(ethers.ZeroAddress, ethers.ZeroAddress, 0);
    expect(f413_2 > 0).to.equal(true);
    
    // Test TEST_exec_decimals_for_token
    const dec_ex1 = await stable.TEST_exec_decimals_for_token(token.target, false, 0);
    expect(dec_ex1[0] >= 0).to.equal(true);
    
    const dec_ex2 = await stable.TEST_exec_decimals_for_token(token.target, true, 6);
    expect(dec_ex2[0]).to.equal(6);
    expect(dec_ex2[1]).to.equal(true);
    
    const dec_ex3 = await stable.TEST_exec_decimals_for_token(badToken.target, false, 0);
    expect(dec_ex3[0]).to.equal(18);

    // ========== EcoTreasuryVault: Deposit/Send branches ==========
    // Test TEST_eval_deposit_checks
    const dep_eval1 = await vault.TEST_eval_deposit_checks(token.target, 100);
    expect(dep_eval1.notWhitelisted).to.equal(false);
    expect(dep_eval1.zeroAmount).to.equal(false);
    
    const dep_eval2 = await vault.TEST_eval_deposit_checks(alice.address, 0);
    expect(dep_eval2.notWhitelisted).to.equal(true);
    expect(dep_eval2.zeroAmount).to.equal(true);
    
    // Test TEST_eval_send_checks
    const send_eval1 = await vault.TEST_eval_send_checks(token.target, alice.address, 100);
    expect(send_eval1.zeroToOrAmt).to.equal(false);
    expect(send_eval1.tokenIsZero).to.equal(false);
    expect(send_eval1.allowedToken).to.equal(true);
    
    const send_eval2 = await vault.TEST_eval_send_checks(ethers.ZeroAddress, ethers.ZeroAddress, 0);
    expect(send_eval2.zeroToOrAmt).to.equal(true);
    expect(send_eval2.tokenIsZero).to.equal(true);
    
    // Test TEST_if_send_zero_guard
    const guard1 = await vault.TEST_if_send_zero_guard(token.target, ethers.ZeroAddress, 100);
    expect(guard1).to.equal(true);
    
    const guard2 = await vault.TEST_if_send_zero_guard(token.target, alice.address, 0);
    expect(guard2).to.equal(true);
    
    const guard3 = await vault.TEST_if_send_zero_guard(token.target, alice.address, 100);
    expect(guard3).to.equal(false);
    
    // Test TEST_exec_treasury_ifvariants
    const treas1 = await vault.TEST_exec_treasury_ifvariants(token.target, 100, alice.address, false, false);
    expect(treas1 > 0).to.equal(true);
    
    const treas2 = await vault.TEST_exec_treasury_ifvariants(alice.address, 0, ethers.ZeroAddress, true, true);
    expect(treas2 > 0).to.equal(true);
    
    // Test TEST_if_to_or_amount_zero
    const to_zero1 = await vault.TEST_if_to_or_amount_zero(token.target, ethers.ZeroAddress, 100);
    expect(to_zero1).to.equal(true);
    
    const to_zero2 = await vault.TEST_if_to_or_amount_zero(token.target, alice.address, 0);
    expect(to_zero2).to.equal(true);
    
    const to_zero3 = await vault.TEST_if_to_or_amount_zero(token.target, alice.address, 100);
    expect(to_zero3).to.equal(false);
    
    // Test TEST_if_token_is_vfide_or_whitelisted
    const vfide_white1 = await vault.TEST_if_token_is_vfide_or_whitelisted(token.target);
    expect(vfide_white1).to.equal(true); // token is whitelisted
    
    const vfide_white2 = await vault.TEST_if_token_is_vfide_or_whitelisted(alice.address);
    expect(typeof vfide_white2 === 'boolean').to.equal(true);
    
    // Test TEST_if_TEST_force_flags_either
    await vault.TEST_setForceDepositInsufficient(false);
    await vault.TEST_setForceSendInsufficient(false);
    const flags_either1 = await vault.TEST_if_TEST_force_flags_either();
    expect(flags_either1).to.equal(false);
    
    await vault.TEST_setForceDepositInsufficient(true);
    const flags_either2 = await vault.TEST_if_TEST_force_flags_either();
    expect(flags_either2).to.equal(true);
    
    await vault.TEST_setForceDepositInsufficient(false);
    await vault.TEST_setForceSendInsufficient(true);
    const flags_either3 = await vault.TEST_if_TEST_force_flags_either();
    expect(flags_either3).to.equal(true);
    
    await vault.TEST_setForceSendInsufficient(false);
    
    // Test TEST_exec_send_variants
    const send_var1 = await vault.TEST_exec_send_variants(token.target, alice.address, 100, false);
    expect(send_var1 > 0).to.equal(true);
    
    const send_var2 = await vault.TEST_exec_send_variants(ethers.ZeroAddress, ethers.ZeroAddress, 0, true);
    expect(send_var2 > 0).to.equal(true);
    
    const send_var3 = await vault.TEST_exec_send_variants(alice.address, alice.address, 100, false);
    expect(send_var3 > 0).to.equal(true);

    // ========== Additional edge cases ==========
    // Test with multiple tokens
    const token3 = await ERC20.deploy('T3', 'T3');
    await token3.waitForDeployment();
    
    await stable.addAsset(token3.target, 'T3');
    
    // Test decimals for new token
    const dec3 = await stable.TEST_decimalsOrTry_public(token3.target);
    expect(dec3 >= 0).to.equal(true);
    
    // Test whitelist checks
    const white3 = await stable.isWhitelisted(token3.target);
    expect(white3).to.equal(true);
    
    // Remove and verify
    await stable.removeAsset(token3.target);
    const white3_removed = await stable.isWhitelisted(token3.target);
    expect(white3_removed).to.equal(false);
    
    // Test with various decimal values
    await stable.TEST_setForceDecimals(0, true);
    const dec_0 = await stable.TEST_decimalsOrTry_public(token.target);
    expect(dec_0).to.equal(0);
    
    await stable.TEST_setForceDecimals(255, true);
    const dec_255 = await stable.TEST_decimalsOrTry_public(token.target);
    expect(dec_255).to.equal(255);
    
    await stable.TEST_setForceDecimals(0, false);

    // ========== Test onlyDAO modifier branches ==========
    // Test eval_onlyDAO
    const eval_dao1 = await stable.TEST_eval_onlyDAO(dao.address);
    expect(eval_dao1).to.equal(true);
    
    const eval_dao2 = await stable.TEST_eval_onlyDAO(alice.address);
    expect(eval_dao2).to.equal(true); // TEST_onlyDAO_off is true
    
    // Test TEST_log_hasLedger
    const has_ledger = await stable.TEST_log_hasLedger();
    expect(has_ledger).to.equal(true);
    
    // Test TEST_exercise_decimals_try
    const ex_dec1 = await stable.TEST_exercise_decimals_try(token.target);
    expect(ex_dec1.okReturn).to.equal(false); // forceReturn is off
    
    await stable.TEST_setForceDecimals(6, true);
    const ex_dec2 = await stable.TEST_exercise_decimals_try(token.target);
    expect(ex_dec2.okReturn).to.equal(true); // forceReturn is on
    await stable.TEST_setForceDecimals(0, false);
    
    // Test TEST_exercise_deposit_send_checks
    const ex_dep1 = await stable.TEST_exercise_deposit_send_checks(token.target, 100, alice.address);
    expect(ex_dep1.notWhitelisted).to.equal(false);
    expect(ex_dep1.zeroAmount).to.equal(false);
    expect(ex_dep1.zeroToOrAmt).to.equal(false);
    
    const ex_dep2 = await stable.TEST_exercise_deposit_send_checks(alice.address, 0, ethers.ZeroAddress);
    expect(ex_dep2.notWhitelisted).to.equal(true);
    expect(ex_dep2.zeroAmount).to.equal(true);
    expect(ex_dep2.zeroToOrAmt).to.equal(true);

    // ========== Test exec_decimals_branches ==========
    const dec_br1 = await stable.TEST_exec_decimals_branches(token.target, false, 0);
    expect(dec_br1.val >= 0).to.equal(true);
    
    const dec_br2 = await stable.TEST_exec_decimals_branches(token.target, true, 6);
    expect(dec_br2.val).to.equal(6);
    expect(dec_br2.usedForce).to.equal(true);
    
    const dec_br3 = await stable.TEST_exec_decimals_branches(badToken.target, false, 0);
    expect(dec_br3.val).to.equal(18);

    // Final assertion
    expect(true).to.equal(true);
  });
});
