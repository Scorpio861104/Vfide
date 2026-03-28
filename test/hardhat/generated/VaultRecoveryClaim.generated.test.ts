/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VaultRecoveryClaim
 * ABI constructor: constructor(address _vaultHub, address _vaultRegistry)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VaultRecoveryClaim (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRecoveryClaim");
  const deployArgs: any[] = [
    signers[0].address, // address _vaultHub
    signers[1].address, // address _vaultRegistry
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
