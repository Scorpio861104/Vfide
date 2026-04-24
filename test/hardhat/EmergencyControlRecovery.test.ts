import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EmergencyControl recovery", () => {
  it("queues module changes behind a timelock before applying them", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, foundation, replacementDao] = await ethers.getSigners();

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const replacementBreaker = await Breaker.deploy();
    await replacementBreaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    await control.connect(dao).setModules(replacementDao.address, await replacementBreaker.getAddress(), ethers.ZeroAddress);

    await assert.rejects(
      () => control.connect(dao).applyModules(),
      /modules timelock|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await control.connect(dao).applyModules();
    assert.equal(await control.dao(), replacementDao.address);
  });

  it("allows only current foundation to queue a timelocked foundation rotation", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, foundation, outsider, newFoundation] = await ethers.getSigners();

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    await assert.rejects(
      () => control.connect(outsider).rotateFoundation(newFoundation.address),
      /EC: not foundation|revert/
    );

    await control.connect(foundation).rotateFoundation(newFoundation.address);
    assert.equal(await control.pendingFoundation(), newFoundation.address);

    await assert.rejects(
      () => control.connect(foundation).applyFoundationRotation(),
      /EC: rotation timelock|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await control.connect(foundation).applyFoundationRotation();
    assert.equal(await control.foundation(), newFoundation.address);
  });

  it("requires committee supermajority to cancel recovery proposals", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, foundation, m1, m2, m3, replacementOwner] = await ethers.getSigners();

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerStatefulMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    await control.connect(dao).resetCommittee(2, [m1.address, m2.address, m3.address]);
    await control.connect(dao).daoToggle(true, "halt for recovery test");

    const Target = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:RecoveryOwnableTargetMock");
    const target = await Target.deploy(dao.address);
    await target.waitForDeployment();
    await target.setEmergencyController(await control.getAddress());

    const proposeTx = await control.connect(m1).proposeRecovery(await target.getAddress(), replacementOwner.address);
    const proposeReceipt = await proposeTx.wait();
    const proposedLog = (proposeReceipt?.logs as any[]).find((log) => log.fragment?.name === "RecoveryProposed");
    const recoveryId = proposedLog.args[0];

    await control.connect(m2).cancelRecovery(recoveryId);
    assert.equal(await control.recoveryCancelled(recoveryId), false);
    assert.equal(await control.recoveryCancelApprovals(recoveryId), 1n);

    await control.connect(m3).cancelRecovery(recoveryId);
    assert.equal(await control.recoveryCancelled(recoveryId), true);
  });

  it("still allows DAO to cancel recovery proposals immediately", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, foundation, m1, m2, replacementOwner] = await ethers.getSigners();

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerStatefulMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    await control.connect(dao).resetCommittee(2, [m1.address, m2.address]);
    await control.connect(dao).daoToggle(true, "halt for recovery test");

    const Target = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:RecoveryOwnableTargetMock");
    const target = await Target.deploy(dao.address);
    await target.waitForDeployment();
    await target.setEmergencyController(await control.getAddress());

    const proposeTx = await control.connect(m1).proposeRecovery(await target.getAddress(), replacementOwner.address);
    const proposeReceipt = await proposeTx.wait();
    const proposedLog = (proposeReceipt?.logs as any[]).find((log) => log.fragment?.name === "RecoveryProposed");
    const recoveryId = proposedLog.args[0];

    await control.connect(dao).cancelRecovery(recoveryId);
    assert.equal(await control.recoveryCancelled(recoveryId), true);
  });

  it("rejects committee reset above max member cap", async () => {
    const { ethers } = (await network.connect()) as any;
    const signers = await ethers.getSigners();
    const dao = signers[0];
    const foundation = signers[1];

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    const members: string[] = [];
    for (let i = 2; i <= 22; i++) {
      members.push(signers[i].address);
    }

    await assert.rejects(
      () => control.connect(dao).resetCommittee(2, members),
      /EC_CommitteeCapExceeded|revert/
    );
  });

  it("rejects applying foundation-queued member additions when committee cap is reached", async () => {
    const { ethers } = (await network.connect()) as any;
    const signers = await ethers.getSigners();
    const dao = signers[0];
    const foundation = signers[1];

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const EmergencyControl = await ethers.getContractFactory("EmergencyControl");
    const control = await EmergencyControl.deploy(
      dao.address,
      await breaker.getAddress(),
      ethers.ZeroAddress,
      foundation.address,
    );
    await control.waitForDeployment();

    const members: string[] = [];
    for (let i = 2; i <= 22; i++) {
      members.push(signers[i].address);
    }
    await control.connect(dao).resetCommittee(2, members.slice(0, 21));

    await control.connect(foundation).addMember(signers[23].address);
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => control.connect(foundation).applyFoundationMemberChange(),
      /EC_CommitteeCapExceeded|revert/
    );
  });
});
