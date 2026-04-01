/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: PayrollManager
 * ABI constructor: constructor(address _dao, address _seer)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("PayrollManager (generated stub)", () => {
  it("initializes DAO and optional Seer reference with stream counter", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PayrollManager");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.seer(), signers[1].address);
    assert.equal(await contract.nextStreamId(), 1n);
  });

  it("enforces DAO-only governance and validates initialization parameters", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PayrollManager");

    await assert.rejects(async () => {
      await Factory.deploy(ethers.ZeroAddress, signers[1].address);
    });

    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    await assert.rejects(async () => {
      await contract.connect(signers[1]).setDAO(signers[1].address);
    });
  });
});
