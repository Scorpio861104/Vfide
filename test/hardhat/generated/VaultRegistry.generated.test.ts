/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VaultRegistry
 * ABI constructor: constructor(address _vaultHub, address _badgeManager, address _proofScoreManager)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VaultRegistry (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRegistry");
  const deployArgs: any[] = [
    signers[0].address, // address _vaultHub
    signers[1].address, // address _badgeManager
    signers[2].address, // address _proofScoreManager
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
