import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

describe('SystemHandover security hardening', () => {
  it('requires arm() before executeHandover()', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, nonDev, councilMember] = await ethers.getSigners();

    const DaoStub = await ethers.getContractFactory('SHDAOAdminStub');
    const dao = await DaoStub.deploy();
    await dao.waitForDeployment();

    const TimelockStub = await ethers.getContractFactory('SHTimelockAdminStub');
    const timelock = await TimelockStub.deploy();
    await timelock.waitForDeployment();

    const SeerStub = await ethers.getContractFactory('SHSeerStub');
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const CouncilStub = await ethers.getContractFactory('SHCouncilElectionStub');
    const council = await CouncilStub.deploy();
    await council.waitForDeployment();
    await council.setMembers([councilMember.address]);

    const SystemHandover = await ethers.getContractFactory('SystemHandover');
    const handover = await SystemHandover.deploy(
      dev.address,
      await dao.getAddress(),
      await timelock.getAddress(),
      await seer.getAddress(),
      await council.getAddress(),
      ethers.ZeroAddress
    );
    await handover.waitForDeployment();

    await assert.rejects(
      async () => {
        await handover.connect(dev).executeHandover(ethers.ZeroAddress);
      },
      /revert/
    );

    await assert.rejects(
      async () => {
        await handover.connect(nonDev).arm(1);
      },
      /revert/
    );
  });

  it('is one-time and burns dev control after execution', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, councilMember, newAdmin] = await ethers.getSigners();

    const DaoStub = await ethers.getContractFactory('SHDAOAdminStub');
    const dao = await DaoStub.deploy();
    await dao.waitForDeployment();

    const TimelockStub = await ethers.getContractFactory('SHTimelockAdminStub');
    const timelock = await TimelockStub.deploy();
    await timelock.waitForDeployment();

    const SeerStub = await ethers.getContractFactory('SHSeerStub');
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const CouncilStub = await ethers.getContractFactory('SHCouncilElectionStub');
    const council = await CouncilStub.deploy();
    await council.waitForDeployment();
    await council.setMembers([councilMember.address]);

    const SystemHandover = await ethers.getContractFactory('SystemHandover');
    const handover = await SystemHandover.deploy(
      dev.address,
      await dao.getAddress(),
      await timelock.getAddress(),
      await seer.getAddress(),
      await council.getAddress(),
      ethers.ZeroAddress
    );
    await handover.waitForDeployment();

    // Use historical launch timestamp to represent already-mature handover window.
    await handover.connect(dev).arm(1);
    await handover.connect(dev).executeHandover(newAdmin.address);

    assert.equal(await handover.handoverExecuted(), true);
    assert.equal(await handover.devMultisig(), ethers.ZeroAddress);
    assert.equal(await dao.admin(), newAdmin.address);
    assert.equal(await timelock.admin(), await dao.getAddress());

    await assert.rejects(
      async () => {
        await handover.connect(dev).executeHandover(newAdmin.address);
      },
      /revert/
    );
  });
});
