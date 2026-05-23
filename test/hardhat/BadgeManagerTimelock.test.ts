import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe('BadgeManager timelocks', () => {
  async function deployFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, operator] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory('Seer');
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const Rules = await ethers.getContractFactory('BadgeQualificationRules');
    const rulesA = await Rules.deploy();
    await rulesA.waitForDeployment();
    const rulesB = await Rules.deploy();
    await rulesB.waitForDeployment();

    const BadgeRegistry = await ethers.getContractFactory('BadgeRegistry');
    const badgeRegistry = await BadgeRegistry.deploy();
    await badgeRegistry.waitForDeployment();

    const BadgeManager = await ethers.getContractFactory('BadgeManager', {
      libraries: {
        BadgeRegistry: await badgeRegistry.getAddress(),
      },
    });
    const manager = await BadgeManager.deploy(
      dao.address,
      await seer.getAddress(),
      await rulesA.getAddress()
    );
    await manager.waitForDeployment();

    return { ethers, dao, operator, manager, rulesA, rulesB };
  }

  it('applies operator changes only after 24h', async () => {
    const { ethers, dao, operator, manager } = await deployFixture();

    await manager.connect(dao).setOperator(operator.address, true);

    await assert.rejects(() => manager.connect(dao).applyOperator(operator.address), /revert/);

    await ethers.provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    await manager.connect(dao).applyOperator(operator.address);
    assert.equal(await manager.operators(operator.address), true);
  });

  it('applies qualification-rules changes only after 48h', async () => {
    const { ethers, dao, manager, rulesA, rulesB } = await deployFixture();

    await manager.connect(dao).setQualificationRules(await rulesB.getAddress());

    await assert.rejects(() => manager.connect(dao).applyQualificationRules(), /revert/);

    await ethers.provider.send('evm_increaseTime', [48 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    await manager.connect(dao).applyQualificationRules();
    assert.equal(await manager.qualificationRules(), await rulesB.getAddress());
    assert.notEqual(await rulesA.getAddress(), await rulesB.getAddress());
  });
});
