/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: OwnerControlPanel
 * ABI constructor: constructor(address _owner, address _token, address _presale, address _vaultHub, address _burnRouter, address _seer)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("OwnerControlPanel (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("OwnerControlPanel");
  const deployArgs: any[] = [
    signers[0].address, // address _owner
    signers[1].address, // address _token
    signers[2].address, // address _presale
    signers[3].address, // address _vaultHub
    signers[4].address, // address _burnRouter
    signers[5].address, // address _seer
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
