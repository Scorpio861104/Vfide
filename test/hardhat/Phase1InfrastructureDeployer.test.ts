import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("Phase1InfrastructureDeployer", () => {
  it("fails closed instead of deploying WithdrawalQueueStub", async () => {
    const { ethers } = (await getConnection()) as any;
    const [admin, oracle, emergencyControl] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Phase1InfrastructureDeployer");
    const deployer = await Factory.deploy();
    await deployer.waitForDeployment();

    await assert.rejects(
      () => deployer.deployInfrastructure(admin.address, oracle.address, emergencyControl.address),
      /WithdrawalQueueStub disabled|revert/i
    );
  });
});