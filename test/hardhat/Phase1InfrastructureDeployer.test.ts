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
    await assert.rejects(
      () => ethers.getContractFactory("Phase1InfrastructureDeployer"),
      /Artifact for contract "Phase1InfrastructureDeployer" not found|HHE1000/i
    );
  });
});