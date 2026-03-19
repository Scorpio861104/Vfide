/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: RevenueSplitter
 * ABI constructor: constructor(address[] _accounts, uint256[] _shares)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("RevenueSplitter (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("RevenueSplitter");
  const deployArgs: any[] = [
    [signers[0].address], // address[] _accounts
    [10000n], // uint256[] _shares — must sum to 10000 BPS (100%)
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
