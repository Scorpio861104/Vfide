import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe('FeeDistributor (audit guardrails)', () => {
  async function distributorFixture() {
    const { ethers } = (await getConnection()) as any;
    // 3-channel constructor: token, dao, merchants, headhunters, admin
    const [admin, dao, merchants, headhunters, replacement] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory(
      'test/contracts/mocks/MockContracts.sol:MockERC20'
    );
    const token = await MockERC20.deploy('VFIDE', 'VFD', ethers.parseEther('200000000'));
    await token.waitForDeployment();

    const FeeDistributor = await ethers.getContractFactory('FeeDistributor');
    const distributor = await FeeDistributor.deploy(
      await token.getAddress(),
      dao.address,
      merchants.address,
      headhunters.address,
      admin.address
    );
    await distributor.waitForDeployment();

    const fee = ethers.parseEther('10000');
    await token.transfer(await distributor.getAddress(), fee);

    return { ethers, distributor, token, fee, dao, merchants, headhunters, replacement, admin };
  }

  async function deployDistributor() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(distributorFixture);
  }

  it('distributes to all three ecosystem channels — no burn, no sanctum', async () => {
    const { distributor, token, fee, dao, merchants, headhunters } = await deployDistributor();

    const supplyBefore = await token.totalSupply();
    await distributor.distribute();

    // Default split: 50/30/20
    const toDAO       = (fee * 5000n) / 10000n;
    const toMerchants = (fee * 3000n) / 10000n;
    const toHeadhunters = fee - toDAO - toMerchants; // rounding remainder → headhunters

    assert.equal(await token.balanceOf(dao.address),        toDAO,        'dao share wrong');
    assert.equal(await token.balanceOf(merchants.address),  toMerchants,  'merchant share wrong');
    assert.equal(await token.balanceOf(headhunters.address),toHeadhunters,'headhunter share wrong');

    // Supply must NOT change — FeeDistributor never burns
    assert.equal(await token.totalSupply(), supplyBefore, 'FeeDistributor must not burn tokens');

    // totalBurned no longer exists on FeeDistributor — supply unchanged is the proof.
  });

  it('rejects untrusted receiveFee callers', async () => {
    const { distributor, replacement, fee } = await deployDistributor();
    await assert.rejects(
      () => distributor.connect(replacement).receiveFee(fee),
      /NotAuthorized|revert/
    );
  });

  it('delays destination changes until the timelock expires', async () => {
    const { ethers, distributor, dao, replacement, admin } = await deployDistributor();

    await distributor.connect(admin).setDestination('dao', replacement.address);
    assert.equal(await distributor.daoPayrollPool(), dao.address);

    await assert.rejects(
      () => distributor.connect(admin).executeDestinationChange(),
      /SplitChangeNotReady|revert/
    );

    await ethers.provider.send('evm_increaseTime', [72 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    await distributor.connect(admin).executeDestinationChange();
    assert.equal(await distributor.daoPayrollPool(), replacement.address);
  });

  it('allows pending destination changes to be cancelled', async () => {
    const { distributor, dao, replacement, admin } = await deployDistributor();

    await distributor.connect(admin).setDestination('dao', replacement.address);
    await distributor.connect(admin).cancelDestinationChange();

    await assert.rejects(
      () => distributor.connect(admin).executeDestinationChange(),
      /NoSplitChangePending|revert/
    );

    assert.equal(await distributor.daoPayrollPool(), dao.address);
  });

  it('rejects split proposals that do not sum to 10000', async () => {
    const { distributor, admin } = await deployDistributor();
    await assert.rejects(
      () => distributor.connect(admin).proposeSplitChange(5000, 3000, 1999), // 9999
      /InvalidSplit|revert/
    );
  });

  it('rejects split proposals where a single channel exceeds MAX_SINGLE_BPS (60%)', async () => {
    const { distributor, admin } = await deployDistributor();
    await assert.rejects(
      () => distributor.connect(admin).proposeSplitChange(7000, 2000, 1000), // 70% dao
      /SingleSinkTooHigh|revert/
    );
  });
});
