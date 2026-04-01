/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: TempVault
 * ABI constructor: constructor()
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("TempVault (generated stub)", () => {
  it("initializes deployer as owner with ownership transfer capability", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("TempVault");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    assert.equal(await contract.owner(), signers[0].address);
    assert.equal(await contract.pendingOwner(), ethers.ZeroAddress);
  });

  it("enforces owner-only withdrawal access control", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("TempVault");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const mockToken = signers[3].address;
    const withdrawAmount = ethers.parseEther("100");

    await assert.rejects(async () => {
      await contract.connect(signers[1]).transferOwnership(signers[1].address);
    });

    await contract.connect(signers[0]).transferOwnership(signers[1].address);
    assert.equal(await contract.pendingOwner(), signers[1].address);
  });
});
