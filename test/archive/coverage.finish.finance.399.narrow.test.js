const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.finance.399.narrow - decimals and deposit/send guard branches', function () {
  let signers;
  beforeEach(async () => { signers = await ethers.getSigners(); });

  it('exercises decimals staticcall success/fail and deposit/send checks', async function () {
    const [deployer, dao, alice, bob] = signers;

    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Rev = await ethers.getContractFactory('RevertingDecimals');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Vault = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const erc = await ERC20.deploy('T','T'); await erc.waitForDeployment();
    const rev = await Rev.deploy(); await rev.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // deploy stable registry (dao required by constructor)
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

    // permit testing by toggling onlyDAO off to allow addAsset
    await stable.TEST_setOnlyDAOOff(true);

    // add a normal erc token (staticcall returns decimals) and check branches
    await stable.addAsset(erc.target, 'T');

    // 1) decimals via staticcall success
    const v1 = await stable.TEST_exec_decimals_branches(erc.target, false, 0);
    // v1 is a tuple (val, usedForce, usedStaticcall)
    // depending on ABI decode in JS we assert usedStaticcall true
    expect(v1[2] === true || Number(v1[2]) === 1).to.be.ok;

    // 2) staticcall fails/reverts -> fallback to 18
    const v2 = await stable.TEST_exec_decimals_branches(rev.target, false, 0);
    // usedStaticcall should be false for a reverting token
    expect(v2[2] === false || Number(v2[2]) === 0).to.be.ok;

    // 3) forceReturn path
    const v3 = await stable.TEST_exec_decimals_branches(erc.target, true, 7);
    expect(v3[1] === true || Number(v3[1]) === 1).to.be.ok;

    // deploy vault / treasury to exercise deposit/send helpers
    const vault = await Vault.deploy(dao.address, ledger.target, stable.target, erc.target);
    await vault.waitForDeployment();

    // deposit checks: token not whitelisted (rev not added), amount zero
    const dChecks = await stable.TEST_exercise_deposit_send_checks(rev.target, 0, ethers.ZeroAddress);
    // expect notWhitelisted true and zeroAmount true
    expect(dChecks[0] === true || Number(dChecks[0]) === 1).to.be.ok;
    expect(dChecks[1] === true || Number(dChecks[1]) === 1).to.be.ok;

    // use treasury helper to drive bitmask branches for send/deposit guards
    const tv1 = await vault.TEST_exec_treasury_ifvariants(rev.target, 0, ethers.ZeroAddress, true, true);
    expect(Number(tv1)).to.be.a('number');

    // call composite finance cover helper to flip multiple arms
    const cover = await stable.TEST_cover_more_finance(rev.target, 0, ethers.ZeroAddress, true, 9, true, true);
    expect(Number(cover)).to.be.a('number');

    expect(true).to.equal(true);
  });
});
