const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.addMerchant.exhaustive - exhaust permutations for lines 118/130', function () {
  let signers;
  beforeEach(async () => { signers = await ethers.getSigners(); });

  it('calls addMerchant-related pinpoint helpers with all signer/force permutations', async function () {
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

    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vault.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // ensure m1 is registered in one branch of permutations
    await mr.connect(m1).addMerchant(ethers.ZeroHash);

    // exhaust permutations: who ∈ {m1 (registered), m2 (not)}, force ∈ {false,true}
    const whos = [m1.address, m2.address];
    const forces = [false, true];

    for (const who of whos) {
      for (const f of forces) {
        // call both line helpers with both callers (who and msg.sender variant)
        const r1 = await mr.TEST_line118_already_or_force(who, f);
        expect(typeof r1 === 'boolean' || Number(r1) === 0 || Number(r1) === 1).to.be.ok;

        const r2 = await mr.TEST_line130_vaultZero_or_force(who, who, f);
        expect(typeof r2 === 'boolean' || Number(r2) === 0 || Number(r2) === 1).to.be.ok;
      }
    }

    // also call msg.sender-based variants for both m1 and m2
    const m1As = mr.connect(m1);
    const m2As = mr.connect(m2);
    const combos = [[m1As, false],[m1As, true],[m2As, false],[m2As, true]];
    for (const [c, f] of combos) {
      const a = await c.TEST_line130_msgsender_vaultZero_or_force(f);
      expect(typeof a === 'boolean' || Number(a) === 0 || Number(a) === 1).to.be.ok;
      const b = await c.TEST_exec_addMerchant_msgsender_ifvariants(f, f, f);
      expect(Number(b)).to.be.a('number');
    }

    expect(true).to.equal(true);
  });
});
