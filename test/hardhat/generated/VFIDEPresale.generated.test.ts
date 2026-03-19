/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VFIDEPresale
 * ABI constructor: constructor(address _dao, address _token, address _treasury, address _stablecoinRegistry, uint256 _startTime)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VFIDEPresale (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VFIDEPresale");
  // _startTime must be >= block.timestamp
  const block = await ethers.provider.getBlock("latest");
  const futureStart = BigInt(block!.timestamp) + 3600n;
  const deployArgs: any[] = [
    signers[0].address, // address _dao
    signers[1].address, // address _token
    signers[2].address, // address _treasury
    signers[3].address, // address _stablecoinRegistry
    futureStart, // uint256 _startTime — must be in the future
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
