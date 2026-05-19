import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;
async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

/**
 * EcosystemVaultView test suite.
 *
 * EcosystemVaultView is a read-only adapter over EcosystemVault, extracted
 * to reduce EcosystemVault's bytecode below the 24576 EIP-170 limit. Most
 * functions delegate to the vault — testing that doesn't add value beyond
 * what's already covered by EcosystemVault's own tests.
 *
 * What IS worth testing here:
 *   - Pure functions (no vault interaction): tier classification math,
 *     constant exposure. These are business logic that can silently break.
 *
 * For state-dependent functions we'd need to stub the whole IEcosystemVaultView
 * surface (~30 functions). Out of scope for this round — the constants and
 * pure logic catch the most common regression class (someone changes a tier
 * threshold without realizing every downstream calculator now produces
 * different bonuses).
 */
describe("EcosystemVaultView", () => {
  async function deploy() {
    const { ethers } = (await getConnection()) as any;
    const [deployer] = await ethers.getSigners();

    // Deploy minimal stubs for vault and seer. Constructor only reads the
    // addresses; pure functions don't touch them. We can pass any non-zero
    // address that responds to view calls (or even zero — the constructor
    // doesn't validate). Use the deployer's own address for both.
    const View = await ethers.getContractFactory("EcosystemVaultView");
    const view = await View.deploy(deployer.address, deployer.address);
    await view.waitForDeployment();

    return { ethers, view };
  }

  describe("getMerchantTierMultipliers (pure)", () => {
    it("exposes the canonical tier thresholds and multipliers", async () => {
      const { view } = await deploy();
      const result = await view.getMerchantTierMultipliers();
      // Order: tier1Threshold, tier1Multiplier, tier2..., tier3..., tier4...
      assert.equal(result[0], 9500n, "tier1Threshold");
      assert.equal(result[1], 5n, "tier1Multiplier (5x — top score band)");
      assert.equal(result[2], 9000n, "tier2Threshold");
      assert.equal(result[3], 4n, "tier2Multiplier (4x)");
      assert.equal(result[4], 8500n, "tier3Threshold");
      assert.equal(result[5], 3n, "tier3Multiplier (3x)");
      assert.equal(result[6], 8000n, "tier4Threshold");
      assert.equal(result[7], 2n, "tier4Multiplier (2x — lowest qualifying)");
    });

    it("thresholds are strictly decreasing (no overlap)", async () => {
      const { view } = await deploy();
      const result = await view.getMerchantTierMultipliers();
      assert.ok(result[0] > result[2], "tier1 > tier2");
      assert.ok(result[2] > result[4], "tier2 > tier3");
      assert.ok(result[4] > result[6], "tier3 > tier4");
    });

    it("multipliers are strictly decreasing (no flat tier)", async () => {
      const { view } = await deploy();
      const result = await view.getMerchantTierMultipliers();
      assert.ok(result[1] > result[3], "tier1Mult > tier2Mult");
      assert.ok(result[3] > result[5], "tier2Mult > tier3Mult");
      assert.ok(result[5] > result[7], "tier3Mult > tier4Mult");
    });
  });

  describe("constants exposure", () => {
    it("QUARTER = 90 days", async () => {
      const { view } = await deploy();
      assert.equal(await view.QUARTER(), 90n * 24n * 60n * 60n);
    });

    it("MAX_RANK_ITERATIONS bounds rank-scan cost", async () => {
      const { view } = await deploy();
      // The contract caps any rank-iteration to avoid unbounded loops.
      // Verify the documented limit is exposed.
      assert.equal(await view.MAX_RANK_ITERATIONS(), 200n);
    });

    it("tier threshold + multiplier constants match the pure-function output", async () => {
      // If someone updates one but forgets the other, the constants and
      // the pure-function return will diverge. This catches that drift.
      const { view } = await deploy();
      assert.equal(await view.TIER1_THRESHOLD(), 9500);
      assert.equal(await view.TIER1_MULTIPLIER(), 5);
      assert.equal(await view.TIER2_THRESHOLD(), 9000);
      assert.equal(await view.TIER2_MULTIPLIER(), 4);
      assert.equal(await view.TIER3_THRESHOLD(), 8500);
      assert.equal(await view.TIER3_MULTIPLIER(), 3);
      assert.equal(await view.TIER4_THRESHOLD(), 8000);
      assert.equal(await view.TIER4_MULTIPLIER(), 2);

      const pure = await view.getMerchantTierMultipliers();
      assert.equal(pure[0], await view.TIER1_THRESHOLD());
      assert.equal(pure[1], await view.TIER1_MULTIPLIER());
      assert.equal(pure[2], await view.TIER2_THRESHOLD());
      assert.equal(pure[3], await view.TIER2_MULTIPLIER());
    });
  });

  describe("deployment", () => {
    it("stores the constructor-provided vault and seer addresses", async () => {
      const { ethers, view } = await deploy();
      const [deployer] = await ethers.getSigners();
      // The contract stores these in public immutable-ish (regular) state vars
      // — accessible via the public getters.
      assert.equal(await view.vault(), deployer.address);
      assert.equal(await view.seer(), deployer.address);
    });
  });
});
