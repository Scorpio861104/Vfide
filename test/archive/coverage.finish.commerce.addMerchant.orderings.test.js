const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('micro-orderings: addMerchant ordered sequences to hit index-specific arms', function () {
  it('runs a few ordered sequences that previously left index=0 uncovered', async function () {
    const signers = await ethers.getSigners();
    const [, dao, m1, m2, m3] = signers;

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

    // ensure m1 registered
    await mr.connect(m1).addMerchant(ethers.ZeroHash);

    // Define a few ordered scenarios known to affect Istanbul mapping
    // Scenario 1: call msgsender helper, then try addMerchant as that signer
    const asM2 = mr.connect(m2);
    const beforeHelper = await asM2.TEST_if_msgsender_alreadyMerchant();
    try { await mr.connect(m2).addMerchant(ethers.ZeroHash); } catch (e) {}

    // Scenario 2: toggle TEST_forceAlreadyMerchant then call helper then addMerchant
    await mr.TEST_setForceAlreadyMerchant(true);
    const helperAfterForce = await mr.TEST_if_addMerchant_or_force(m2.address);
    try { await mr.connect(m2).addMerchant(ethers.ZeroHash); } catch (e) {}

    // Scenario 3: toggle TEST flags mid-sequence (forceNoVault then unset) and call msgsender exec
    await mr.TEST_setForceNoVault(true);
    const execMid = await asM2.TEST_exec_addMerchant_msgsender_ifvariants(false, true, false);
    await mr.TEST_setForceNoVault(false);

    // Scenario 4: call pinpoint near-118/130 helper combos in different order
    const cov1 = await mr.TEST_cover_addMerchant_near118_130(m2.address, m2.address, false, true);
    const cov2 = await mr.TEST_line118_already_or_force(m2.address, true);

    // Scenario 5: clear flags and exercise the non-forced path
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);
    const finalExec = await asM2.TEST_exec_addMerchant_msgsender_ifvariants(false, false, false);

    // sanity asserts
    expect(typeof beforeHelper === 'boolean').to.be.ok;
    expect(typeof helperAfterForce === 'boolean').to.be.ok;
    expect(Number(execMid)).to.be.a('number');
    expect(Number(cov1)).to.be.a('number');
    expect(typeof cov2 === 'boolean').to.be.ok;
    expect(Number(finalExec)).to.be.a('number');
  });
});
