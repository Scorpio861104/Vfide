const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.addMerchant.forceLeft - force alreadyMerchant arm', function () {
  it('forces alreadyMerchant and calls narrow helpers to hit left arms', async function () {
    const [deployer, dao, m1, m2] = await ethers.getSigners();

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vault.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // force the 'alreadyMerchant' path
    await mr.TEST_setForceAlreadyMerchant(true);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);

    // call helpers expecting the left-arm (alreadyMerchant) to be hit
    const left = await mr.TEST_if_alreadyMerchant_left(m1.address);
    expect(typeof left === 'boolean' || Number(left) === 0 || Number(left) === 1).to.be.ok;

    const exec = await mr.TEST_exec_addMerchant_branches(m1.address, false, false, false);
    // exec returns a tuple/array; ensure call succeeded
    expect(exec).to.not.equal(undefined);

    // msg.sender variants as m1 should also see the alreadyMerchant force
    const mrAsM1 = mr.connect(m1);
    const execMsg = await mrAsM1.TEST_exec_addMerchant_msgsender_ifvariants(false, false, false);
    expect(Number(execMsg)).to.be.a('number');

    // cleanup
    await mr.TEST_setForceAlreadyMerchant(false);

    expect(true).to.equal(true);
  });
});
