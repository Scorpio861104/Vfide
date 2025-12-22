const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('DevReserveVestingVault Contract Tests', function () {
  let vault, vfide, beneficiary, vaultHub, securityHub, ledger, presale;
  let owner;
  const ALLOCATION = ethers.parseEther('40000000');

  beforeEach(async function () {
    [owner, beneficiary] = await ethers.getSigners();

    // Mocks
    const VFIDE = await ethers.getContractFactory('ERC20Mock');
    vfide = await VFIDE.deploy('VFIDE', 'VFIDE');

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    vaultHub = await VaultHub.deploy();

    const SecurityHub = await ethers.getContractFactory('SecurityHubMock');
    securityHub = await SecurityHub.deploy();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    const Presale = await ethers.getContractFactory('PresaleMock');
    presale = await Presale.deploy();

    // Deploy Vault
    const Vault = await ethers.getContractFactory('DevReserveVestingVault');
    vault = await Vault.deploy(
      await vfide.getAddress(),
      beneficiary.address,
      await vaultHub.getAddress(),
      await securityHub.getAddress(),
      await ledger.getAddress(),
      await presale.getAddress(),
      ALLOCATION
    );

    // Fund the vault
    await vfide.mint(await vault.getAddress(), ALLOCATION);
  });

  it('should deploy correctly', async function () {
    expect(await vault.BENEFICIARY()).to.equal(beneficiary.address);
    expect(await vault.ALLOCATION()).to.equal(ALLOCATION);
  });

  it('should revert claim if not started', async function () {
    await expect(vault.connect(beneficiary).claim()).to.be.revertedWithCustomError(vault, 'DV_NotStarted');
  });

  it('should sync start time from presale upon first valid claim', async function () {
    await presale.launch();
    const start = await presale.presaleStartTime();
    // Move past cliff (60 days) to allow claim
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(start) + 60 * 24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');

    await vault.connect(beneficiary).claim(); // This triggers sync and claim
    expect(await vault.startTimestamp()).to.be.gt(0);
  });

  it('should respect cliff', async function () {
    await presale.launch();
    // Move time to just before cliff (60 days)
    const start = await presale.presaleStartTime();
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(start) + 59 * 24 * 60 * 60]);
    await ethers.provider.send('evm_mine');

    // Claim should yield 0 (or revert with NothingToClaim if strict)
    // Contract says "revert DV_NothingToClaim" if claimable is 0
    await expect(vault.connect(beneficiary).claim()).to.be.revertedWithCustomError(vault, 'DV_NothingToClaim');
  });

  it('should allow claim after cliff', async function () {
    await presale.launch();
    const start = await presale.presaleStartTime();
    // Move to cliff (60 days) + 1 second
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(start) + 60 * 24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine');

    await expect(vault.connect(beneficiary).claim()).to.emit(vault, 'Claimed');
  });

  it('should allow beneficiary to pause', async function () {
    await vault.connect(beneficiary).pauseClaims(true);
    expect(await vault.claimsPaused()).to.be.true;
    
    await expect(vault.connect(beneficiary).claim()).to.be.revertedWithCustomError(vault, 'DV_Paused');
    
    await vault.connect(beneficiary).pauseClaims(false);
    expect(await vault.claimsPaused()).to.be.false;
  });

  it('should revert if non-beneficiary tries to pause', async function () {
    await expect(vault.connect(owner).pauseClaims(true)).to.be.revertedWithCustomError(vault, 'DV_NotBeneficiary');
  });
});
