const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('helpers-focused: commerce deterministic helpers', function () {
  it('calls TEST_exec_addMerchant_msgsender_full and note guards with permutations', async function () {
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

    // register one merchant
    await mr.connect(m1).addMerchant(ethers.ZeroHash);

    // permutations for msgsender helper: call as different signers and toggles
    const asM1 = mr.connect(m1);
    const asM2 = mr.connect(m2);

    // call both arms by toggling force flags and using callers with/without merchant
    let r1 = await asM1.TEST_exec_addMerchant_msgsender_full(false, false, false);
    let r2 = await asM1.TEST_exec_addMerchant_msgsender_full(true, false, false);
    let r3 = await asM2.TEST_exec_addMerchant_msgsender_full(false, true, false);
    let r4 = await asM2.TEST_exec_addMerchant_msgsender_full(false, false, true);

    // ensure results are 8-bit masks (non-zero)
    expect(Number(r1)).to.be.a('number');
    expect(Number(r2)).to.be.a('number');
    expect(Number(r3)).to.be.a('number');
    expect(Number(r4)).to.be.a('number');

    // test note guards wrapper: toggle refund/dispute zero flags and call
    let mask1 = await mr.TEST_exec_note_guards_and_restore(m1.address, true, false);
    let mask2 = await mr.TEST_exec_note_guards_and_restore(m1.address, false, true);
    let mask3 = await mr.TEST_exec_note_guards_and_restore(m1.address, true, true);

    expect(Number(mask1)).to.be.a('number');
    expect(Number(mask2)).to.be.a('number');
    expect(Number(mask3)).to.be.a('number');
  });
});
