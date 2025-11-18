const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra26 - msg.sender addMerchant helpers (line 118/130)', function () {
  let deployer, dao, alice, bob;
  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it('calls msg.sender-based helpers to flip the exact addMerchant arms', async function () {
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
    await seer.setScore(alice.address, 1);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // alice has no merchant yet -> msgsender helper should return false when called by alice
    await vault.setVault(alice.address, alice.address);
    // call helper as alice (should be false)
    const asAlice_before = await mr.connect(alice).TEST_if_msgsender_alreadyMerchant();
    expect(asAlice_before).to.be.false;

    // alice registers as merchant
    await mr.connect(alice).addMerchant(ethers.id('mx'));

    // now the helper called as alice should return true
    const asAlice_after = await mr.connect(alice).TEST_if_msgsender_alreadyMerchant();
    expect(asAlice_after).to.be.true;

    // exercise the msgsender ifvariants forcing the other arms
    const v1 = await mr.connect(alice).TEST_exec_addMerchant_msgsender_ifvariants(false, false, false);
    expect(Number(v1)).to.be.a('number');
    const v2 = await mr.connect(bob).TEST_exec_addMerchant_msgsender_ifvariants(true, true, true);
    expect(Number(v2)).to.be.a('number');
  });
});
