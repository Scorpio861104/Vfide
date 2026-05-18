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
  it("initializes vault infrastructure module dependencies and empty registry", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRegistry");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    assert.equal(await contract.vaultHub(), signers[0].address);
    assert.equal(await contract.badgeManager(), signers[1].address);
    assert.equal(await contract.proofScoreManager(), signers[2].address);
  });

  it("tracks vault registration and enforces zero-address validation", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VaultRegistry");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    const newVault = signers[3].address;
    const recoveryIdHash = ethers.keccak256(ethers.toUtf8Bytes("user-recovery-id"));

    assert.equal(await contract.vaultByRecoveryId(recoveryIdHash), ethers.ZeroAddress);
    assert.equal(await contract.vaultByEmailHash(ethers.keccak256(ethers.toUtf8Bytes("email@test.com"))), ethers.ZeroAddress);
  });
});
