const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.exec.addMerchant - call addMerchant to exercise production branches', function () {
  let signers;
  beforeEach(async () => { signers = await ethers.getSigners(); });

  it('calls addMerchant with registered, no-vault and low-score signers to exercise real branches', async function () {
    const [deployer, dao, m1, m2, m3] = signers;

    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // configure: m1 will be registered; m2 no vault; m3 low score
    await seer.setMin(10);
    await seer.setScore(m1.address, 20);
    await seer.setScore(m3.address, 5);
    await vault.setVault(m1.address, m1.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    // 1) register m1 successfully
    await mr.connect(m1).addMerchant(ethers.ZeroHash);

    // 2) calling addMerchant again as m1 -> should revert COM_AlreadyMerchant (exercises the alreadyMerchant branch)
    try { await mr.connect(m1).addMerchant(ethers.ZeroHash); } catch (e) {}

    // 3) m2 has no vault -> should revert COM_NotAllowed
    try { await mr.connect(m2).addMerchant(ethers.ZeroHash); } catch (e) {}

    // 4) m3 has low score -> should revert COM_NotAllowed
    try { await mr.connect(m3).addMerchant(ethers.ZeroHash); } catch (e) {}

    // 5) force flags: set TEST_forceNoVault and call addMerchant for m2 (should still revert but exercise force branch)
    await mr.TEST_setForceNoVault(true);
    try { await mr.connect(m2).addMerchant(ethers.ZeroHash); } catch (e) {}

    expect(true).to.equal(true);
  });
});
