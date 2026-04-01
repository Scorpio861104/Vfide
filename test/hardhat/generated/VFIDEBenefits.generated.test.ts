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
  it("initializes modules and default reward rates", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VFIDEBenefits");
    const deployArgs: any[] = [signers[0].address, signers[1].address, signers[2].address];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.seer(), signers[1].address);
    assert.equal(await contract.ledger(), signers[2].address);
    assert.equal(await contract.buyerScorePerTx(), 2n);
    assert.equal(await contract.merchantScorePerTx(), 5n);
  });

  it("enforces DAO-only configuration", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VFIDEBenefits");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    await assert.rejects(contract.connect(signers[3]).setBenefitRates(3, 6));
    await contract.connect(signers[0]).setBenefitRates(3, 6);
    assert.equal(await contract.buyerScorePerTx(), 3n);
    assert.equal(await contract.merchantScorePerTx(), 6n);

    await assert.rejects(contract.connect(signers[4]).setAuthorizedCaller(signers[5].address, true));
    await contract.connect(signers[0]).setAuthorizedCaller(signers[5].address, true);
    assert.equal(await contract.authorizedCallers(signers[5].address), true);
  });
});
