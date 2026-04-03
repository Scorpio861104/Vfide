import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EmergencyControl recovery", () => {
  it("transfers ownership through the emergency recovery hook after halt, approvals, and timelock", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, foundation, member1, member2, newOwner] = await ethers.getSigners();

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

    await control.connect(dao).resetCommittee(2, [member1.address, member2.address]);

    const Target = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:OwnableRecoveryTarget");
    const target = await Target.deploy();
    await target.waitForDeployment();

    await target.setEmergencyController(await control.getAddress());
    await breaker.setHalted(true);

    const epoch = await control.epoch();
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const recoveryId = ethers.keccak256(
      coder.encode(["address", "address", "uint256"], [await target.getAddress(), newOwner.address, epoch])
    );

    await control.connect(member1).proposeRecovery(await target.getAddress(), newOwner.address);
    await control.connect(member2).approveRecovery(recoveryId);

    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await control.connect(member1).executeRecovery(recoveryId);
    assert.equal(await target.owner(), newOwner.address);
  });
});
