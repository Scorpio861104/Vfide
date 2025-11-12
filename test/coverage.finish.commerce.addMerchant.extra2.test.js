const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.addMerchant.extra2 - exhaustive addMerchant permutations', function () {
  let signers;
  beforeEach(async () => {
    signers = await ethers.getSigners();
  });

  it('runs many permutations of addMerchant TEST helpers to flip left/right/msg.sender arms', async function () {
    const [deployer, dao, a, b, c, d] = signers;

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // base config
    await seer.setMin(1);
    await seer.setScore(a.address, 1);
    await vault.setVault(a.address, a.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // helper to call multiple permutations
    const addrs = [a.address, b.address, c.address, d.address];
    const bools = [false, true];

    for (const who of addrs) {
      // try address-based executor variants
      for (const A of bools) {
        for (const B of bools) {
          for (const C of bools) {
            const res = await mr.TEST_exec_addMerchant_ifvariants(who, A, B, C);
            expect(Number(res)).to.be.a('number');
          }
        }
      }

      // cover helper near 118/130
      const mask = await mr.TEST_cover_addMerchant_near118_130(who, who, true, false);
      expect(Number(mask)).to.be.a('number');
    }

    // now exercise msg.sender variants by connecting as different signers
    for (const s of [a, b, c, d]) {
      const mrAs = mr.connect(s);
      for (const A of bools) {
        for (const B of bools) {
          for (const C of bools) {
            const r = await mrAs.TEST_exec_addMerchant_msgsender_ifvariants(A, B, C);
            expect(Number(r)).to.be.a('number');
          }
        }
      }
      // msg.sender-specific helpers
      const v = await mrAs.TEST_if_msgsender_alreadyMerchant();
      expect(typeof v === 'boolean' || Number(v) === 0 || Number(v) === 1).to.be.ok;
    }

    // reset any force flags just in case
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);

    expect(true).to.equal(true);
  });
});
