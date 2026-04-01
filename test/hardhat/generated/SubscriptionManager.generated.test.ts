/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: SubscriptionManager
 * ABI constructor: constructor(address _vaultHub, address _dao, address _seer)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("SubscriptionManager (generated stub)", () => {
  it("wires constructor modules", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SubscriptionManager");
    const deployArgs: any[] = [signers[0].address, signers[1].address, signers[2].address];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
    assert.equal(await contract.vaultHub(), signers[0].address);
    assert.equal(await contract.dao(), signers[1].address);
    assert.equal(await contract.seer(), signers[2].address);
  });

  it("creates subscriptions and tracks state", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SubscriptionManager");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    await assert.rejects(
      contract.connect(signers[4]).createSubscription(signers[5].address, signers[6].address, 0n, 3600n, "bad")
    );

    await contract.connect(signers[4]).createSubscription(
      signers[5].address,
      signers[6].address,
      1000n,
      3600n,
      "monthly"
    );

    assert.equal(await contract.subCount(), 1n);
    const sub = await contract.subscriptions(1n);
    assert.equal(sub.subscriber, signers[4].address);
    assert.equal(sub.merchant, signers[5].address);
    assert.equal(sub.amount, 1000n);
    assert.equal(sub.active, true);
  });

  it("allows only DAO to update DAO address", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SubscriptionManager");
    const contract = await Factory.deploy(signers[0].address, signers[1].address, signers[2].address);
    await contract.waitForDeployment();

    await assert.rejects(contract.connect(signers[3]).setDAO(signers[4].address));
    await contract.connect(signers[1]).setDAO(signers[4].address);
    assert.equal(await contract.dao(), signers[4].address);
  });
});
