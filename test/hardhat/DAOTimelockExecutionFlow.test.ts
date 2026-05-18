import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

async function queueTxAndGetId(timelock: any, admin: any, target: string, data: string): Promise<string> {
  const tx = await timelock.connect(admin).queueTx(target, 0n, data);
  const receipt = await tx.wait();
  const queuedEvent = (receipt?.logs as any[]).find((log: any) => log.fragment?.name === "Queued");
  if (!queuedEvent) throw new Error("Queued event not found");
  return queuedEvent.args[0] as string;
}

async function deployDaoAndTimelock() {
  const { ethers } = (await getConnection()) as any;
  const [tempAdmin, outsider, newAdmin] = await ethers.getSigners();

  const Placeholder = await ethers.getContractFactory("Placeholder");
  const seer = await Placeholder.deploy();
  const hub = await Placeholder.deploy();
  await seer.waitForDeployment();
  await hub.waitForDeployment();

  const Timelock = await ethers.getContractFactory("DAOTimelock");
  const timelock = await Timelock.deploy(tempAdmin.address);
  await timelock.waitForDeployment();

  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(
    tempAdmin.address,
    await timelock.getAddress(),
    await seer.getAddress(),
    await hub.getAddress(),
    ethers.ZeroAddress,
  );
  await dao.waitForDeployment();

  return { ethers, tempAdmin, outsider, newAdmin, timelock, dao };
}

describe("DAOTimelock admin-rotation execution flow hardening", () => {
  it("#208: permissionless execution for queued self setAdmin", async () => {
    const { ethers, tempAdmin, outsider, newAdmin, timelock } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const setAdminData = timelock.interface.encodeFunctionData("setAdmin", [newAdmin.address]);
    const setAdminTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setAdminData);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await timelock.connect(outsider).execute(setAdminTxId);
    assert.equal(await timelock.admin(), newAdmin.address);
  });

  it("#208: non-rotation tx remains admin-only", async () => {
    const { ethers, tempAdmin, outsider, timelock } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const setDelayData = timelock.interface.encodeFunctionData("setDelay", [24 * 60 * 60]);
    const setDelayTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setDelayData);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => timelock.connect(outsider).execute(setDelayTxId),
      /TL: only admin can execute/,
    );
  });

  it("#207: DAO can execute ripe queued tx after admin rotation", async () => {
    const { ethers, tempAdmin, outsider, timelock, dao } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const daoAddr = await dao.getAddress();

    const setAdminData = timelock.interface.encodeFunctionData("setAdmin", [daoAddr]);
    const setDelayData = timelock.interface.encodeFunctionData("setDelay", [24 * 60 * 60]);
    const setAdminTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setAdminData);
    const setDelayTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setDelayData);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await timelock.connect(outsider).execute(setAdminTxId);
    assert.equal(await timelock.admin(), daoAddr);

    await dao.connect(outsider).executeTimelockTx(setDelayTxId);
    assert.equal(await timelock.delay(), 24n * 60n * 60n);
  });

  it("#207: DAO.executeTimelockTx reverts for not-yet-ripe tx", async () => {
    const { ethers, tempAdmin, outsider, timelock, dao } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const daoAddr = await dao.getAddress();

    const setAdminData = timelock.interface.encodeFunctionData("setAdmin", [daoAddr]);
    const setAdminTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setAdminData);

    await ethers.provider.send("evm_increaseTime", [47 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const pendingSetDelayData = timelock.interface.encodeFunctionData("setDelay", [25 * 60 * 60]);
    const pendingSetDelayTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, pendingSetDelayData);

    await ethers.provider.send("evm_increaseTime", [60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await timelock.connect(outsider).execute(setAdminTxId);
    assert.equal(await timelock.admin(), daoAddr);

    await assert.rejects(
      () => dao.connect(outsider).executeTimelockTx(pendingSetDelayTxId),
      /too early/,
    );

    await ethers.provider.send("evm_increaseTime", [47 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await dao.connect(outsider).executeTimelockTx(pendingSetDelayTxId);
    assert.equal(await timelock.delay(), 25n * 60n * 60n);
  });

  it("#210: requeueExpired preserves DAO proposal tracking mapping", async () => {
    const { ethers, tempAdmin, timelock } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const setDelayData = timelock.interface.encodeFunctionData("setDelay", [14 * 60 * 60]);
    const daoProposalId = 77n;

    const oldTx = await timelock.connect(tempAdmin).queueTxFromDAO(timelockAddr, 0n, setDelayData, daoProposalId);
    const oldReceipt = await oldTx.wait();
    const oldQueuedEvent = (oldReceipt?.logs as any[]).find((log: any) => log.fragment?.name === "Queued");
    if (!oldQueuedEvent) throw new Error("Queued event not found");
    const oldTxId = oldQueuedEvent.args[0] as string;

    await ethers.provider.send("evm_increaseTime", [10 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const requeueTx = await timelock.connect(tempAdmin).requeueExpired(oldTxId);
    const requeueReceipt = await requeueTx.wait();
    const newQueuedEvent = (requeueReceipt?.logs as any[]).find((log: any) => log.fragment?.name === "Queued");
    if (!newQueuedEvent) throw new Error("Requeue queued event not found");
    const newTxId = newQueuedEvent.args[0] as string;

    assert.equal(await timelock.daoProposalForTx(oldTxId), 0n);
    assert.equal(await timelock.daoProposalForTx(newTxId), daoProposalId);
  });

  it("#217: setDelay enforces ABSOLUTE_MIN_DELAY floor", async () => {
    const { ethers, tempAdmin, timelock } = await deployDaoAndTimelock();

    const timelockAddr = await timelock.getAddress();
    const setDelayBelowAbsoluteMin = timelock.interface.encodeFunctionData("setDelay", [13 * 60 * 60]);
    const setDelayTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setDelayBelowAbsoluteMin);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => timelock.connect(tempAdmin).execute(setDelayTxId),
      /TL: delay below absolute minimum/,
    );
  });

  it("#220: execute does not brick when panicGuard.globalRisk reverts", async () => {
    const { ethers, tempAdmin, timelock } = await deployDaoAndTimelock();

    const RevertingPanicGuard = await ethers.getContractFactory("PanicGuardRevertingMock");
    const revertingGuard = await RevertingPanicGuard.deploy();
    await revertingGuard.waitForDeployment();

    const timelockAddr = await timelock.getAddress();
    const setPanicGuardData = timelock.interface.encodeFunctionData("setPanicGuard", [await revertingGuard.getAddress()]);
    const setPanicGuardTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setPanicGuardData);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await timelock.connect(tempAdmin).execute(setPanicGuardTxId);

    const setDelayData = timelock.interface.encodeFunctionData("setDelay", [24 * 60 * 60]);
    const setDelayTxId = await queueTxAndGetId(timelock, tempAdmin, timelockAddr, setDelayData);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    // Should still execute even though panicGuard.globalRisk() always reverts.
    await timelock.connect(tempAdmin).execute(setDelayTxId);
    assert.equal(await timelock.delay(), 24n * 60n * 60n);
  });

  it("#225: canRotateSecondaryExecutor provides safe preflight guidance", async () => {
    const { ethers, tempAdmin, outsider, timelock } = await deployDaoAndTimelock();

    const [okZero, reasonZero] = await timelock.canRotateSecondaryExecutor(ethers.ZeroAddress);
    assert.equal(okZero, false);
    assert.match(reasonZero, /zero address/);

    const [okEoa, reasonEoa] = await timelock.canRotateSecondaryExecutor(outsider.address);
    assert.equal(okEoa, false);
    assert.match(reasonEoa, /EOA/);

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const secondaryCandidate = await Placeholder.deploy();
    await secondaryCandidate.waitForDeployment();

    const [okContract, reasonContract] = await timelock.canRotateSecondaryExecutor(await secondaryCandidate.getAddress());
    assert.equal(okContract, true);
    assert.equal(reasonContract, "");
  });
});
