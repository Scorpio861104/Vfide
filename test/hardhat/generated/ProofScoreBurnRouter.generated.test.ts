/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: ProofScoreBurnRouter
 * ABI constructor: constructor(address _seer, address _sanctumSink, address _burnSink, address _ecosystemSink)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("ProofScoreBurnRouter (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ProofScoreBurnRouter");
  const deployArgs: any[] = [
    signers[0].address, // address _seer
    signers[1].address, // address _sanctumSink
    signers[2].address, // address _burnSink
    signers[3].address, // address _ecosystemSink
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
