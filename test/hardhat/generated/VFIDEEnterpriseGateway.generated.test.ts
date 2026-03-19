/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VFIDEEnterpriseGateway
 * ABI constructor: constructor(address _dao, address _token, address _seer, address _vaultHub, address _oracle, address _merchantWallet)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VFIDEEnterpriseGateway (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VFIDEEnterpriseGateway");
  const deployArgs: any[] = [
    signers[0].address, // address _dao
    signers[1].address, // address _token
    signers[2].address, // address _seer
    signers[3].address, // address _vaultHub
    signers[4].address, // address _oracle
    signers[5].address, // address _merchantWallet
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
