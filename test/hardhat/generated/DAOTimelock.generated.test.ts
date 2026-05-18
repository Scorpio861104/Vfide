/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: DAOTimelock
 * ABI constructor: constructor(address _admin)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("DAOTimelock (generated stub)", () => {
  it("initializes admin and delay constraints", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DAOTimelock");
    const contract = await Factory.deploy(signers[0].address);
    await contract.waitForDeployment();

    assert.equal(await contract.admin(), signers[0].address);
    assert.ok(await contract.delay() > 0n);
    assert.ok(await contract.MIN_DELAY() <= await contract.MAX_DELAY());
  });

  it("enforces MIN_DELAY and MAX_DELAY bounds on setDelay", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DAOTimelock");
    const contract = await Factory.deploy(signers[0].address);
    await contract.waitForDeployment();

    const minDelay = await contract.MIN_DELAY();
    const maxDelay = await contract.MAX_DELAY();
    const zeroDelay = 1n;
    const tooSmall = minDelay - 1n;
    const tooLarge = maxDelay + 1n;

    await assert.rejects(async () => {
      await contract.connect(signers[0]).setDelay(tooSmall);
    });

    await assert.rejects(async () => {
      await contract.connect(signers[0]).setDelay(tooLarge);
    });
  });
});
