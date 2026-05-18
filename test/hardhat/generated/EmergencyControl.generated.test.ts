/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: EmergencyControl
 * ABI constructor: constructor(address _dao, address _breaker, address _ledger)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EmergencyControl (generated stub)", () => {
  it("sets constructor modules and foundation", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EmergencyControl");
    const deployArgs: any[] = [
      signers[0].address,
      signers[1].address,
      ethers.ZeroAddress,
      signers[3].address,
    ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.foundation(), signers[3].address);
    assert.equal(await contract.breaker(), signers[1].address);
    assert.equal(await contract.ledger(), ethers.ZeroAddress);
  });

  it("enforces DAO-only config changes", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EmergencyControl");
    const contract = await Factory.deploy(
      signers[0].address,
      signers[1].address,
      ethers.ZeroAddress,
      signers[3].address,
    );
    await contract.waitForDeployment();

    await assert.rejects(async () => {
      await contract.connect(signers[1]).setCooldown(60n);
    });
    await contract.connect(signers[0]).setCooldown(60n);
    assert.equal(await contract.minCooldown(), 60n);
  });
});
