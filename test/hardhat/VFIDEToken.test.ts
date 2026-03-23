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
  const { ethers } = await network.connect();
  const [owner, user1] = await ethers.getSigners();

  // DevReserveVestingVault and presale must be contracts (extcodesize > 0)
  const Placeholder = await ethers.getContractFactory("Placeholder");
  const devVault = await Placeholder.deploy();
  const presale = await Placeholder.deploy();
  await devVault.waitForDeployment();
  await presale.waitForDeployment();

  const Token = await ethers.getContractFactory("VFIDEToken");
  const token = await Token.deploy(
    await devVault.getAddress(),
    await presale.getAddress(),
    owner.address,  // treasury (EOA ok)
    ethers.ZeroAddress, // vaultHub — optional
    ethers.ZeroAddress, // ledger   — optional
    ethers.ZeroAddress  // treasurySink — optional
  );
  await token.waitForDeployment();
  return { token, owner, user1, devVault, presale, ethers };
}

describe("VFIDEToken", () => {
  // ─── Deployment ──────────────────────────────────────────────────────────
  describe("deployment", () => {
    it("mints 200M total supply and distributes at genesis", async () => {
      const { token, devVault, presale } = await deployToken();

      const totalSupply = await token.totalSupply();
      assert.equal(totalSupply, 200_000_000n * 10n ** 18n, "total supply must be 200M");

      const devBal = await token.balanceOf(await devVault.getAddress());
      assert.equal(devBal, 50_000_000n * 10n ** 18n, "devVault must hold 50M");

      const presaleBal = await token.balanceOf(await presale.getAddress());
      assert.equal(presaleBal, 35_000_000n * 10n ** 18n, "presale must hold 35M");
    });

    it("reverts if devVault is zero address", async () => {
      const { ethers } = await network.connect();
      const [owner] = await ethers.getSigners();
      const Placeholder = await ethers.getContractFactory("Placeholder");
      const real = await Placeholder.deploy();
      await real.waitForDeployment();

      const Token = await ethers.getContractFactory("VFIDEToken");
      await assert.rejects(
        async () => Token.deploy(ethers.ZeroAddress, await real.getAddress(), owner.address,
                           ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress),
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
  });

  // ─── H-02: circuitBreaker bypasses fees in emergency mode ─────────────────
  describe("H-02: circuit breaker bypasses fees", () => {
    it("isFeeBypassed is true when circuitBreaker is active", async () => {
      const { token, owner } = await deployToken();
      const MAX = 7 * 24 * 60 * 60;

      // Activate circuitBreaker
      await token.connect(owner).setCircuitBreaker(true, MAX);
      const cbActive = await token.isCircuitBreakerActive();
      assert.equal(cbActive, true);

      // circuitBreaker must bypass fee calculation in emergency mode
      const feeBypassed = await token.isFeeBypassed();
      assert.equal(feeBypassed, true);
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
});
