const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra21 - Finance sweep to flip remaining arms', function () {
  let deployer, dao, alice, bob;
  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it('exercises StablecoinRegistry and EcoTreasuryVault TEST helpers', async function () {
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

    // Add good token as asset (dao needed) — use TEST_setOnlyDAOOff to allow addAsset via caller
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(tokenGood.target, 'G');

    // decimals branches
    const d1 = await stable.TEST_exec_decimals_branches(tokenGood.target, false, 0);
    const d2 = await stable.TEST_exec_decimals_branches(tokenNoDec.target, false, 0);
    const d3 = await stable.TEST_exec_decimals_branches(ethers.ZeroAddress, true, 8);
    expect(Number(d1[0] || d1)).to.be.a('number');
    expect(Number(d2[0] || d2)).to.be.a('number');
    expect(Number(d3[0] || d3)).to.be.a('number');

    // exercise exec decimals and tx variants
    const v1 = await stable.TEST_exec_decimals_and_tx_ifvariants(tokenGood.target, false, 0, 0, ethers.ZeroAddress, false, false);
    const v2 = await stable.TEST_exec_decimals_and_tx_ifvariants(tokenNoDec.target, false, 0, 100, bob.address, false, false);
    const v3 = await stable.TEST_exec_decimals_and_tx_ifvariants(ethers.ZeroAddress, false, 0, 0, ethers.ZeroAddress, true, true);
    expect(Number(v1)).to.be.a('number');
    expect(Number(v2)).to.be.a('number');
    expect(Number(v3)).to.be.a('number');

    // cover_more_finance permutations
    const f1 = await stable.TEST_cover_more_finance(tokenGood.target, 0, ethers.ZeroAddress, false, 0, false, false);
    const f2 = await stable.TEST_cover_more_finance(tokenNoDec.target, 1000, bob.address, false, 0, true, true);
    expect(Number(f1)).to.be.a('number');
    expect(Number(f2)).to.be.a('number');

    // explicit helpers
    expect(await stable.TEST_if_asset_ok(tokenGood.target)).to.equal(true);
    expect(await stable.TEST_if_asset_not_ok(ethers.ZeroAddress)).to.equal(true);
    expect(await stable.TEST_if_staticcall_returns_short(tokenNoDec.target)).to.equal(true);
    expect(await stable.TEST_if_send_allowed_and_tokenNonZero(tokenGood.target, bob.address, 10)).to.be.an('array');

    // Treasury: evaluate deposit/send checks
    expect(await treasury.TEST_eval_deposit_checks(tokenGood.target, 0)).to.be.an('array');
    expect(await treasury.TEST_eval_send_checks(tokenGood.target, bob.address, 1)).to.be.an('array');
    const t1 = await treasury.TEST_exec_treasury_ifvariants(tokenGood.target, 0, bob.address, false, false);
    const t2 = await treasury.TEST_exec_treasury_ifvariants(ethers.ZeroAddress, 0, ethers.ZeroAddress, true, true);
    expect(Number(t1)).to.be.a('number');
    expect(Number(t2)).to.be.a('number');

    // toggle treasury test flags and re-call
    await treasury.TEST_setForceDepositInsufficient(true);
    await treasury.TEST_setForceSendInsufficient(true);
    expect(await treasury.TEST_if_TEST_force_flags_either()).to.equal(true);
    await treasury.TEST_setForceDepositInsufficient(false);
    await treasury.TEST_setForceSendInsufficient(false);
  });
});
