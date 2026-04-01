/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: BadgeRegistry
 * ABI constructor: constructor()
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("BadgeRegistry (generated stub)", () => {
  it("deploys library with badge constant references available", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BadgeRegistry");
    const deployArgs: any[] = [];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });

  it("stores badge identifiers as keccak256 constants (non-mutable library)", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BadgeRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const pioneer = await contract.PIONEER();
    const foundingMember = await contract.FOUNDING_MEMBER();

    assert.ok(pioneer);
    assert.ok(foundingMember);
    assert.notEqual(pioneer, foundingMember);
  });
});
