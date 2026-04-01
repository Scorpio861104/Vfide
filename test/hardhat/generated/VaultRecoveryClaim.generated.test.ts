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
  it("initializes vault infrastructure and recovery timelock constants", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRecoveryClaim");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    assert.equal(await contract.vaultHub(), signers[0].address);
    assert.equal(await contract.vaultRegistry(), signers[1].address);
    assert.ok(await contract.CHALLENGE_PERIOD() > 0n);
    assert.equal(await contract.claimCounter(), 0n);
  });

  it("validates recovery claim timelock windows and guardian approval thresholds", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRecoveryClaim");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    const challengePeriod = await contract.CHALLENGE_PERIOD();
    const guardianWindow = await contract.GUARDIAN_VOTE_WINDOW();
    const claimExpiry = await contract.CLAIM_EXPIRY();

    assert.ok(challengePeriod > 0n);
    assert.ok(guardianWindow > 0n);
    assert.ok(claimExpiry > 0n);
    assert.equal(await contract.MIN_GUARDIAN_APPROVALS(), 2n);
  });
});
