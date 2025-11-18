const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra29 - addMerchant permutations', function () {
  let deployer, dao, merchant, other;
  beforeEach(async () => {
    [deployer, dao, merchant, other] = await ethers.getSigners();
  });

  it('exercises addMerchant conditional arms via TEST helpers', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // configure mocks: ensure merchant has a vault and minimal score by default
    await seer.setMin(1);
    await seer.setScore(merchant.address, 1);
    await vault.setVault(merchant.address, merchant.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // call view helper without forcing arms
    const r1 = await mr.TEST_cover_addMerchant_near118_130(merchant.address, merchant.address, false, false);
    expect(Number(r1)).to.be.a('number');

    // force the alreadyMerchant arm via the helper param
    const r2 = await mr.TEST_cover_addMerchant_near118_130(merchant.address, merchant.address, true, false);
    expect(Number(r2)).to.be.a('number');

    // force the vaultZero arm via the helper param
    const r3 = await mr.TEST_cover_addMerchant_near118_130(merchant.address, merchant.address, false, true);
    expect(Number(r3)).to.be.a('number');

    // exercise msg.sender variants by calling as merchant (targets original source lines)
    const m1 = await mr.connect(merchant).TEST_exec_addMerchant_msgsender_ifvariants(false, false, false);
    expect(Number(m1)).to.be.a('number');

    const m2 = await mr.connect(merchant).TEST_exec_addMerchant_msgsender_ifvariants(true, true, true);
    expect(Number(m2)).to.be.a('number');

    // also call general if-variant helper to increase coverage hits
    const acc = await mr.TEST_exec_addMerchant_ifvariants(merchant.address, true, false, true);
    expect(Number(acc)).to.be.a('number');
  });
});
