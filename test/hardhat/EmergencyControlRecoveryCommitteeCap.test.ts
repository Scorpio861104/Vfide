import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EmergencyControl committee cap guardrails", { concurrency: 1, timeout: 120000 }, () => {
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
    for (let i = 0; i < 22; i++) {
      members.push(ethers.Wallet.createRandom().address);
    }

    let reverted = false;
    try {
      await control.connect(dao).resetCommittee(2, members);
    } catch (error) {
      reverted = true;
      assert.match(String(error), /EC_CommitteeCapExceeded|revert/i);
    }
    assert.equal(reverted, true);
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
    for (let i = 0; i < 21; i++) {
      members.push(ethers.Wallet.createRandom().address);
    }
    await control.connect(dao).resetCommittee(2, members);

    await control.connect(foundation).addMember(ethers.Wallet.createRandom().address);
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    let reverted = false;
    try {
      await control.connect(foundation).applyFoundationMemberChange();
    } catch (error) {
      reverted = true;
      assert.match(String(error), /EC_CommitteeCapExceeded|revert/i);
    }
    assert.equal(reverted, true);
  });
});
