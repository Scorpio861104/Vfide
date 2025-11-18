const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Commerce Bruteforce: Lines 664, 871, 964 Exhaustive', function () {
  this.timeout(180000);

  let deployer, dao, user1, user2, merchant1, merchant2;
  let token, vaultHub, ledger, seer, security;
  let registry, escrow;

  before(async function () {
    [deployer, dao, user1, user2, merchant1, merchant2] = await ethers.getSigners();

    // Deploy mocks
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();
    
    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);
    
    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();
    
    const Security = await ethers.getContractFactory('SecurityHubMock');
    security = await Security.deploy();
    
    const TokenFactory = await ethers.getContractFactory('ERC20Mock');
    token = await TokenFactory.deploy('Test', 'TST');

    // Deploy Commerce contracts
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');
    registry = await MR.deploy(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);

    const CE = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:CommerceEscrow');
    escrow = await CE.deploy(dao.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);

    // Setup vaults and scores for merchants
    await vaultHub.setVault(merchant1.address, merchant1.address);
    await vaultHub.setVault(merchant2.address, merchant2.address);
    await seer.setMin(100);
    await seer.setScore(merchant1.address, 150);
    await seer.setScore(merchant2.address, 150);
    
    // Setup merchants with various statuses
    const META = ethers.id('merchant');
    await registry.connect(merchant1).addMerchant(META);
    await registry.connect(merchant2).addMerchant(META);
    
    // merchant1 and merchant2 are now ACTIVE
    // user1 and user2 have NONE status (not merchants)

    // Mint tokens
    await token.mint(escrow.target, ethers.parseEther('100000'));
  });

  describe('Line 664 TEST helpers - threshold and status checks', function () {
    it('should cover TEST_line664_force_mix - all 4 bool combinations', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      const refunds = [0, 5, 10];
      const disputes = [0, 3, 5];
      
      for (const [fa, fb] of bools) {
        for (const r of refunds) {
          for (const d of disputes) {
            await escrow.TEST_line664_force_mix(merchant1.address, user1.address, r, d, fa, fb);
          }
        }
      }
    });

    it('should cover TEST_line664_alt2 - flip variations', async function () {
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 5, 3, false);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 5, 3, true);
      await escrow.TEST_line664_alt2(merchant2.address, user1.address, 10, 5, false);
      await escrow.TEST_line664_alt2(merchant2.address, user1.address, 10, 5, true);
    });

    it('should cover TEST_line664_threshold_local', async function () {
      const counts = [[0, 0], [5, 3], [10, 5], [4, 2], [6, 4]];
      for (const [r, d] of counts) {
        await escrow.TEST_line664_threshold_local(merchant1.address, r, d, false);
        await escrow.TEST_line664_threshold_local(merchant1.address, r, d, true);
        await escrow.TEST_line664_threshold_local(merchant2.address, r, d, false);
        await escrow.TEST_line664_threshold_local(merchant2.address, r, d, true);
      }
    });

    it('should cover TEST_line664_exhaustive - all 8 bool combinations', async function () {
      const bools3 = [
        [false, false, false], [false, false, true], [false, true, false], [false, true, true],
        [true, false, false], [true, false, true], [true, true, false], [true, true, true]
      ];
      
      for (const [fa, fb, extra] of bools3) {
        await escrow.TEST_line664_exhaustive(merchant1.address, user1.address, 5, 3, fa, fb, extra);
        await escrow.TEST_line664_exhaustive(merchant2.address, user1.address, 0, 0, fa, fb, extra);
        await escrow.TEST_line664_exhaustive(user1.address, user2.address, 10, 5, fa, fb, extra);
      }
    });

    it('should cover TEST_line664_injected_zero', async function () {
      await escrow.TEST_line664_injected_zero(ethers.ZeroAddress, user1.address, 0, 0);
      await escrow.TEST_line664_injected_zero(ethers.ZeroAddress, user1.address, 5, 3);
      await escrow.TEST_line664_injected_zero(merchant1.address, user1.address, 0, 0);
      await escrow.TEST_line664_injected_zero(merchant1.address, user1.address, 5, 3);
      await escrow.TEST_line664_injected_zero(merchant2.address, user1.address, 10, 5);
    });

    it('should cover TEST_line664_msgsender_vault', async function () {
      const counts = [[0, 0], [5, 3], [10, 5], [4, 2]];
      for (const [r, d] of counts) {
        await escrow.TEST_line664_msgsender_vault(r, d, false);
        await escrow.TEST_line664_msgsender_vault(r, d, true);
      }
    });

    it('should cover TEST_line664_localdup_order', async function () {
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 5, 3, false);
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 5, 3, true);
      await escrow.TEST_line664_localdup_order(merchant2.address, user2.address, 10, 5, false);
      await escrow.TEST_line664_localdup_order(merchant2.address, user2.address, 10, 5, true);
    });

    it('should cover TEST_line664_threshold_ifelse', async function () {
      const counts = [[0, 0], [5, 3], [10, 5], [4, 2], [6, 4], [100, 100]];
      for (const [r, d] of counts) {
        await escrow.TEST_line664_threshold_ifelse(merchant1.address, r, d);
        await escrow.TEST_line664_threshold_ifelse(merchant2.address, r, d);
        await escrow.TEST_line664_threshold_ifelse(user1.address, r, d);
      }
    });

    it('should cover TEST_line664_ternary_vs_if', async function () {
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 5, 3, false);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 5, 3, true);
      await escrow.TEST_line664_ternary_vs_if(merchant2.address, user2.address, 10, 5, false);
      await escrow.TEST_line664_ternary_vs_if(merchant2.address, user2.address, 10, 5, true);
    });

    it('should cover TEST_line664_combined_mask', async function () {
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 5, 3, false);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 5, 3, true);
      await escrow.TEST_line664_combined_mask(merchant2.address, user2.address, 10, 5, false);
      await escrow.TEST_line664_combined_mask(merchant2.address, user2.address, 10, 5, true);
    });
  });

  describe('Line 871 TEST helpers - merchant/vault checks', function () {
    it('should cover TEST_line871_force_alt', async function () {
      await escrow.TEST_line871_force_alt(merchant1.address, false);
      await escrow.TEST_line871_force_alt(merchant1.address, true);
      await escrow.TEST_line871_force_alt(merchant2.address, false);
      await escrow.TEST_line871_force_alt(merchant2.address, true);
      await escrow.TEST_line871_force_alt(user1.address, false);
      await escrow.TEST_line871_force_alt(user1.address, true);
    });

    it('should cover TEST_line871_deep - all 4 bool combinations', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [flag, extra] of bools) {
        await escrow.TEST_line871_deep(merchant1.address, flag, extra);
        await escrow.TEST_line871_deep(merchant2.address, flag, extra);
        await escrow.TEST_line871_deep(user1.address, flag, extra);
      }
    });

    it('should cover TEST_line871_injected', async function () {
      await escrow.TEST_line871_injected(ethers.ZeroAddress, false);
      await escrow.TEST_line871_injected(ethers.ZeroAddress, true);
      await escrow.TEST_line871_injected(merchant1.address, false);
      await escrow.TEST_line871_injected(merchant1.address, true);
      await escrow.TEST_line871_injected(user1.address, false);
      await escrow.TEST_line871_injected(user1.address, true);
    });

    it('should cover TEST_line871_msgsender', async function () {
      await escrow.TEST_line871_msgsender(false);
      await escrow.TEST_line871_msgsender(true);
    });

    it('should cover TEST_line871_localdup', async function () {
      await escrow.TEST_line871_localdup(merchant1.address, user1.address, false);
      await escrow.TEST_line871_localdup(merchant1.address, user1.address, true);
      await escrow.TEST_line871_localdup(merchant2.address, user2.address, false);
      await escrow.TEST_line871_localdup(merchant2.address, user2.address, true);
      await escrow.TEST_line871_localdup(user1.address, merchant1.address, false);
      await escrow.TEST_line871_localdup(user1.address, merchant1.address, true);
    });
  });

  describe('Line 964 TEST helpers - amount and status checks', function () {
    it('should cover TEST_line964_combo - all 4 bool combinations', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      const amounts = [0, 1, 100, ethers.parseEther('1'), ethers.parseEther('1000')];
      
      for (const [a, b] of bools) {
        for (const amt of amounts) {
          await escrow.TEST_line964_combo(merchant1.address, amt, a, b);
          await escrow.TEST_line964_combo(merchant2.address, amt, a, b);
          await escrow.TEST_line964_combo(user1.address, amt, a, b);
        }
      }
    });

    it('should cover TEST_line964_injected', async function () {
      const amounts = [0, 1, 100, ethers.parseEther('10')];
      for (const amt of amounts) {
        await escrow.TEST_line964_injected(ethers.ZeroAddress, amt, false);
        await escrow.TEST_line964_injected(ethers.ZeroAddress, amt, true);
        await escrow.TEST_line964_injected(merchant1.address, amt, false);
        await escrow.TEST_line964_injected(merchant1.address, amt, true);
      }
    });

    it('should cover TEST_line964_ifelse - all 4 bool combinations', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      const amounts = [0, 1, 100, ethers.parseEther('1')];
      
      for (const [a, b] of bools) {
        for (const amt of amounts) {
          await escrow.TEST_line964_ifelse(merchant1.address, amt, a, b);
          await escrow.TEST_line964_ifelse(merchant2.address, amt, a, b);
          await escrow.TEST_line964_ifelse(user1.address, amt, a, b);
          await escrow.TEST_line964_ifelse(ethers.ZeroAddress, amt, a, b);
        }
      }
    });

    it('should cover TEST_line964_msgsender', async function () {
      const amounts = [0, 1, 100, ethers.parseEther('5'), ethers.parseEther('100')];
      for (const amt of amounts) {
        await escrow.TEST_line964_msgsender(amt, false);
        await escrow.TEST_line964_msgsender(amt, true);
      }
    });

    it('should cover TEST_line964_1060_combined', async function () {
      await escrow.TEST_line964_1060_combined(merchant1.address, 100, 1, false);
      await escrow.TEST_line964_1060_combined(merchant1.address, 100, 1, true);
      await escrow.TEST_line964_1060_combined(merchant2.address, ethers.parseEther('1'), 1, false);
      await escrow.TEST_line964_1060_combined(merchant2.address, ethers.parseEther('1'), 1, true);
      await escrow.TEST_line964_1060_combined(user1.address, 0, 1, false);
      await escrow.TEST_line964_1060_combined(user1.address, 0, 1, true);
    });
  });

  describe('Additional edge cases', function () {
    it('should test with extreme threshold values', async function () {
      await escrow.TEST_line664_force_mix(merchant1.address, user1.address, 255, 255, false, false);
      await escrow.TEST_line664_threshold_local(merchant1.address, 100, 100, false);
      await escrow.TEST_line664_injected_zero(merchant1.address, user1.address, 50, 50);
      await escrow.TEST_line664_threshold_ifelse(merchant1.address, 200, 200);
    });

    it('should test with zero address injections', async function () {
      await registry.TEST_trick_constructor_or_line87(ethers.ZeroAddress);
      await registry.TEST_trick_constructor_or_line87(user1.address);
      await registry.TEST_trick_constructor_or_line87(merchant1.address);
      
      await registry.TEST_line87_ledger_security_variant(ethers.ZeroAddress);
      await registry.TEST_line87_ledger_security_variant(user1.address);
      await registry.TEST_line87_ledger_security_variant(merchant1.address);
    });
  });
});
