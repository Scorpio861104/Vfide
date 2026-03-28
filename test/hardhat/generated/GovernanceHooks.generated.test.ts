/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: GovernanceHooks
 * ABI constructor: constructor(address _ledger, address _seer, address _dao)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("GovernanceHooks (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("GovernanceHooks");
  const deployArgs: any[] = [
    signers[0].address, // address _ledger
    signers[1].address, // address _seer
    signers[2].address, // address _dao
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
