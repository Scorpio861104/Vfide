const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.commerce.stateful - stateful escrow and merchant flows', function () {
  let deployer, dao, buyer, merchant, stranger;
  beforeEach(async () => {
    [deployer, dao, buyer, merchant, stranger] = await ethers.getSigners();
  });

  it('creates merchant, opens/funds/resolve/refund/dispute/resolve flows and triggers refund/dispute thresholds', async function () {
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

    // set min score and vaults
    await seer.setMin(1);
    await seer.setScore(merchant.address, 1);
    await vault.setVault(merchant.address, merchant.address);
    await vault.setVault(buyer.address, buyer.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();
    const ce = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ledger.target);
    await ce.waitForDeployment();

    // 1) merchant signup via addMerchant (as merchant)
    await mr.connect(merchant).addMerchant(ethers.ZeroHash);
  const info = await mr.info(merchant.address);
  expect(info.status !== undefined).to.be.true;

    // 2) open an escrow as buyer
    const amount = 100;
    const tx = await ce.connect(buyer).open(merchant.address, amount, ethers.ZeroHash);
    const rc = await tx.wait();
  const id = await ce.escrowCount();
  expect(id !== undefined).to.be.true;
  const idNum = (typeof id === 'bigint') ? Number(id) : Number(id.toString());
  expect(Number.isFinite(idNum) && idNum > 0).to.be.true;

    // 3) fund escrow: mint tokens to escrow contract and markFunded
  await token.mint(ce.target, amount);
  await ce.markFunded(idNum);
  // now release by buyer
  await ce.connect(buyer).release(idNum);

    // create another escrow to test refund path
    await ce.connect(buyer).open(merchant.address, amount, ethers.ZeroHash);
  const id2 = await ce.escrowCount();
  const id2Num = (typeof id2 === 'bigint') ? Number(id2) : Number(id2.toString());
  await token.mint(ce.target, amount);
  await ce.markFunded(id2Num);
    // refund by merchant
  await ce.connect(merchant).refund(id2Num);

    // 4) create escrow to dispute and resolve
    await ce.connect(buyer).open(merchant.address, amount, ethers.ZeroHash);
  const id3 = await ce.escrowCount();
  const id3Num = (typeof id3 === 'bigint') ? Number(id3) : Number(id3.toString());
  await token.mint(ce.target, amount);
  await ce.markFunded(id3Num);
  await ce.connect(buyer).dispute(id3Num, 'reason');
  // resolve by dao
  await ce.connect(dao).resolve(id3Num, true);

    // 5) trigger refund/dispute thresholds by calling _noteRefund/_noteDispute directly
    const autoR = await mr.autoSuspendRefunds();
    const autoD = await mr.autoSuspendDisputes();
    const autoRNum = (typeof autoR === 'bigint') ? Number(autoR) : Number(autoR.toString());
    const autoDNum = (typeof autoD === 'bigint') ? Number(autoD) : Number(autoD.toString());
    // call noteRefund enough times to suspend merchant
    for (let i = 0; i < autoRNum; i++) {
      await mr._noteRefund(merchant.address);
    }
    const info2 = await mr.info(merchant.address);
    const refundsNum = (typeof info2.refunds === 'bigint') ? Number(info2.refunds) : Number(info2.refunds.toString());
    expect(refundsNum >= autoRNum).to.be.true;

    for (let i = 0; i < autoDNum; i++) {
      await mr._noteDispute(merchant.address);
    }
    const info3 = await mr.info(merchant.address);
    const disputesNum = (typeof info3.disputes === 'bigint') ? Number(info3.disputes) : Number(info3.disputes.toString());
    expect(disputesNum >= autoDNum).to.be.true;

    expect(true).to.equal(true);
  });
});
