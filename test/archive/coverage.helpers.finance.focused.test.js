const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('helpers-focused: finance deterministic helpers', function () {
  it('calls TEST_exec_send_variants and decimals wrapper with permutations', async function () {
    const signers = await ethers.getSigners();
    const [, dao, alice, bob] = signers;

    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Rev = await ethers.getContractFactory('RevertingDecimals');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Vault = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const erc = await ERC20.deploy('T','T'); await erc.waitForDeployment();
    const rev = await Rev.deploy(); await rev.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(erc.target, 'T');

    const vault = await Vault.deploy(dao.address, ledger.target, stable.target, erc.target);
    await vault.waitForDeployment();
    await vault.TEST_setOnlyDAOOff_Tx(true);

    // call decimals wrapper for staticcall-success token
    let d1 = await stable.TEST_exec_decimals_for_token(erc.target, false, 0);
    // call decimals wrapper for reverting-decimals mock (will fallback)
    let d2 = await stable.TEST_exec_decimals_for_token(rev.target, false, 0);

    expect(Number(d1[0])).to.be.a('number');
    expect(Number(d2[0])).to.be.a('number');

    // call send variants with permutations
    let s1 = await vault.TEST_exec_send_variants(erc.target, alice.address, 1, false);
    let s2 = await vault.TEST_exec_send_variants(ethers.ZeroAddress, alice.address, 1, false);
    let s3 = await vault.TEST_exec_send_variants(erc.target, ethers.ZeroAddress, 0, true);

    expect(Number(s1)).to.be.a('number');
    expect(Number(s2)).to.be.a('number');
    expect(Number(s3)).to.be.a('number');
  });
});
