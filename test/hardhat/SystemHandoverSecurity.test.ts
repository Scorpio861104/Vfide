import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

async function queueTxAndGetId(timelock: any, signer: any, target: string, data: string) {
  const tx = await timelock.connect(signer).queueTx(target, 0n, data);
  const receipt = await tx.wait();
  const queuedEvent = (receipt?.logs as any[]).find((log) => log.fragment?.name === 'Queued');
  return queuedEvent.args[0];
}

describe('SystemHandover security hardening', () => {
  it('requires ownership auditor to be an active council member', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dev, nonCouncilAuditor, councilAuditor] = await ethers.getSigners();

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
    await council.setMembers([councilAuditor.address]);

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
        await handover.connect(dev).setOwnershipAuditor(nonCouncilAuditor.address);
      },
      /SH_AuditorNotCouncil|revert/
    );

    await handover.connect(dev).setOwnershipAuditor(councilAuditor.address);
    assert.equal(await handover.ownershipAuditor(), councilAuditor.address);

    await handover.connect(councilAuditor).markOwnershipAudited();
    assert.equal(await handover.ownershipAudited(), true);
  });

  it('allows only dev to set dao/timelock/council before arm', async () => {
    const { ethers } = (await getConnection()) as any;
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
    const { ethers } = (await getConnection()) as any;
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

  it('blocks setLedger after arm while allowing it before arm', async () => {
    const { ethers } = (await getConnection()) as any;
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

    const ledgerA = await DaoStub.deploy();
    await ledgerA.waitForDeployment();
    const ledgerB = await DaoStub.deploy();
    await ledgerB.waitForDeployment();

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

    await handover.connect(dev).setLedger(await ledgerA.getAddress());
    assert.equal(await handover.ledger(), await ledgerA.getAddress());

    await handover.connect(dev).arm(1);

    await assert.rejects(
      async () => {
        await handover.connect(dev).setLedger(await ledgerB.getAddress());
      },
      /revert/
    );
    assert.equal(await handover.ledger(), await ledgerA.getAddress());
  });

  it('requires arm() before executeHandover()', async () => {
    const { ethers } = (await getConnection()) as any;
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
    const { ethers } = (await getConnection()) as any;
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
    await handover.connect(dev).setOwnershipAuditor(councilMember.address);
    await handover.connect(dev).arm(1);
    await handover.connect(councilMember).markOwnershipAudited();
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
    const { ethers } = (await getConnection()) as any;
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

    await handover.connect(dev).setOwnershipAuditor(councilMember.address);
    await handover.connect(dev).arm(1);
    await handover.connect(councilMember).markOwnershipAudited();
    await handover.connect(dev).executeHandover(newAdmin.address);

    assert.equal(await handover.handoverExecuted(), true);
    assert.equal(await handover.devMultisig(), ethers.ZeroAddress);
  });

  it('fails closed when strict governance links are not ready', async () => {
    const { ethers } = (await getConnection()) as any;
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

  it('integrates real DAO council bootstrap before timelock admin handoff', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dev, newAdmin, ...councilSigners] = await ethers.getSigners();
    const ownershipAuditor = councilSigners[0];
    const councilMembers = councilSigners.slice(0, 15).map((signer: any) => signer.address);

    assert.equal(councilMembers.length, 15);

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

    const CouncilStub = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:CouncilStub');
    const council = await CouncilStub.deploy();
    await council.waitForDeployment();
    await council.setCouncilMembers(councilMembers);

    const setCouncilData = dao.interface.encodeFunctionData('setCouncilElection', [await council.getAddress()]);
    const syncQuorumData = dao.interface.encodeFunctionData('syncQuorumToCouncil', []);
    const setCouncilOpId = await queueTxAndGetId(timelock, dev, await dao.getAddress(), setCouncilData);
    const syncQuorumOpId = await queueTxAndGetId(timelock, dev, await dao.getAddress(), syncQuorumData);

    // Queue DAO admin change through real timelock (onlyTimelock in DAO).
    const setDaoAdminData = dao.interface.encodeFunctionData('setAdmin', [newAdmin.address]);
    const daoAdminOpId = await queueTxAndGetId(timelock, dev, await dao.getAddress(), setDaoAdminData);

    // Queue timelock self-admin change (onlyTimelockSelf in DAOTimelock).
    const setTimelockAdminData = timelock.interface.encodeFunctionData('setAdmin', [await dao.getAddress()]);
    const timelockAdminOpId = await queueTxAndGetId(timelock, dev, await timelock.getAddress(), setTimelockAdminData);

    await ethers.provider.send('evm_increaseTime', [48 * 60 * 60 + 1]);
    await ethers.provider.send('evm_mine', []);

    // Execute the DAO bootstrap while the deployer still controls the timelock.
    await timelock.connect(dev).execute(setCouncilOpId);
    await timelock.connect(dev).execute(syncQuorumOpId);
    await timelock.connect(dev).execute(daoAdminOpId);
    await timelock.connect(dev).execute(timelockAdminOpId);

    assert.equal(await dao.councilElection(), await council.getAddress());
    assert.equal(await dao.minVotesRequired(), 6000n);
    assert.equal(await dao.minParticipation(), 12n);
    assert.equal(await dao.admin(), newAdmin.address);
    assert.equal(await timelock.admin(), await dao.getAddress());

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

    await handover.connect(dev).setOwnershipAuditor(ownershipAuditor.address);
    await handover.connect(dev).arm(1);
    await handover.connect(ownershipAuditor).markOwnershipAudited();
    await handover.connect(dev).executeHandover(newAdmin.address);

    assert.equal(await handover.handoverExecuted(), true);
    assert.equal(await handover.devMultisig(), ethers.ZeroAddress);
  });
});
