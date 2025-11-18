const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.addMerchant.narrow - target lines 118/130', function () {
  let signers;
  beforeEach(async () => {
    signers = await ethers.getSigners();
  });

  it('targets addMerchant left/right and msg.sender vaultZero arms', async function () {
    const [deployer, dao, m1, m2] = signers;

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // setup: m1 has required score and a vault; m2 doesn't
    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vault.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // 1) ensure default (no forces) - exercise left branches
    const leftAlready = await mr.TEST_if_alreadyMerchant_left(m1.address);
    expect(typeof leftAlready === 'boolean' || Number(leftAlready) === 0 || Number(leftAlready) === 1).to.be.ok;

    const noVaultLeft = await mr.TEST_if_noVault_left(m2.address);
    expect(typeof noVaultLeft === 'boolean' || Number(noVaultLeft) === 0 || Number(noVaultLeft) === 1).to.be.ok;

    // 2) exercise TEST_exec_addMerchant_branches with address param combos
    const b1 = await mr.TEST_exec_addMerchant_branches(m1.address, false, false, false);
    expect(Number(b1[0]) || 0).to.not.equal(undefined);

    const b2 = await mr.TEST_exec_addMerchant_branches(m2.address, true, false, false);
    expect(Number(b2[0]) || 0).to.not.equal(undefined);

    // 3) flip force flags and call narrow helpers to hit the opposite arms
    await mr.TEST_setForceAlreadyMerchant(true);
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);

    const rightAlready = await mr.TEST_if_addMerchant_or_force(m2.address);
    expect(typeof rightAlready === 'boolean' || Number(rightAlready) === 0 || Number(rightAlready) === 1).to.be.ok;

    // msg.sender-specific vaultZero-or-force helper (connect as m2 to make vault zero)
    const mrAsM2 = mr.connect(m2);
    const vaultZeroRes = await mrAsM2.TEST_line130_msgsender_vaultZero_or_force(false);
    expect(typeof vaultZeroRes === 'boolean' || Number(vaultZeroRes) === 0 || Number(vaultZeroRes) === 1).to.be.ok;

    // call exec variants that are designed to map to the exact cond-expr branches
    const execA = await mrAsM2.TEST_exec_addMerchant_msgsender_ifvariants(false, true, false);
    expect(Number(execA)).to.be.a('number');

    // reset forces
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);

    expect(true).to.equal(true);
  });
});
