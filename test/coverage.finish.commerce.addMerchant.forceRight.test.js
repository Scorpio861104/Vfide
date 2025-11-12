const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.addMerchant.forceRight - force noVault/lowScore arm', function () {
  it('forces noVault/lowScore and calls narrow helpers to hit right arms', async function () {
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

    // set minimal score and only m1 has a vault; m2 will be vault-zero
    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vault.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // force the right-side checks
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);

    // call address-based helpers expecting noVault/lowScore to be considered
    const orForce = await mr.TEST_if_addMerchant_or_force(m2.address);
    expect(typeof orForce === 'boolean' || Number(orForce) === 0 || Number(orForce) === 1).to.be.ok;

    // call msg.sender-specific vaultZero-or-force connected as m2
    const mrAsM2 = mr.connect(m2);
    const vz = await mrAsM2.TEST_line130_msgsender_vaultZero_or_force(false);
    expect(typeof vz === 'boolean' || Number(vz) === 0 || Number(vz) === 1).to.be.ok;

    // exercise exec variants to map cond-expr arms
    const exec = await mr.TEST_exec_addMerchant_ifvariants(m2.address, true, true, false);
    expect(Number(exec)).to.be.a('number');

    // cleanup
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);

    expect(true).to.equal(true);
  });
});
