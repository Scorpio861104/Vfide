/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: SanctumVault
 * ABI constructor: constructor(address _dao, address _ledger, address _seer)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("SanctumVault (generated stub)", () => {
  it("initializes DAO and approver set", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SanctumVault");
    const deployArgs: any[] = [signers[0].address, ethers.ZeroAddress, ethers.ZeroAddress];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.ledger(), ethers.ZeroAddress);
    assert.equal(await contract.seer(), ethers.ZeroAddress);
    assert.equal(await contract.getApproverCount(), 1n);
    assert.equal(await contract.isApprover(signers[0].address), true);
  });

  it("restricts charity approvals to DAO", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SanctumVault");
    const contract = await Factory.deploy(signers[0].address, ethers.ZeroAddress, ethers.ZeroAddress);
    await contract.waitForDeployment();

    await assert.rejects(async () => {
      await contract.connect(signers[3]).approveCharity(signers[4].address, "Help Fund", "health");
    });

    await contract.connect(signers[0]).approveCharity(signers[4].address, "Help Fund", "health");
    const info = await contract.charities(signers[4].address);
    assert.equal(info.approved, true);
    assert.equal(await contract.getCharityCount(), 1n);
  });
});
