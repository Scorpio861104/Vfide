/**
 * VFIDEToken — Real On-Chain Hardhat Tests
 *
 * Covers:
 *  - H-01: proposeSystemExempt / confirmSystemExempt 48-hour timelock
 *  - H-01: proposeWhitelist  / confirmWhitelist     48-hour timelock
 *  - H-02: circuitBreaker bypasses fees during emergency mode
 *  - Core: deployment, supply distribution, owner can set vaultOnly
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const H48 = 48 * 60 * 60; // 48 hours in seconds

// ─── Deploy helper (call this inside tests) ──────────────────────────────
async function deployToken() {
  const { ethers } = await network.connect({
    override: {
      allowUnlimitedContractSize: true,
    },
  });
  const [owner, user1] = await ethers.getSigners();

  // DevReserveVestingVault must be a contract (extcodesize > 0)
  const Placeholder = await ethers.getContractFactory("Placeholder");
  const devVault = await Placeholder.deploy();
  await devVault.waitForDeployment();

  const Token = await ethers.getContractFactory("VFIDEToken");
  const token = await Token.deploy(
    await devVault.getAddress(),
    owner.address,  // treasury (EOA ok)
    ethers.ZeroAddress, // vaultHub — optional
    ethers.ZeroAddress, // ledger   — optional
    ethers.ZeroAddress  // treasurySink — optional
  );
  await token.waitForDeployment();
  return { token, owner, user1, devVault, ethers };
}

describe("VFIDEToken", () => {
  // ─── Deployment ──────────────────────────────────────────────────────────
  describe("deployment", () => {
    it("mints 200M total supply and distributes at genesis", async () => {
      const { token, devVault } = await deployToken();

      const totalSupply = await token.totalSupply();
      assert.equal(totalSupply, 200_000_000n * 10n ** 18n, "total supply must be 200M");

      const devBal = await token.balanceOf(await devVault.getAddress());
      assert.equal(devBal, 50_000_000n * 10n ** 18n, "devVault must hold 50M");
    });

    it("reverts if devVault is zero address", async () => {
      const { ethers } = await network.connect({
        override: {
          allowUnlimitedContractSize: true,
        },
      });
      const [owner] = await ethers.getSigners();
      const Placeholder = await ethers.getContractFactory("Placeholder");
      const real = await Placeholder.deploy();
      await real.waitForDeployment();

      const Token = await ethers.getContractFactory("VFIDEToken");
      await assert.rejects(
        async () => Token.deploy(
          ethers.ZeroAddress,
          owner.address,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress
        ),
        /revert/
      );
    });
  });

  // ─── H-01: proposeSystemExempt / confirmSystemExempt timelock ─────────────
  describe("H-01: system exempt timelock", () => {
    it("proposeSystemExempt sets pending state", async () => {
      const { token, owner, user1 } = await deployToken();
      await token.connect(owner).proposeSystemExempt(user1.address, true);
      const pending = await token.pendingExemptAddr();
      assert.equal(pending.toLowerCase(), user1.address.toLowerCase());
    });

    it("confirmSystemExempt reverts before 48h", async () => {
      const { token, owner, user1, ethers } = await deployToken();
      await token.connect(owner).proposeSystemExempt(user1.address, true);

      // Advance only 47 hours
      await ethers.provider.send("evm_increaseTime", [H48 - 3600]);
      await ethers.provider.send("evm_mine", []);

      await assert.rejects(
        () => token.connect(owner).confirmSystemExempt(),
        /revert/
      );
    });

    it("confirmSystemExempt succeeds after 48h", async () => {
      const { token, owner, user1, ethers } = await deployToken();
      await token.connect(owner).proposeSystemExempt(user1.address, true);

      // Advance 48 hours
      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);

      await token.connect(owner).confirmSystemExempt();
      const isExempt = await token.systemExempt(user1.address);
      assert.equal(isExempt, true, "systemExempt must be true after confirm");
    });

    it("owner can cancel pending system exempt proposal", async () => {
      const { token, owner, user1 } = await deployToken();
      await token.connect(owner).proposeSystemExempt(user1.address, true);

      await token.connect(owner).cancelPendingExempt();

      assert.equal(await token.pendingExemptAddr(), "0x0000000000000000000000000000000000000000");
      assert.equal(await token.pendingExemptAt(), 0n);
      await assert.rejects(
        () => token.connect(owner).confirmSystemExempt(),
        /revert/
      );
    });
  });

  // ─── H-01: proposeWhitelist / confirmWhitelist timelock ───────────────────
  describe("H-01: whitelist timelock", () => {
    it("confirmWhitelist succeeds after 48h", async () => {
      const { token, owner, user1, ethers } = await deployToken();
      await token.connect(owner).proposeWhitelist(user1.address, true);

      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);

      await token.connect(owner).confirmWhitelist();
      const isWhitelisted = await token.whitelisted(user1.address);
      assert.equal(isWhitelisted, true);
    });

    it("owner can cancel pending whitelist proposal", async () => {
      const { token, owner, user1 } = await deployToken();
      await token.connect(owner).proposeWhitelist(user1.address, true);

      await token.connect(owner).cancelPendingWhitelist();

      assert.equal(await token.pendingWhitelistAddr(), "0x0000000000000000000000000000000000000000");
      assert.equal(await token.pendingWhitelistAt(), 0n);
      await assert.rejects(
        () => token.connect(owner).confirmWhitelist(),
        /revert/
      );
    });
  });

  // ─── H-02: circuitBreaker bypasses fees in emergency mode ─────────────────
  describe("H-02: circuit breaker bypasses fees", () => {
    it("circuit breaker activation is timelocked and does not imply fee bypass", async () => {
      const { token, owner, ethers } = await deployToken();
      const MAX = 7 * 24 * 60 * 60;

      // Propose circuit breaker activation.
      await token.connect(owner).setCircuitBreaker(true, MAX);
      // Timelock means circuit breaker is not active yet.
      assert.equal(await token.isCircuitBreakerActive(), false);

      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);
      await token.connect(owner).confirmCircuitBreaker();

      const cbActive = await token.isCircuitBreakerActive();
      assert.equal(cbActive, true);

      // H-02: circuit breaker no longer implies fee bypass.
      const feeBypassed = await token.isFeeBypassed();
      assert.equal(feeBypassed, false);
    });

    it("cleans expired circuit breaker state on transfer", async () => {
      const { token, owner, user1, ethers } = await deployToken();

      await token.connect(owner).setCircuitBreaker(true, 1);
      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);
      await token.connect(owner).confirmCircuitBreaker();

      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      // Any transfer path call should prune expired emergency flags.
      await token.connect(owner).transfer(user1.address, 1n);

      assert.equal(await token.circuitBreaker(), false);
      assert.equal(await token.circuitBreakerExpiry(), 0n);
      assert.equal(await token.isCircuitBreakerActive(), false);
      assert.equal(await token.isFeeBypassed(), false);
    });

    it("cleans expired emergency flags via syncEmergencyFlags without transfer", async () => {
      const { token, owner, ethers } = await deployToken();

      await token.connect(owner).setCircuitBreaker(true, 1);
      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);
      await token.connect(owner).confirmCircuitBreaker();
      await token.connect(owner).setSecurityBypass(true, 1);
      await token.connect(owner).setFeeBypass(true, 1);

      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      // View functions already treat expired flags as inactive, but storage is stale until synced.
      assert.equal(await token.isCircuitBreakerActive(), false);
      assert.equal(await token.isSecurityBypassed(), false);
      assert.equal(await token.isFeeBypassed(), false);

      await token.connect(owner).syncEmergencyFlags();

      assert.equal(await token.circuitBreaker(), false);
      assert.equal(await token.circuitBreakerExpiry(), 0n);
      assert.equal(await token.securityBypass(), false);
      assert.equal(await token.securityBypassExpiry(), 0n);
      assert.equal(await token.feeBypass(), false);
      assert.equal(await token.feeBypassExpiry(), 0n);
    });

    it("getExpectedNetAmount returns gross amount when burnRouter is unset", async () => {
      const { token, owner, user1 } = await deployToken();

      const amount = 1234n;
      const net = await token.getExpectedNetAmount(owner.address, user1.address, amount);
      assert.equal(net, amount);
    });
  });

  // ─── Core: vaultOnly mode ──────────────────────────────────────────────────
  describe("vaultOnly mode", () => {
    it("owner can enable vaultOnly mode", async () => {
      const { token, owner } = await deployToken();
      await token.connect(owner).setVaultOnly(true);
      assert.equal(await token.vaultOnly(), true);
    });
  });

  describe("sanctum sink policy", () => {
    it("allows zero sanctum sink when policy is not locked", async () => {
      const { token, owner, ethers } = await deployToken();

      await token.connect(owner).setSanctumSink(ethers.ZeroAddress);
      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);
      await token.connect(owner).applySanctumSink();

      assert.equal(await token.sanctumSink(), ethers.ZeroAddress);
    });

    it("rejects zero sanctum sink after policy lock", async () => {
      const { token, owner, ethers } = await deployToken();

      await token.connect(owner).lockPolicy();
      await assert.rejects(
        () => token.connect(owner).setSanctumSink(ethers.ZeroAddress),
        /revert/
      );
    });
  });

  describe("transfer preview", () => {
    it("reports frozen sender and recipient consistently with live transfer rules", async () => {
      const { token, owner, user1 } = await deployToken();

      await token.connect(owner).setFrozen(owner.address, true);
      let result = await token.canTransfer(owner.address, user1.address, 1n);
      assert.equal(result[0], false);
      assert.equal(result[1], "Sender frozen");

      await token.connect(owner).setFrozen(owner.address, false);
      await token.connect(owner).setFrozen(user1.address, true);
      result = await token.canTransfer(owner.address, user1.address, 1n);
      assert.equal(result[0], false);
      assert.equal(result[1], "Recipient frozen");
    });
  });

  describe("anti-whale accounting", () => {
    it("tracks dailyTransferred using net amount when fees are active", async () => {
      const { token, owner, user1, ethers } = await deployToken();
      const [, , sanctumSink, burnSink, ecoSink] = await ethers.getSigners();

      const SeerStub = await ethers.getContractFactory("SeerScoreStub");
      const seer = await SeerStub.deploy();
      await seer.waitForDeployment();

      const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
      const router = await Router.deploy(
        await seer.getAddress(),
        sanctumSink.address,
        burnSink.address,
        ecoSink.address,
      );
      await router.waitForDeployment();

      await router.connect(owner).setToken(await token.getAddress());

      // Align token-level sink allowlist with router sink outputs.
      await token.connect(owner).setTreasurySink(ecoSink.address);
      await token.connect(owner).setSanctumSink(sanctumSink.address);
      await token.connect(owner).setBurnRouter(await router.getAddress());
      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);
      await token.connect(owner).applyTreasurySink();
      await token.connect(owner).applySanctumSink();
      await token.connect(owner).applyBurnRouter();

      // Owner is treasury at genesis and exempt by default; disable exemption so anti-whale accounting executes.
      await token.connect(owner).setWhaleLimitExempt(owner.address, false);

      const amount = 1_000n * 10n ** 18n;
      const expectedNet = await token.getExpectedNetAmount(owner.address, user1.address, amount);

      await token.connect(owner).transfer(user1.address, amount);

      const tracked = await token.dailyTransferred(owner.address);
      assert.equal(tracked, expectedNet);
      assert.notEqual(tracked, amount);
    });

    it("canTransfer daily-limit preview uses net estimate when fees are active", async () => {
      const { token, owner, user1, ethers } = await deployToken();
      const [, , sanctumSink, burnSink, ecoSink] = await ethers.getSigners();

      const SeerStub = await ethers.getContractFactory("SeerScoreStub");
      const seer = await SeerStub.deploy();
      await seer.waitForDeployment();

      const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
      const router = await Router.deploy(
        await seer.getAddress(),
        sanctumSink.address,
        burnSink.address,
        ecoSink.address,
      );
      await router.waitForDeployment();

      await router.connect(owner).setToken(await token.getAddress());
      await token.connect(owner).setTreasurySink(ecoSink.address);
      await token.connect(owner).setSanctumSink(sanctumSink.address);
      await token.connect(owner).setBurnRouter(await router.getAddress());

      await ethers.provider.send("evm_increaseTime", [H48]);
      await ethers.provider.send("evm_mine", []);

      await token.connect(owner).applyTreasurySink();
      await token.connect(owner).applySanctumSink();
      await token.connect(owner).applyBurnRouter();
      await token.connect(owner).setWhaleLimitExempt(owner.address, false);

      await token.connect(owner).setAntiWhale(
        2_000_000n * 10n ** 18n,
        4_000_000n * 10n ** 18n,
        580_000n * 10n ** 18n,
        0n,
      );

      const amount = 600_000n * 10n ** 18n;
      const expectedNet = await token.getExpectedNetAmount(owner.address, user1.address, amount);
      assert.ok(expectedNet < amount);

      const can = await token.canTransfer(owner.address, user1.address, amount);
      assert.equal(can[0], true);
      assert.equal(can[1], "");

      await token.connect(owner).transfer(user1.address, amount);
      assert.equal(await token.dailyTransferred(owner.address), expectedNet);
    });
  });
});
