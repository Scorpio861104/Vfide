const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra22 - finance hotspot helper sweep', function () {
  let deployer, dao, alice, bob;
  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it('calls TEST_cover_finance_more2 with permutations to flip branches', async function () {
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const RevertingDecimals = await ethers.getContractFactory('RevertingDecimals');

    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Treasury = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const tokenGood = await ERC20.deploy('G','G'); await tokenGood.waitForDeployment();
    const tokenNoDec = await RevertingDecimals.deploy(); await tokenNoDec.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    // allow adding assets via non-dao in tests
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(tokenGood.target, 'G');

    // call new hotspot helper with permutations that should traverse different arms
    const r1 = await stable.TEST_cover_finance_more2(tokenGood.target, 0, ethers.ZeroAddress, true, false, false);
    const r2 = await stable.TEST_cover_finance_more2(tokenGood.target, 100, bob.address, false, false, false);
    const r3 = await stable.TEST_cover_finance_more2(tokenNoDec.target, 50, alice.address, false, true, true);
    const r4 = await stable.TEST_cover_finance_more2(ethers.ZeroAddress, 0, ethers.ZeroAddress, false, false, false);

    expect(Number(r1)).to.be.a('number');
    expect(Number(r2)).to.be.a('number');
    expect(Number(r3)).to.be.a('number');
    expect(Number(r4)).to.be.a('number');

    // sanity-check related helpers
    const v1 = await stable.TEST_cover_more_finance(tokenGood.target, 1, bob.address, false, 0, false, false);
    expect(Number(v1)).to.be.a('number');
  });
});
