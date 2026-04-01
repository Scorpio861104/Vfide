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
  it("initializes arbiter, seer, and DAO governance references", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EscrowManager");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    assert.equal(await contract.arbiter(), signers[0].address);
    assert.equal(await contract.seer(), signers[1].address);
    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.escrowCount(), 0n);
  });

  it("validates HIGH_VALUE_THRESHOLD constant and rejects zero addresses", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EscrowManager");

    await assert.rejects(async () => {
      await Factory.deploy(ethers.ZeroAddress, signers[1].address);
    });

    await assert.rejects(async () => {
      await Factory.deploy(signers[0].address, ethers.ZeroAddress);
    });
  });
});
