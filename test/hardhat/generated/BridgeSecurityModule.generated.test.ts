/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: BridgeSecurityModule
 * ABI constructor: constructor(address _owner, address _bridge)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BridgeSecurityModule (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BridgeSecurityModule");
  const deployArgs: any[] = [
    signers[0].address, // address _owner
    signers[1].address, // address _bridge
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
