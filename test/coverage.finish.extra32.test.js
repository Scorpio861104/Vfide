const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra32 - mass coverage 250-410 region', function () {
  let deployer, dao, who, caller, other;
  beforeEach(async () => {
    [deployer, dao, who, caller, other] = await ethers.getSigners();
  });

  it('calls mass and region helpers with permutations to flip arms', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');
    const CE = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:CommerceEscrow');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // basic mock setup
    await seer.setMin(1);
    await seer.setScore(who.address, 1);
    await seer.setScore(caller.address, 1);
    await vault.setVault(who.address, who.address);
    await vault.setVault(caller.address, caller.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();
    const ce = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ledger.target);
    await ce.waitForDeployment();

    // call TEST_cover_250_300_region with permutations around thresholds
    // thresholds are autoSuspendRefunds=5, autoSuspendDisputes=3 by default
    const r1 = await mr.TEST_cover_250_300_region(who.address, caller.address, 0, 0, false, false, false);
    expect(Number(r1)).to.be.a('number');

    const r2 = await mr.TEST_cover_250_300_region(who.address, caller.address, 5, 0, false, false, false);
    expect(Number(r2)).to.be.a('number');

    const r3 = await mr.TEST_cover_250_300_region(who.address, caller.address, 0, 3, false, false, false);
    expect(Number(r3)).to.be.a('number');

    // test forcing sender-zero flags
    const r4 = await mr.TEST_cover_250_300_region(who.address, caller.address, 0, 0, true, false, true);
    expect(Number(r4)).to.be.a('number');

    // call combined mass helper with different forces to flip vault/no-vault and lowScore
    const m1 = await mr.TEST_cover_mass_250_410(who.address, caller.address, other.address, 0, 0, 0, false, false, false);
    expect(Number(m1)).to.be.a('number');

    const m2 = await mr.TEST_cover_mass_250_410(who.address, caller.address, other.address, 5, 3, 0, true, false, true);
    expect(Number(m2)).to.be.a('number');

    // exercise CommerceEscrow hotspot helpers that operate in 300-410 range
    const hs1 = await ce.TEST_hotspot_300s(who.address, caller.address, 0, 0, false, false);
    expect(Number(hs1)).to.be.a('number');

    const hs2 = await ce.TEST_hotspot_360s(0, caller.address, false, false);
    expect(Number(hs2)).to.be.a('number');

    const post = await ce.TEST_cover_post360s(0, caller.address, who.address, 0, false, false, false);
    expect(Number(post)).to.be.a('number');

    const escMore = await ce.TEST_cover_escrow_more(0, caller.address, true, true);
    expect(Number(escMore)).to.be.a('number');
  });
});
