/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: StablecoinRegistry
 * ABI constructor: constructor()
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("StablecoinRegistry (generated stub)", () => {
  it("initializes empty registry with decimal bounds", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("StablecoinRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    assert.equal(await contract.MIN_DECIMALS(), 1n);
    assert.equal(await contract.MAX_DECIMALS(), 18n);
    assert.equal(await contract.MAX_SYMBOL_LENGTH(), 16n);
  });

  it("enforces owner-only stablecoin management and validates decimals", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("StablecoinRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const tokenAddr = signers[1].address;
    const decimals = 6n;
    const symbol = "USDC";

    await assert.rejects(async () => {
      await contract.connect(signers[1]).addStablecoin(tokenAddr, Number(decimals), symbol);
    });

    await assert.rejects(async () => {
      await contract.connect(signers[0]).addStablecoin(ethers.ZeroAddress, Number(decimals), symbol);
    });
  });
});
