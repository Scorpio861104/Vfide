/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: LiquidityIncentives
 * ABI constructor: constructor(address _dao, address _vfideToken)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("LiquidityIncentives (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LiquidityIncentives");
  const deployArgs: any[] = [
    signers[0].address, // address _dao
    signers[1].address, // address _vfideToken
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
