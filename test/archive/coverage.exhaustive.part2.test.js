const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Final Push: All Remaining TEST Functions Part 2', function () {
  this.timeout(300000);

  let dao, user1, user2, merchant1, merchant2;
  let token, vaultHub, ledger, seer, security;
  let registry, escrow;

  before(async function () {
    [dao, user1, user2, merchant1, merchant2] = await ethers.getSigners();

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

    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');
    registry = await MR.deploy(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);

    const CE = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:CommerceEscrow');
    escrow = await CE.deploy(dao.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);

    await vaultHub.setVault(merchant1.address, merchant1.address);
    await vaultHub.setVault(merchant2.address, merchant2.address);
    await seer.setMin(100);
    await seer.setScore(merchant1.address, 150);
    await seer.setScore(merchant2.address, 150);
    
    const META = ethers.id('merchant');
    await registry.connect(merchant1).addMerchant(META);
    await registry.connect(merchant2).addMerchant(META);

    await token.mint(escrow.target, ethers.parseEther('100000'));
  });

  describe('Line 664 additional coverage', function () {
    it('TEST_line664_alt2', async function () {
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 1, 2, false);
      await escrow.TEST_line664_alt2(merchant1.address, user1.address, 1, 2, true);
    });

    it('TEST_line664_threshold_local', async function () {
      await escrow.TEST_line664_threshold_local(merchant1.address, 0, 0, false);
      await escrow.TEST_line664_threshold_local(merchant1.address, 0, 0, true);
      await escrow.TEST_line664_threshold_local(merchant1.address, 3, 5, false);
      await escrow.TEST_line664_threshold_local(merchant1.address, 3, 5, true);
    });

    it('TEST_line664_injected_zero', async function () {
      await escrow.TEST_line664_injected_zero(merchant1.address, user1.address, 0, 0);
      await escrow.TEST_line664_injected_zero(ethers.ZeroAddress, user1.address, 1, 2);
    });

    it('TEST_line664_msgsender_vault', async function () {
      await escrow.TEST_line664_msgsender_vault(0, 0, false);
      await escrow.TEST_line664_msgsender_vault(1, 1, true);
    });

    it('TEST_line664_localdup_order', async function () {
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_localdup_order(merchant1.address, user1.address, 5, 5, true);
    });

    it('TEST_line664_threshold_ifelse', async function () {
      await escrow.TEST_line664_threshold_ifelse(merchant1.address, 0, 0);
      await escrow.TEST_line664_threshold_ifelse(merchant1.address, 5, 3);
    });

    it('TEST_line664_ternary_vs_if', async function () {
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 6, 4, false);
      await escrow.TEST_line664_ternary_vs_if(merchant1.address, user1.address, 6, 4, true);
    });

    it('TEST_line664_combined_mask', async function () {
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 0, 0, false);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 0, 0, true);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 2, 3, false);
      await escrow.TEST_line664_combined_mask(merchant1.address, user1.address, 2, 3, true);
    });
  });

  describe('Line 871 additional coverage', function () {
    it('TEST_line871_deep - all 4 combos', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await escrow.TEST_line871_deep(merchant1.address, a, b);
      }
    });

    it('TEST_line871_injected', async function () {
      await escrow.TEST_line871_injected(ethers.ZeroAddress, false);
      await escrow.TEST_line871_injected(merchant1.address, true);
    });

    it('TEST_line871_msgsender', async function () {
      await escrow.TEST_line871_msgsender(false);
      await escrow.TEST_line871_msgsender(true);
    });

    it('TEST_line871_localdup', async function () {
      await escrow.TEST_line871_localdup(merchant1.address, user1.address, false);
      await escrow.TEST_line871_localdup(merchant1.address, user1.address, true);
    });
  });

  describe('Line 886 complete coverage', function () {
    it('TEST_line886_toggle', async function () {
      await escrow.TEST_line886_toggle(merchant1.address, user1.address, false);
      await escrow.TEST_line886_toggle(merchant1.address, user1.address, true);
    });

    it('TEST_line886_ifelse', async function () {
      await escrow.TEST_line886_ifelse(merchant1.address, user1.address, false);
      await escrow.TEST_line886_ifelse(merchant1.address, user1.address, true);
    });

    it('TEST_line886_ternary_local', async function () {
      await escrow.TEST_line886_ternary_local(merchant1.address, ethers.parseEther('1'), false);
      await escrow.TEST_line886_ternary_local(merchant1.address, ethers.parseEther('1'), true);
    });

    it('TEST_line886_localdup_order', async function () {
      await escrow.TEST_line886_localdup_order(merchant1.address, user1.address, false);
      await escrow.TEST_line886_localdup_order(merchant1.address, user1.address, true);
    });

    it('TEST_line886_ternary_vs_if', async function () {
      await escrow.TEST_line886_ternary_vs_if(merchant1.address, user1.address, false);
      await escrow.TEST_line886_ternary_vs_if(merchant1.address, user1.address, true);
    });

    it('TEST_line886_deep - all 4 combos', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await escrow.TEST_line886_deep(merchant1.address, user1.address, a, b);
      }
    });
  });

  describe('Line 964 additional coverage', function () {
    it('TEST_line964_injected', async function () {
      await escrow.TEST_line964_injected(merchant1.address, 0, false);
      await escrow.TEST_line964_injected(merchant1.address, 0, true);
      await escrow.TEST_line964_injected(ethers.ZeroAddress, 100, false);
      await escrow.TEST_line964_injected(merchant1.address, 100, true);
    });

    it('TEST_line964_ifelse - all 4 combos', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await escrow.TEST_line964_ifelse(merchant1.address, 0, a, b);
        await escrow.TEST_line964_ifelse(merchant1.address, 100, a, b);
      }
    });

    it('TEST_line964_msgsender', async function () {
      await escrow.TEST_line964_msgsender(0, false);
      await escrow.TEST_line964_msgsender(0, true);
      await escrow.TEST_line964_msgsender(100, false);
      await escrow.TEST_line964_msgsender(100, true);
    });

    it('TEST_line964_deep - all combos', async function () {
      const bools = [[false, false, false], [false, false, true], [false, true, false], [false, true, true],
                     [true, false, false], [true, false, true], [true, true, false], [true, true, true]];
      for (const [a, b, c] of bools) {
        await escrow.TEST_line964_deep(merchant1.address, ethers.parseEther('1'), a, b, c);
      }
    });
  });

  describe('Line 1060 complete coverage', function () {
    it('TEST_line1060_condexpr_alt', async function () {
      await escrow.TEST_line1060_condexpr_alt(1, user1.address, false);
      await escrow.TEST_line1060_condexpr_alt(1, user1.address, true);
    });

    it('TEST_line1060_injected', async function () {
      await escrow.TEST_line1060_injected(1, ethers.ZeroAddress, false);
      await escrow.TEST_line1060_injected(1, merchant1.address, true);
    });

    it('TEST_line1060_ternary_local', async function () {
      await escrow.TEST_line1060_ternary_local(1, user1.address, false);
      await escrow.TEST_line1060_ternary_local(1, user1.address, true);
    });
  });

  describe('Additional TEST function coverage', function () {
    it('TEST_line871_886_combined - 4 param version', async function () {
      const bools = [[false, false], [false, true], [true, false], [true, true]];
      for (const [a, b] of bools) {
        await escrow['TEST_line871_886_combined(address,address,bool,bool)'](merchant1.address, user1.address, a, b);
      }
    });

    it('TEST_line871_886_combined - 5 param version', async function () {
      await escrow['TEST_line871_886_combined(address,address,uint8,uint8,bool)'](merchant1.address, user1.address, 0, 0, false);
      await escrow['TEST_line871_886_combined(address,address,uint8,uint8,bool)'](merchant1.address, user1.address, 1, 2, true);
    });

    it('TEST_line964_1060_combined', async function () {
      await escrow.TEST_line964_1060_combined(merchant1.address, ethers.parseEther('1'), 1, false);
      await escrow.TEST_line964_1060_combined(merchant1.address, ethers.parseEther('1'), 1, true);
    });
  });
});
