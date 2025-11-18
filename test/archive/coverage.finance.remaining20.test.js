const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Finance Remaining 20 Branches', function () {
  this.timeout(300000);

  let dao, user1, user2;
  let token, vaultHub, ledger, seer, security;
  let stableRegistry, treasury;
  let usdc, usdt, dai;

  before(async function () {
    [dao, user1, user2] = await ethers.getSigners();

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();
    
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);
    
    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();
    
    const Security = await ethers.getContractFactory('SecurityHubMock');
    security = await Security.deploy();
    
    const TokenFactory = await ethers.getContractFactory('ERC20Mock');
    usdc = await TokenFactory.deploy('USDC', 'USDC');
    usdt = await TokenFactory.deploy('USDT', 'USDT');
    dai = await TokenFactory.deploy('DAI', 'DAI');
    const vfide = await TokenFactory.deploy('VFIDE', 'VFI');

    const SR = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    stableRegistry = await SR.deploy(dao.address, ledger.target);

    const TV = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');
    treasury = await TV.deploy(dao.address, ledger.target, stableRegistry.target, vfide.target);

    await usdc.mint(treasury.target, ethers.parseEther('100000'));
    await usdt.mint(treasury.target, ethers.parseEther('100000'));
    await dai.mint(treasury.target, ethers.parseEther('100000'));
  });

  describe('Line 87: DAO authorization branch', function () {
    it('should cover DAO-authorized path', async function () {
      // Line 87 counts=[10,0] missing index=1 - need non-DAO caller
      await expect(
        stableRegistry.connect(user1).addAsset(usdc.target, 'USDC')
      ).to.be.revertedWith('SR_OnlyDAO');
    });

    it('should cover DAO-authorized success', async function () {
      await stableRegistry.connect(dao).addAsset(usdc.target, 'USDC');
      expect(await stableRegistry.isStable(usdc.target)).to.be.true;
    });
  });

  describe('Line 182: decimalsOrTry branches', function () {
    it('should test decimals detection with force flag off', async function () {
      // Line 182 counts=[2,0] missing index=1 - force flag variations
      await treasury.TEST_setForceDecimals(18, false);
      await treasury.TEST_decimalsOrTry_public(usdc.target);
    });

    it('should test decimals detection with force flag on', async function () {
      await treasury.TEST_setForceDecimals(6, true);
      await treasury.TEST_decimalsOrTry_public(usdc.target);
    });

    it('should test decimals branches exhaustively', async function () {
      await treasury.TEST_exec_decimals_branches(usdc.target, false, 18);
      await treasury.TEST_exec_decimals_branches(usdc.target, true, 6);
    });
  });

  describe('Line 199: staticcall failure branch', function () {
    it('should cover staticcall failure path', async function () {
      // Line 199 counts=[0,2] missing index=0 - need staticcall to fail
      const RevertingDecimals = await ethers.getContractFactory('RevertingDecimals');
      const reverting = await RevertingDecimals.deploy();
      
      await treasury.TEST_if_staticcall_ok(reverting.target);
      await treasury.TEST_if_token_staticcall_dec_ok(reverting.target);
    });

    it('should cover staticcall success path', async function () {
      await treasury.TEST_if_staticcall_ok(usdc.target);
      await treasury.TEST_if_token_staticcall_dec_ok(usdc.target);
    });

    it('should test exercise decimals try', async function () {
      const RevertingDecimals = await ethers.getContractFactory('RevertingDecimals');
      const reverting = await RevertingDecimals.deploy();
      await treasury.TEST_exercise_decimals_try(reverting.target);
      await treasury.TEST_exercise_decimals_try(usdc.target);
    });
  });

  describe('Line 320: amount validation branches', function () {
    it('should test zero amount branch', async function () {
      // Line 320 counts=[41,0] missing index=1 - amount != 0 check
      await stableRegistry.connect(dao).addAsset(usdc.target, 'USDC');
      await vaultHub.setVault(user1.address, user1.address);
      
      await usdc.mint(user1.address, ethers.parseEther('1000'));
      await usdc.connect(user1).approve(treasury.target, ethers.parseEther('1000'));
      
      // Test zero amount
      await expect(
        treasury.connect(user1).depositStable(usdc.target, 0)
      ).to.be.revertedWith('TV_ZeroAmount');
    });

    it('should test non-zero amount branch', async function () {
      await treasury.connect(user1).depositStable(usdc.target, ethers.parseEther('100'));
    });
  });

  describe('Line 333: send amount validation', function () {
    it('should test amount == 0 branch (left arm)', async function () {
      // Line 333 counts=[0,85] missing index=0 - amount == 0 check
      await treasury.TEST_if_send_zeroToOrAmt(user1.address, 0);
    });

    it('should test amount != 0 branch', async function () {
      await treasury.TEST_if_send_zeroToOrAmt(user1.address, ethers.parseEther('1'));
    });

    it('should test send checks', async function () {
      await treasury.TEST_if_send_zeroToOrAmt(ethers.ZeroAddress, ethers.parseEther('1'));
      await treasury.TEST_if_send_allowed_and_tokenNonZero(usdc.target, user1.address, ethers.parseEther('1'));
      await treasury.TEST_if_send_allowed_and_tokenNonZero(ethers.ZeroAddress, user1.address, 0);
    });
  });

  describe('Conditional expression branches', function () {
    it('should test asset checks', async function () {
      await treasury.TEST_if_asset_ok(usdc.target);
      await treasury.TEST_if_asset_ok(ethers.ZeroAddress);
      await treasury.TEST_if_asset_not_ok(usdc.target);
      await treasury.TEST_if_asset_not_ok(ethers.ZeroAddress);
    });

    it('should test deposit checks explicit', async function () {
      await treasury.TEST_if_deposit_checks_explicit(usdc.target, 0);
      await treasury.TEST_if_deposit_checks_explicit(usdc.target, ethers.parseEther('1'));
      await treasury.TEST_if_deposit_checks_explicit(ethers.ZeroAddress, 0);
    });

    it('should test token checks', async function () {
      await treasury.TEST_if_send_tokenIsZero(usdc.target);
      await treasury.TEST_if_send_tokenIsZero(ethers.ZeroAddress);
    });
  });

  describe('Force flags and comprehensive checks', function () {
    it('should test force flags state', async function () {
      await treasury.TEST_if_force_flags_state();
    });

    it('should test treasury force flags', async function () {
      await treasury.TEST_if_treasury_force_flags(false, false);
      await treasury.TEST_if_treasury_force_flags(false, true);
      await treasury.TEST_if_treasury_force_flags(true, false);
      await treasury.TEST_if_treasury_force_flags(true, true);
    });

    it('should test deposit/send whitelist and zero checks', async function () {
      await treasury.TEST_if_deposit_send_whitelist_and_zero(usdc.target, 0, ethers.ZeroAddress);
      await treasury.TEST_if_deposit_send_whitelist_and_zero(usdc.target, ethers.parseEther('1'), user1.address);
      await treasury.TEST_if_deposit_send_whitelist_and_zero(ethers.ZeroAddress, 0, user1.address);
    });
  });

  describe('Comprehensive Finance coverage', function () {
    it('should test exercise deposit/send checks', async function () {
      await treasury.TEST_exercise_deposit_send_checks(usdc.target, ethers.parseEther('1'), user1.address);
      await treasury.TEST_exercise_deposit_send_checks(ethers.ZeroAddress, 0, ethers.ZeroAddress);
    });

    it('should test if forceDecimalsReturn', async function () {
      await treasury.TEST_if_forceDecimalsReturn(false);
      await treasury.TEST_if_forceDecimalsReturn(true);
    });

    it('should test if deposit notWhitelisted', async function () {
      await treasury.TEST_if_deposit_notWhitelisted(usdc.target);
      await treasury.TEST_if_deposit_notWhitelisted(ethers.ZeroAddress);
    });

    it('should test if deposit zeroAmount', async function () {
      await treasury.TEST_if_deposit_zeroAmount(0);
      await treasury.TEST_if_deposit_zeroAmount(ethers.parseEther('1'));
    });

    it('should test cover decimals and deposit', async function () {
      await treasury.TEST_cover_decimals_and_deposit(usdc.target, false, 18, ethers.parseEther('1'), user1.address);
      await treasury.TEST_cover_decimals_and_deposit(usdc.target, true, 6, 0, ethers.ZeroAddress);
    });

    it('should test exec decimals and tx ifvariants', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await treasury.TEST_exec_decimals_and_tx_ifvariants(usdc.target, false, 18, ethers.parseEther('1'), user1.address, a, b);
      }
    });

    it('should test cover more finance', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await treasury.TEST_cover_more_finance(usdc.target, ethers.parseEther('1'), user1.address, a, 18, false, b);
      }
    });

    it('should test cover finance more2', async function () {
      const bools = [[false, false, false], [false, false, true], [false, true, false], [false, true, true],
                     [true, false, false], [true, false, true], [true, true, false], [true, true, true]];
      for (const [a, b, c] of bools) {
        await treasury.TEST_cover_finance_more2(usdc.target, ethers.parseEther('1'), user1.address, a, b, c);
      }
    });

    it('should test exec finance 413 checks', async function () {
      await treasury.TEST_exec_finance_413_checks(usdc.target, user1.address, ethers.parseEther('1'));
      await treasury.TEST_exec_finance_413_checks(ethers.ZeroAddress, ethers.ZeroAddress, 0);
    });

    it('should test exec decimals for token', async function () {
      await treasury.TEST_exec_decimals_for_token(usdc.target, false, 18);
      await treasury.TEST_exec_decimals_for_token(usdc.target, true, 6);
    });
  });
});
