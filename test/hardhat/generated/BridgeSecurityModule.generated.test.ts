/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: BridgeSecurityModule
 * ABI constructor: constructor(address _owner, address _bridge)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BridgeSecurityModule (generated stub)", () => {
  it("initializes owner and bridge address", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BridgeSecurityModule");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    assert.equal(await contract.owner(), signers[0].address);
    assert.equal(await contract.bridge(), signers[1].address);
  });

  it("enforces owner-only access to rate limit updates", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BridgeSecurityModule");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    const newHourly = ethers.parseEther("5000");
    const newDaily = ethers.parseEther("50000");

    await assert.rejects(async () => {
      await contract.connect(signers[2]).setUserLimits(newHourly, newDaily);
    });
    await contract.connect(signers[0]).setUserLimits(newHourly, newDaily);
    assert.ok(true);
  });
});
