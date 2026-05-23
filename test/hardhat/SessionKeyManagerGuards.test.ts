import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe('SessionKeyManager governance guards', () => {
  it('queues default limit changes behind a 24h timelock', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory('VaultHubStub');
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const SKM = await ethers.getContractFactory('SessionKeyManager');
    const skm = await SKM.deploy(dao.address, await hub.getAddress());
    await skm.waitForDeployment();

    await skm.connect(dao).setDefaultLimits(500n * 10n ** 18n, 12 * 60 * 60, 50n * 10n ** 18n);

    await assert.rejects(() => skm.connect(dao).applyDefaultLimits(), /SKM: limits timelocked/);

    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    await skm.connect(dao).applyDefaultLimits();
    assert.equal(await skm.defaultSpendLimit(), 500n * 10n ** 18n);
    assert.equal(await skm.defaultDuration(), 12n * 60n * 60n);
  });

  it('does not block spend when Seer returns Delayed (2)', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, owner, recorder, sessionKey] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory('VaultHubStub');
    const hub = await Hub.deploy();
    await hub.waitForDeployment();
    await hub.setVault(owner.address, dao.address);

    const SKM = await ethers.getContractFactory('SessionKeyManager');
    const skm = await SKM.deploy(dao.address, await hub.getAddress());
    await skm.waitForDeployment();

    const SeerMock = await ethers.getContractFactory('SeerAutonomousSessionMock');
    const seerMock = await SeerMock.deploy();
    await seerMock.waitForDeployment();
    await seerMock.setResult(2);

    await skm.connect(dao).setSeerAutonomous(await seerMock.getAddress());
    await skm.connect(dao).setAuthorizedRecorder(recorder.address, true);

    await skm.connect(owner).createQuickSession(sessionKey.address);
    await skm
      .connect(owner)
      .setSessionRecorderPermission(sessionKey.address, recorder.address, true);

    await skm.connect(recorder).recordSpend(sessionKey.address, 10n * 10n ** 18n);
    const status = await skm.getSessionStatus(sessionKey.address);
    assert.equal(status.remaining, 990n * 10n ** 18n);
  });
});
