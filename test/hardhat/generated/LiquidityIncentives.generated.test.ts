/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: LiquidityIncentives
 * ABI constructor: constructor(address _dao, address _vfideToken)
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("LiquidityIncentives (generated stub)", () => {
  it("initializes DAO and VFIDE token references with pool tracking", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LiquidityIncentives");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    assert.equal(await contract.dao(), signers[0].address);
    assert.equal(await contract.vfideToken(), signers[1].address);
    assert.ok(await contract.unstakeCooldown() > 0n);
  });

  it("enforces DAO-only pool management with zero-address validation", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LiquidityIncentives");
    const contract = await Factory.deploy(signers[0].address, signers[1].address);
    await contract.waitForDeployment();

    const lpTokenAddr = signers[2].address;
    const poolName = "VFIDE/ETH";

    await assert.rejects(async () => {
      await contract.connect(signers[1]).addPool(lpTokenAddr, poolName);
    });

    await assert.rejects(async () => {
      await contract.connect(signers[0]).addPool(ethers.ZeroAddress, poolName);
    });
  });
});
