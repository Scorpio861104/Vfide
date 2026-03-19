/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: CardBoundVault
 * ABI constructor: constructor(address _hub, address _vfideToken, address _admin, address _activeWallet, address[] _guardians, uint8 _guardianThreshold, uint256 _maxPerTransfer, uint256 _dailyTransferLimit, address _securityHub, address _ledger)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("CardBoundVault (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CardBoundVault");
  const deployArgs: any[] = [
    signers[0].address, // address _hub
    signers[1].address, // address _vfideToken
    signers[2].address, // address _admin
    signers[3].address, // address _activeWallet
    [signers[4].address], // address[] _guardians
    1n, // uint8 _guardianThreshold
    1n, // uint256 _maxPerTransfer
    1n, // uint256 _dailyTransferLimit
    signers[2].address, // address _securityHub
    signers[3].address, // address _ledger
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
