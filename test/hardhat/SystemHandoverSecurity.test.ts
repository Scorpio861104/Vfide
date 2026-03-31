import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

describe('SystemHandover security hardening', () => {
  it('allows only dev to set dao/timelock/council before arm', async () => {
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

    const replacementDao = await DaoStub.deploy();
    await replacementDao.waitForDeployment();
    const replacementTimelock = await TimelockStub.deploy();
    await replacementTimelock.waitForDeployment();
    const replacementCouncil = await CouncilStub.deploy();
    await replacementCouncil.waitForDeployment();

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
        await handover.connect(nonDev).setDAO(await replacementDao.getAddress());
      },
      /revert/
    );

    await handover.connect(dev).setDAO(await replacementDao.getAddress());
    await handover.connect(dev).setTimelock(await replacementTimelock.getAddress());
    await handover.connect(dev).setCouncilElection(await replacementCouncil.getAddress());

    assert.equal(await handover.dao(), await replacementDao.getAddress());
    assert.equal(await handover.timelock(), await replacementTimelock.getAddress());
    assert.equal(await handover.councilElection(), await replacementCouncil.getAddress());
  });

  it('blocks dao/timelock/council setters after arm', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, councilMember] = await ethers.getSigners();

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

    const replacementDao = await DaoStub.deploy();
    await replacementDao.waitForDeployment();

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

    await handover.connect(dev).arm(1);

    await assert.rejects(
      async () => {
        await handover.connect(dev).setDAO(await replacementDao.getAddress());
      },
      /revert/
    );
  });

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

  it('supports strict DAO/timelock controls when governance links are preconfigured', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, councilMember, newAdmin] = await ethers.getSigners();

    const TimelockStrict = await ethers.getContractFactory('SHTimelockOnlySelfStub');
    const timelock = await TimelockStrict.deploy(ethers.ZeroAddress);
    await timelock.waitForDeployment();

    const DaoStrict = await ethers.getContractFactory('SHDAOOnlyTimelockStub');
    const dao = await DaoStrict.deploy(newAdmin.address, await timelock.getAddress());
    await dao.waitForDeployment();

    const TimelockStrictReady = await ethers.getContractFactory('SHTimelockOnlySelfStub');
    const readyTimelock = await TimelockStrictReady.deploy(await dao.getAddress());
    await readyTimelock.waitForDeployment();

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
      await readyTimelock.getAddress(),
      await seer.getAddress(),
      await council.getAddress(),
      ethers.ZeroAddress
    );
    await handover.waitForDeployment();

    await handover.connect(dev).arm(1);
    await handover.connect(dev).executeHandover(newAdmin.address);

    assert.equal(await handover.handoverExecuted(), true);
    assert.equal(await handover.devMultisig(), ethers.ZeroAddress);
  });

  it('fails closed when strict governance links are not ready', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, councilMember, newAdmin] = await ethers.getSigners();

    const TimelockStrict = await ethers.getContractFactory('SHTimelockOnlySelfStub');
    const timelock = await TimelockStrict.deploy(dev.address);
    await timelock.waitForDeployment();

    const DaoStrict = await ethers.getContractFactory('SHDAOOnlyTimelockStub');
    const dao = await DaoStrict.deploy(dev.address, await timelock.getAddress());
    await dao.waitForDeployment();

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

    await handover.connect(dev).arm(1);

    await assert.rejects(
      async () => {
        await handover.connect(dev).executeHandover(newAdmin.address);
      },
      /SH_GovernanceNotReady|revert/
    );
  });

  it('integrates with real DAO and DAOTimelock admin controls', async () => {
    const { ethers } = (await network.connect()) as any;
    const [dev, newAdmin, councilMember] = await ethers.getSigners();

    const Timelock = await ethers.getContractFactory('DAOTimelock');
    const timelock = await Timelock.deploy(dev.address);
    await timelock.waitForDeployment();

    const SeerStub = await ethers.getContractFactory('SHSeerStub');
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const VaultHubStub = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:VaultHubStub');
    const hub = await VaultHubStub.deploy();
    await hub.waitForDeployment();

    const DAO = await ethers.getContractFactory('DAO');
    const dao = await DAO.deploy(
      dev.address,
      await timelock.getAddress(),
      await seer.getAddress(),
      await hub.getAddress(),
      ethers.ZeroAddress
    );
    await dao.waitForDeployment();

    // Queue DAO admin change through real timelock (onlyTimelock in DAO).
    const setDaoAdminData = dao.interface.encodeFunctionData('setAdmin', [newAdmin.address]);
    const queueDaoTx = await timelock.connect(dev).queueTx(await dao.getAddress(), 0n, setDaoAdminData);
    const queueDaoReceipt = await queueDaoTx.wait();
    const daoQueuedEvent = (queueDaoReceipt?.logs as any[]).find((l) => l.fragment?.name === 'Queued');
    const daoAdminOpId = daoQueuedEvent.args[0];

    // Queue timelock self-admin change (onlyTimelockSelf in DAOTimelock).
    const setTimelockAdminData = timelock.interface.encodeFunctionData('setAdmin', [await dao.getAddress()]);
    const queueTimelockTx = await timelock.connect(dev).queueTx(await timelock.getAddress(), 0n, setTimelockAdminData);
    const queueTimelockReceipt = await queueTimelockTx.wait();
    const timelockQueuedEvent = (queueTimelockReceipt?.logs as any[]).find((l) => l.fragment?.name === 'Queued');
    const timelockAdminOpId = timelockQueuedEvent.args[0];

    await ethers.provider.send('evm_increaseTime', [48 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    // Execute in order: DAO first, then timelock self-admin migration.
    await timelock.connect(dev).execute(daoAdminOpId);
    await timelock.connect(dev).execute(timelockAdminOpId);

    assert.equal(await dao.admin(), newAdmin.address);
    assert.equal(await timelock.admin(), await dao.getAddress());

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

    await handover.connect(dev).arm(1);
    await handover.connect(dev).executeHandover(newAdmin.address);

    assert.equal(await handover.handoverExecuted(), true);
    assert.equal(await handover.devMultisig(), ethers.ZeroAddress);
  });
});
