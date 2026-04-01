/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: GovernanceHooks
 * ABI constructor: constructor(address _ledger, address _seer, address _dao)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("GovernanceHooks (generated stub)", () => {
  it("initializes ownership and module addresses", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("GovernanceHooks");
    const deployArgs: any[] = [signers[0].address, signers[1].address, signers[2].address];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
    assert.equal(await contract.ledger(), signers[0].address);
    assert.equal(await contract.seer(), signers[1].address);
    assert.equal(await contract.dao(), signers[2].address);
    assert.equal(await contract.owner(), signers[0].address);
  });

  it("enforces authorization boundaries", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GovernanceHooks");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    await assert.rejects(contract.connect(signers[3]).setDAO(signers[4].address));
    await contract.connect(signers[2]).setDAO(signers[4].address);
    assert.equal(await contract.dao(), signers[4].address);

    await assert.rejects(contract.connect(signers[3]).setModules(signers[5].address, signers[6].address, signers[7].address));
    await contract.connect(signers[0]).setModules(signers[5].address, signers[6].address, signers[7].address);
    assert.equal(await contract.ledger(), signers[5].address);
    assert.equal(await contract.seer(), signers[6].address);
    assert.equal(await contract.guardian(), signers[7].address);
  });
});
