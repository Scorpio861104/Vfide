/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: EscrowManager
 * ABI constructor: constructor(address _arbiter, address _seer)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EscrowManager (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EscrowManager");
  const deployArgs: any[] = [
    signers[0].address, // address _arbiter
    signers[1].address, // address _seer
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
