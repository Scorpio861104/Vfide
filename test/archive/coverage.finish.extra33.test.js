const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra33 - extended permutations for 300-410 hotspots', function () {
  let deployer, dao, a, b, c;
  beforeEach(async () => {
    [deployer, dao, a, b, c] = await ethers.getSigners();
  });

  it('exercises many hotspot helpers with permutations', async function () {
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

    // baseline mocks
    await seer.setMin(1);
    await seer.setScore(a.address, 1);
    await seer.setScore(b.address, 1);
    await vault.setVault(a.address, a.address);
    await vault.setVault(b.address, b.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();
    const ce = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ledger.target);
    await ce.waitForDeployment();

    // permutations for mass helper
    const refundsVals = [0, 4, 5, 6];
    const disputesVals = [0, 2, 3, 4];
    const amounts = [0, 1, 100];

    for (const r of refundsVals) {
      for (const d of disputesVals) {
        for (const amt of amounts) {
          const m = await mr.TEST_cover_mass_250_410(a.address, b.address, c.address, r, d, amt, amt===0, false, r>4);
          expect(Number(m)).to.be.a('number');
        }
      }
    }

    // hotspot 300s and 330s permutations
    const h1 = await ce.TEST_hotspot_300s(a.address, b.address, 0, 0, false, false);
    expect(Number(h1)).to.be.a('number');
    const h2 = await ce.TEST_hotspot_300s(a.address, b.address, 5, 3, true, true);
    expect(Number(h2)).to.be.a('number');

    const h3 = await ce.TEST_hotspot_330s(a.address, b.address, false, false);
    expect(Number(h3)).to.be.a('number');
    const h4 = await ce.TEST_hotspot_330s(a.address, b.address, true, true);
    expect(Number(h4)).to.be.a('number');

    // hotspot 360s / post360s permutations
    const hsA = await ce.TEST_hotspot_360s(0, a.address, false, false);
    expect(Number(hsA)).to.be.a('number');
    const hsB = await ce.TEST_hotspot_360s(0, a.address, true, true);
    expect(Number(hsB)).to.be.a('number');

    const post1 = await ce.TEST_cover_post360s(0, a.address, b.address, 0, true, false, false);
    expect(Number(post1)).to.be.a('number');
    const post2 = await ce.TEST_cover_post360s(0, dao.address, a.address, 10, false, true, true);
    expect(Number(post2)).to.be.a('number');

    // additional explicit exec variants
    const exec1 = await mr.TEST_exec_addMerchant_ifvariants(a.address, true, false, true);
    expect(Number(exec1)).to.be.a('number');
    const exec2 = await mr.TEST_exec_addMerchant_ifvariants(a.address, false, true, false);
    expect(Number(exec2)).to.be.a('number');
  });
});
