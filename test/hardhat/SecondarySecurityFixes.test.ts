/**
 * SecondarySecurityFixes.test.ts
 *
 * Regression tests for:
 *   BSM-01 — BridgeSecurityModule: flagged users can bypass rate limits
 *   SG-01  — SeerGuardian: checkAndEnforce applies least-severe restriction first
 *              (fixed: now applies most-severe applicable restriction immediately)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// BSM-01: BridgeSecurityModule — flagged users must be rejected
// ─────────────────────────────────────────────────────────────────────────────
describe("BridgeSecurityModule (BSM-01: flagged-user bypass closed)", { concurrency: 1 }, () => {
  async function bridgeSecurityModuleFixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner, bridge, user] = await ethers.getSigners();

    const BSM = await ethers.getContractFactory("BridgeSecurityModule");
    const bsm = await BSM.deploy(owner.address, bridge.address);
    await bsm.waitForDeployment();
    return { ethers, bsm, owner, bridge, user };
  }

  async function deployBSM() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(bridgeSecurityModuleFixture);
  }

  it("first 7 calls pass and flag the user on the 7th", async () => {
    const { bsm, bridge, user, ethers } = await deployBSM();
    const userAddr = user.address;
    const smolAmount = ethers.parseEther("1");

    // Calls 1-7: all succeed; call 7 sets flagged=true inside _checkSuspiciousActivity
    // (rapidTransferCount increments to 6 on call 7 which is > 5, so flagged=true)
    // Note: call 1 resets the counter because lastTransferTime starts at 0 which places
    //       it >5 minutes in the past. Calls 2-7 are within 5 minutes of call 1.
    for (let i = 0; i < 7; i++) {
      await bsm.connect(bridge).checkRateLimit(userAddr, smolAmount);
    }

    const flags = await bsm.suspiciousActivity(userAddr);
    assert.ok(flags.flagged, "User should be flagged after 7 rapid transfers");
  });

  it("8th call reverts with SuspiciousActivity after user is flagged", async () => {
    const { bsm, bridge, user, ethers } = await deployBSM();
    const userAddr = user.address;
    const smolAmount = ethers.parseEther("1");

    // Trigger the flag
    for (let i = 0; i < 7; i++) {
      await bsm.connect(bridge).checkRateLimit(userAddr, smolAmount);
    }

    // BSM-01 fix: 8th call must be rejected
    await assert.rejects(
      () => bsm.connect(bridge).checkRateLimit(userAddr, smolAmount),
      /SuspiciousActivity/
    );
  });

  it("admin-cleared flag allows subsequent transfers", async () => {
    const { bsm, bridge, owner, user, ethers } = await deployBSM();
    const userAddr = user.address;
    const smolAmount = ethers.parseEther("1");

    // Flag the user
    for (let i = 0; i < 7; i++) {
      await bsm.connect(bridge).checkRateLimit(userAddr, smolAmount);
    }

    // Admin clears the flag
    await bsm.connect(owner).clearSuspiciousFlags(userAddr);

    // Should succeed now
    await bsm.connect(bridge).checkRateLimit(userAddr, smolAmount);
    const flags = await bsm.suspiciousActivity(userAddr);
    assert.ok(!flags.flagged, "Flag should be cleared");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SG-01: SeerGuardian — checkAndEnforce must apply most-severe restriction
// ─────────────────────────────────────────────────────────────────────────────
describe("SeerGuardian (SG-01: severity-first restriction escalation)", { concurrency: 1 }, () => {
  async function seerGuardianFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, subject, attacker] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const SG = await ethers.getContractFactory("SeerGuardian");
    // constructor(address _dao, address _seer, address _vaultHub, address _ledger)
    const sg = await SG.deploy(
      dao.address,
      await seer.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress,
    );
    await sg.waitForDeployment();

    // Enum values: None=0, TransferLimit=1, GovernanceBan=2, MerchantSuspended=3, FullFreeze=4
    const RestrictionType = { None: 0n, TransferLimit: 1n, GovernanceBan: 2n, FullFreeze: 4n };

    return { ethers, sg, seer, dao, subject, attacker, RestrictionType };
  }

  async function deploySG() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(seerGuardianFixture);
  }

  it("rejects third-party enforcement calls for another subject", async () => {
    const { sg, seer, subject, attacker } = await deploySG();
    const subjectAddr = subject.address;

    await seer.setScore(subjectAddr, 500);

    await assert.rejects(
      () => sg.connect(attacker).checkAndEnforce(subjectAddr),
      /SG_NotAuthorized|revert/i
    );
  });

  it("score 500 (critical) → FullFreeze applied in one call (SG-01 fix)", async () => {
    const { sg, seer, subject, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    // Score 500 < 1000 (critical threshold)
    await seer.setScore(subjectAddr, 500);

    // Single call must escalate directly to FullFreeze
    await sg.checkAndEnforce(subjectAddr);

    const restriction = await sg.activeRestriction(subjectAddr);
    assert.equal(restriction, RestrictionType.FullFreeze,
      "Expected FullFreeze (4) for critical score 500, got: " + restriction);
  });

  it("score 1500 (very-low) → TransferLimit applied in one call", async () => {
    const { sg, seer, subject, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    // Score 1500: < 2000 but NOT < 1000
    await seer.setScore(subjectAddr, 1500);

    await sg.checkAndEnforce(subjectAddr);

    const restriction = await sg.activeRestriction(subjectAddr);
    assert.equal(restriction, RestrictionType.TransferLimit,
      "Expected TransferLimit (1) for very-low score 1500, got: " + restriction);
  });

  it("score 1500 with existing GovernanceBan → escalates to TransferLimit", async () => {
    const { sg, seer, subject, ethers, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    await seer.setScore(subjectAddr, 2500);
    await sg.checkAndEnforce(subjectAddr);
    assert.equal(await sg.activeRestriction(subjectAddr), RestrictionType.GovernanceBan, "setup check");

    await seer.setScore(subjectAddr, 1500);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    await sg.checkAndEnforce(subjectAddr);

    const restriction = await sg.activeRestriction(subjectAddr);
    assert.equal(
      restriction,
      RestrictionType.TransferLimit,
      "GovernanceBan → TransferLimit escalation must work on score drop to 1500"
    );
  });

  it("score 2500 (low, below autoRestrictThreshold=3000) → GovernanceBan applied", async () => {
    const { sg, seer, subject, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    // autoRestrictThreshold defaults to 3000 in SeerGuardian
    // Score 2500: < 3000 AND >= 2000, so only GovernanceBan
    await seer.setScore(subjectAddr, 2500);

    await sg.checkAndEnforce(subjectAddr);

    const restriction = await sg.activeRestriction(subjectAddr);
    assert.equal(restriction, RestrictionType.GovernanceBan,
      "Expected GovernanceBan (2) for low score 2500, got: " + restriction);
  });

  it("score 500 pre-patch scenario: old code would apply GovernanceBan (regression guard)", async () => {
    // This test documents the old broken behavior — the fix must NOT produce GovernanceBan
    // for a critical score. If GovernanceBan (2) is returned, the patch is broken.
    const { sg, seer, subject, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    await seer.setScore(subjectAddr, 500);
    await sg.checkAndEnforce(subjectAddr);

    const restriction = await sg.activeRestriction(subjectAddr);
    assert.notEqual(restriction, RestrictionType.GovernanceBan,
      "Regression: critical score must not stop at GovernanceBan — must reach FullFreeze");
  });

  it("score 900 with existing GovernanceBan → escalates to FullFreeze", async () => {
    // Verify that once GovernanceBan is already set, a critical score still escalates
    const { sg, seer, dao, subject, ethers, RestrictionType } = await deploySG();
    const subjectAddr = subject.address;

    // Plant a GovernanceBan via DAO (manual restriction)
    // Score starts high enough to stay at GovernanceBan on first call
    await seer.setScore(subjectAddr, 2500);
    await sg.checkAndEnforce(subjectAddr);
    assert.equal(await sg.activeRestriction(subjectAddr), RestrictionType.GovernanceBan, "setup check");

    // Now score drops to critical
    await seer.setScore(subjectAddr, 900);

    // Advance past 1-hour cooldown
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    await sg.checkAndEnforce(subjectAddr);
    const restriction = await sg.activeRestriction(subjectAddr);
    assert.equal(restriction, RestrictionType.FullFreeze,
      "GovernanceBan → FullFreeze escalation must work on score drop to 900");
  });
});
