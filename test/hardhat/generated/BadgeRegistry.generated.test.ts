/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: BadgeRegistry
 * ABI constructor: constructor()
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BadgeRegistry (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BadgeRegistry");
  const deployArgs: any[] = [];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
