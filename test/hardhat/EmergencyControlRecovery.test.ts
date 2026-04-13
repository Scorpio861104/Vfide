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

  it("allows only current foundation to rotate foundation address", async () => {
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
    assert.equal(await control.foundation(), newFoundation.address);
  });
});
