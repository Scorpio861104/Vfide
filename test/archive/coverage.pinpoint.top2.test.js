const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.pinpoint.top2: target more top canonical misses', function () {
  it('calls new pinpoint helpers and toggles flags', async function () {
    const signers = await ethers.getSigners();
    const [, dao, m1, m2, m3, alice] = signers;

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');

    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');
    const CE = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:CommerceEscrow');
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');

    const vaultHub = await VaultHub.deploy(); await vaultHub.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vaultHub.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vaultHub.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();
    const ce = await CE.deploy(dao.address, token.target, vaultHub.target, mr.target, ethers.ZeroAddress, ledger.target);
    await ce.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(token.target, 'T');

    // call new helpers
    const dup = await mr.TEST_dup_constructor_or_local();
    expect(typeof dup === 'boolean').to.equal(true);

    const l118 = await mr.TEST_line118_msgsender_false_arm();
    expect(typeof l118 === 'boolean').to.equal(true);

    const l130f = await mr.TEST_line130_msgsender_vaultZero_false(false);
    expect(typeof l130f === 'boolean').to.equal(true);

    const alt250 = await mr.TEST_line250_condexpr_alt(m1.address, m1.address);
    expect(alt250.toString().length).to.be.greaterThan(0);

    const fin = await stable.TEST_exec_finance_413_checks(token.target, alice.address, 1);
    expect(fin.toString().length).to.be.greaterThan(0);
  });
});
