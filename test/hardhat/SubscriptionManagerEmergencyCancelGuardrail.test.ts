import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("SubscriptionManager emergency cancel guardrail", () => {
  it("blocks emergencyCancel unless emergency breaker is halted", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, subscriber, merchant] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Breaker = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:EmergencyBreakerStatefulMock");
    const breaker = await Breaker.deploy();
    await breaker.waitForDeployment();

    const Manager = await ethers.getContractFactory("SubscriptionManager");
    const manager = await Manager.deploy(await hub.getAddress(), dao.address, ethers.ZeroAddress);
    await manager.waitForDeployment();

    await manager.connect(dao).setEmergencyBreaker(await breaker.getAddress());
    await assert.rejects(
      () => manager.connect(dao).applyEmergencyBreaker(),
      /breaker timelock|revert/i
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await manager.connect(dao).applyEmergencyBreaker();

    await manager.connect(subscriber).createSubscription(
      merchant.address,
      ethers.ZeroAddress,
      1n,
      3600n,
      "test subscription"
    );

    await assert.rejects(
      () => manager.connect(dao).emergencyCancel(1),
      /SM_EmergencyNotActive|revert/i
    );

    await breaker.toggle(true, "incident");
    await manager.connect(dao).emergencyCancel(1);

    const sub = await manager.getSubscription(1);
    assert.equal(sub.active, false);
  });

  it("emits SeerRewardFailed when reward calls revert without blocking payment", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, subscriber, merchant] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    await hub.setVault(subscriber.address, subscriber.address);
    await hub.setVault(merchant.address, merchant.address);

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Seer = await ethers.getContractFactory("test/contracts/mocks/InterfaceMocks.sol:RevertingSeerRewardMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Manager = await ethers.getContractFactory("SubscriptionManager");
    const manager = await Manager.deploy(await hub.getAddress(), dao.address, await seer.getAddress());
    await manager.waitForDeployment();

    await token.mint(subscriber.address, 100n);
    await token.connect(subscriber).approve(await manager.getAddress(), 100n);

    await manager.connect(subscriber).createSubscription(
      merchant.address,
      await token.getAddress(),
      25n,
      3600n,
      "reward visibility"
    );

    const tx = await manager.connect(merchant).processPayment(1n);
    const receipt = await tx.wait();

    const rewardFailureEvents = receipt!.logs
      .map((log: any) => {
        try {
          return manager.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((parsed: any) => parsed?.name === "SeerRewardFailed");

    assert.equal(rewardFailureEvents.length, 2);
    assert.equal(await token.balanceOf(subscriber.address), 75n);
    assert.equal(await token.balanceOf(merchant.address), 25n);
  });
});