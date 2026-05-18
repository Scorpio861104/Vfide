/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: DutyDistributor
 * ABI constructor: constructor(address _dao)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("DutyDistributor (generated stub)", () => {
  it("initializes DAO and default point configuration", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DutyDistributor");
    const contract = await Factory.deploy(signers[0].address);
    await contract.waitForDeployment();

    assert.equal(await contract.dao(), signers[0].address);
    assert.ok(await contract.pointsPerVote() > 0n);
    assert.ok(await contract.maxPointsPerUser() > 0n);
    assert.equal(await contract.totalPoints(), 0n);
  });

  it("enforces DAO-only configuration updates with bounds validation", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DutyDistributor");
    const contract = await Factory.deploy(signers[0].address);
    await contract.waitForDeployment();

    const maxPointsPerVote = await contract.MAX_POINTS_PER_VOTE();

    await assert.rejects(async () => {
      await contract.connect(signers[1]).setPointsPerVote(5n);
    });

    await contract.connect(signers[0]).setPointsPerVote(100n);
    assert.equal(await contract.pointsPerVote(), 100n);

    await assert.rejects(async () => {
      await contract.connect(signers[0]).setPointsPerVote(maxPointsPerVote + 1n);
    });
  });
});
