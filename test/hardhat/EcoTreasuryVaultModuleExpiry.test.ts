import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe('EcoTreasuryVault module rotation expiry', () => {
  it('rejects stale pendingDAO acceptance after expiry and allows cleanup', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, pendingDao] = await ethers.getSigners();

    const Token = await ethers.getContractFactory(
      'test/contracts/helpers/Stubs.sol:MintableTokenStub'
    );
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Treasury = await ethers.getContractFactory('EcoTreasuryVault');
    const treasury = await Treasury.deploy(
      dao.address,
      ethers.ZeroAddress,
      await token.getAddress()
    );
    await treasury.waitForDeployment();

    await treasury
      .connect(dao)
      .setModules(pendingDao.address, dao.address, await token.getAddress());

    await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    await assert.rejects(
      () => treasury.connect(pendingDao).acceptDAO(),
      /pending modules expired|revert/i
    );

    await treasury.clearExpiredModules();
    assert.equal(await treasury.pendingDAO(), ethers.ZeroAddress);
    assert.equal(await treasury.pendingModulesExpireAt(), 0n);
  });
});
