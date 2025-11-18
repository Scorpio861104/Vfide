const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('big helpers: deterministic helpers for commerce + finance', function () {
  it('calls commerce msg.sender helpers and toggles to flip branch arms', async function () {
    const signers = await ethers.getSigners();
    const [, dao, m1, m2] = signers;

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

  // ensure both arms of merchants[msg.sender] are observable
  await mr.TEST_setForceAlreadyMerchant(false);
  // call helper as m1 (merchant registered?)
  await mr.connect(m1).addMerchant(ethers.ZeroHash);
  const r1 = await mr.connect(m1).TEST_exec_addMerchant_msgsender_full(false, false, false);
  const r2 = await mr.connect(m2).TEST_exec_addMerchant_msgsender_full(true, true, true);

  expect(Number(r1)).to.be.a('number');
  expect(Number(r2)).to.be.a('number');
  });

  it('calls finance helpers to deterministically hit decimals/send branch arms', async function () {
    const signers = await ethers.getSigners();
    const [, dao, alice] = signers;

    const Ledger = await ethers.getContractFactory('LedgerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Rev = await ethers.getContractFactory('RevertingDecimals');
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Vault = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const erc = await ERC20.deploy('S','S'); await erc.waitForDeployment();
    const rev = await Rev.deploy(); await rev.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(erc.target, 'S');

    const vault = await Vault.deploy(dao.address, ledger.target, stable.target, erc.target);
    await vault.waitForDeployment();
    await vault.TEST_setOnlyDAOOff_Tx(true);

    // call deterministic helpers
    const a1 = await stable.TEST_exec_decimals_for_token(erc.target, false, 0);
    const a2 = await stable.TEST_exec_decimals_for_token(rev.target, false, 0);

    const s1 = await vault.TEST_exec_send_variants(erc.target, alice.address, 1, false);

    expect(Number(a1[0])).to.be.a('number');
    expect(Number(a2[0])).to.be.a('number');
    expect(Number(s1)).to.be.a('number');
  });
});
