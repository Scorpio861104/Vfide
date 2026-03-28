/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VFIDEBenefits
 * ABI constructor: constructor(address _dao, address _seer, address _ledger)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VFIDEBenefits (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VFIDEBenefits");
  const deployArgs: any[] = [
    signers[0].address, // address _dao
    signers[1].address, // address _seer
    signers[2].address, // address _ledger
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
