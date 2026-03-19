/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: VFIDEBadgeNFT
 * ABI constructor: constructor(address _seer, string _baseURI)
 *
 * Notes:
 * - This test is intentionally skipped until assertions are implemented.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VFIDEBadgeNFT (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    // VFIDEBadgeNFT requires linked BadgeRegistry library
    const BadgeRegistryLib = await ethers.getContractFactory("BadgeRegistry");
    const badgeRegistryLib = await BadgeRegistryLib.deploy();
    await badgeRegistryLib.waitForDeployment();

    const Factory = await ethers.getContractFactory("VFIDEBadgeNFT", {
      libraries: { BadgeRegistry: await badgeRegistryLib.getAddress() },
    });
  const deployArgs: any[] = [
    signers[0].address, // address _seer
    "https://badges.vfide.io/", // string _baseURI
  ];

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
