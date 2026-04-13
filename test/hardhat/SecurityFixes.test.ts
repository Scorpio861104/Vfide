/**
 * Security Fix Tests — Comprehensive Real On-Chain Hardhat Tests
 *
 * Tests for:
 *  - M-11 (VaultHub): Council as recovery approver
 *  - H-03 (DevReserveVestingVault): DAO pause claims
 *  - H-05 (VaultInfrastructure): Execute whitelist
 *  - M-25 (VFIDESecurity): Vault registration check
 *  - M-18 (Seer): Circular delta guard
 *  - L-08 (VFIDEAccessControl): Atomic admin transfer
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

// ──────────────────────────────────────────────────────────────────────────────
// M-11: VaultHub + Non-custodial recovery guard
// ──────────────────────────────────────────────────────────────────────────────
describe("VaultHub (M-11: non-custodial recovery guard)", () => {
  it("keeps DAO/council force recovery paths disabled", async () => {
    const { ethers } = await network.connect();
    const [, dao, , councilMember, vaultOwner, newOwner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(await token.getAddress(), ethers.ZeroAddress, dao.address);
    await hub.waitForDeployment();

    await (await hub.connect(vaultOwner).ensureVault(vaultOwner.address)).wait();
    const vaultAddr = await hub.vaultOf(vaultOwner.address);

    const CouncilStub = await ethers.getContractFactory("CouncilStub");
    const council = await CouncilStub.deploy();
    await council.waitForDeployment();
    await council.addCouncilMember(councilMember.address);
    await hub.setCouncil(await council.getAddress());

    await assert.rejects(
      () => hub.connect(councilMember).approveForceRecovery(vaultAddr, newOwner.address),
      /revert/
    );
    assert.equal(await hub.recoveryApprovalCount(vaultAddr), 0n);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// H-03: DevReserveVestingVault + DAO Pause Claims
// ──────────────────────────────────────────────────────────────────────────────
describe("DevReserveVestingVault (H-03: DAO pause claims)", () => {
  it("DAO can pause claims" , async () => {
    const { ethers } = await network.connect();
    const [deployer, bene, dao] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    const vaultHub = await TokenStub.deploy();
    await token.waitForDeployment();
    await vaultHub.waitForDeployment();

    const EXPECTED_ALLOC = 50_000_000n * 10n ** 18n;
    const DRVV = await ethers.getContractFactory("DevReserveVestingVault");
    const vault = await DRVV.deploy(
      await token.getAddress(), bene.address, await vaultHub.getAddress(),
      ethers.ZeroAddress,
      EXPECTED_ALLOC, dao.address
    );
    await vault.waitForDeployment();

    // DAO pauses claims
    await vault.connect(dao).pauseClaims(true);
    assert.equal(await vault.claimsPaused(), true);
  });

  it("DAO can call emergencyFreeze", async () => {
    const { ethers } = await network.connect();
    const [deployer, bene, dao] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    const vaultHub = await TokenStub.deploy();
    await token.waitForDeployment();
    await vaultHub.waitForDeployment();

    const EXPECTED_ALLOC = 50_000_000n * 10n ** 18n;
    const DRVV = await ethers.getContractFactory("DevReserveVestingVault");
    const vault = await DRVV.deploy(
      await token.getAddress(), bene.address, await vaultHub.getAddress(),
      ethers.ZeroAddress,
      EXPECTED_ALLOC, dao.address
    );
    await vault.waitForDeployment();

    // DAO calls emergencyFreeze
    await vault.connect(dao).emergencyFreeze();
    assert.equal(await vault.claimsPaused(), true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// H-05: VaultInfrastructure + Execute Whitelist
// ──────────────────────────────────────────────────────────────────────────────
describe("UserVaultLegacy (H-05: execute whitelist)", () => {
  it("blocks execute to non-whitelisted targets by default", async () => {
    const { ethers } = await network.connect();
    const [hubAddr, owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const hubContract = await Placeholder.deploy();
    await hubContract.waitForDeployment();

    const Vault = await ethers.getContractFactory("UserVaultLegacy");
    const vault = await Vault.deploy(
      await hubContract.getAddress(), await token.getAddress(), owner.address,
      ethers.ZeroAddress
    );
    await vault.waitForDeployment();

    assert.equal(await vault.executeWhitelistEnforced(), true);

    await assert.rejects(
      async () => {
        await vault.connect(owner).execute(hubAddr.address, 0, "0x");
      },
      /UV:target-not-whitelisted/
    );
  });

  it("enforces execute whitelist when enabled", async () => {
    const { ethers } = await network.connect();
    const [hubAddr, owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const hubContract = await Placeholder.deploy();
    await hubContract.waitForDeployment();

    const Vault = await ethers.getContractFactory("UserVaultLegacy");
    const vault = await Vault.deploy(
      await hubContract.getAddress(), await token.getAddress(), owner.address,
      ethers.ZeroAddress
    );
    await vault.waitForDeployment();

    // Owner adds target to whitelist
    await vault.connect(owner).setAllowedTarget(hubAddr.address, true);
    assert.equal(await vault.allowedExecuteTarget(hubAddr.address), true);

    await vault.connect(owner).execute(hubAddr.address, 0, "0x");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// M-25: VFIDESecurity + PanicGuard Vault Registration Check
// ──────────────────────────────────────────────────────────────────────────────
describe("PanicGuard (M-25: vault registration check)", () => {
  it("selfPanic reverts if vault not registered", async () => {
    const { ethers } = await network.connect();
    const [dao, user] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory("VaultHubStub");
    const hubStub = await VaultHubStub.deploy();
    await hubStub.waitForDeployment();

    const PanicGuard = await ethers.getContractFactory("PanicGuard");
    const panicGuard = await PanicGuard.deploy(dao.address, ethers.ZeroAddress, await hubStub.getAddress());
    await panicGuard.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const fakeVault = await Placeholder.deploy();
    await fakeVault.waitForDeployment();

    // Wire hub: user → vault
    await hubStub.setVault(user.address, await fakeVault.getAddress());

    // selfPanic must revert — vault not registered
    await assert.rejects(
      async () => {
        await panicGuard.connect(user).selfPanic(1 * 24 * 60 * 60);
      },
      /revert/
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// M-18: Seer + Circular Delta Guard
// ──────────────────────────────────────────────────────────────────────────────
describe("Seer (M-18: circular delta guard)", () => {
  it("setScore works and caches score", async () => {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao, user] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    // DAO can only change by maxDAOScoreChange (500) per call.
    const baseline = await seer.getScore(user.address);
    const target = Number(baseline) + 500;
    await seer.connect(dao).setScore(user.address, target, "initial");
    assert.equal(await seer.getScore(user.address), BigInt(target));
  });

  it("operator can reward user", async () => {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao, operator, user] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    // Set operator
    await seer.connect(dao).setOperator(operator.address, true);

    // Set initial score
    await seer.connect(dao).setScore(user.address, 5000, "init");

    // Operator rewards
    await seer.connect(operator).reward(user.address, 100n, "good");
    assert.equal(await seer.getScore(user.address), 5100n);
  });

  it("pushes score snapshots to BurnRouter on DAO score updates", async () => {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao, user, sanctum, burn, eco] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      eco.address,
    );
    await router.waitForDeployment();

    await seer.connect(dao).setBurnRouter(await router.getAddress());

    const baseline = await seer.getScore(user.address);
    const target = Number(baseline) + 500;
    await seer.connect(dao).setScore(user.address, target, "sync-check");

    const updatedAt = await router.lastScoreUpdate(user.address);
    const snapshot = await router.scoreHistory(user.address, 0);
    assert.ok(updatedAt > 0n);
    assert.equal(snapshot[0], BigInt(target));
  });

  it("does not punish again when auto restriction is triggered by low score", async () => {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao, operator, user] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const SeerAutonomous = await ethers.getContractFactory("SeerAutonomous");
    const autonomous = await SeerAutonomous.deploy(dao.address, await seer.getAddress(), ethers.ZeroAddress);
    await autonomous.waitForDeployment();

    await autonomous.connect(dao).setOperator(operator.address, true);
    await seer.connect(dao).setOperator(operator.address, true);

    // Bring score down to 2900 without relying on DAO cooldown windows.
    let current = await seer.getScore(user.address);
    while (current > 2900n) {
      const delta = current - 2900n > 100n ? 100n : current - 2900n;
      await seer.connect(operator).punish(user.address, delta, "seed-low");
      current = await seer.getScore(user.address);
    }
    const scoreBefore = await seer.getScore(user.address);

    await autonomous.connect(operator).onScoreChange(user.address, 3900, 2900);

    const scoreAfter = await seer.getScore(user.address);
    const restriction = await autonomous.restrictionLevel(user.address);
    const pending = await autonomous.pendingChallenge(user.address);

    assert.ok(scoreBefore <= 2900n);
    assert.equal(scoreAfter, scoreBefore);
    if (restriction === 0n) {
      // Severe low-score paths now open a challenge window before applying the restriction.
      assert.equal(pending[3], true);
      assert.ok(pending[1] >= 3n);
    } else {
      assert.ok(restriction >= 3n);
    }
  });

  it("does not reduce Seer score when pattern escalation reaches restricted", async () => {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao, operator, user, counterparty] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const SeerAutonomous = await ethers.getContractFactory("SeerAutonomous");
    const autonomous = await SeerAutonomous.deploy(dao.address, await seer.getAddress(), ethers.ZeroAddress);
    await autonomous.waitForDeployment();

    await autonomous.connect(dao).setOperator(operator.address, true);
    // Keep score above restrict threshold but below auto-lift threshold so pattern restriction persists.
    await seer.connect(dao).setScore(user.address, 4500, "stable");

    const scoreBefore = await seer.getScore(user.address);

    // Default sensitivity (50) flags rapid transfers once count exceeds threshold.
    // Repeating transfer actions escalates violations to Restricted.
    for (let i = 0; i < 16; i++) {
      await autonomous.connect(operator).beforeAction(user.address, 0, 1n, counterparty.address);
    }

    const scoreAfter = await seer.getScore(user.address);
    const restriction = await autonomous.restrictionLevel(user.address);

    assert.equal(restriction, 3n);
    assert.equal(scoreAfter, scoreBefore);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// L-08: VFIDEAccessControl + Atomic Admin Transfer
// ──────────────────────────────────────────────────────────────────────────────
describe("VFIDEAccessControl (L-08: atomic admin transfer)", () => {
  it("transfers DEFAULT_ADMIN_ROLE atomically", async () => {
    const { ethers } = await network.connect();
    const [initialAdmin, newAdmin] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("VFIDEAccessControl");
    const ac = await AccessControl.deploy(initialAdmin.address);
    await ac.waitForDeployment();

    const DEFAULT_ADMIN_ROLE = await ac.DEFAULT_ADMIN_ROLE();
    assert.equal(await ac.hasRole(DEFAULT_ADMIN_ROLE, initialAdmin.address), true);

    // Transfer admin
    await ac.connect(initialAdmin).transferAdminRole(newAdmin.address);

    // Check roles switched
    assert.equal(await ac.hasRole(DEFAULT_ADMIN_ROLE, initialAdmin.address), false);
    assert.equal(await ac.hasRole(DEFAULT_ADMIN_ROLE, newAdmin.address), true);
  });

  it("new admin can grant roles immediately after transfer", async () => {
    const { ethers } = await network.connect();
    const [initialAdmin, newAdmin, other] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("VFIDEAccessControl");
    const ac = await AccessControl.deploy(initialAdmin.address);
    await ac.waitForDeployment();

    // Transfer admin
    await ac.connect(initialAdmin).transferAdminRole(newAdmin.address);

    // New admin grants role immediately
    const TREASURY_MANAGER_ROLE = await ac.TREASURY_MANAGER_ROLE();
    await ac.connect(newAdmin).grantRole(TREASURY_MANAGER_ROLE, other.address);
    assert.equal(await ac.hasRole(TREASURY_MANAGER_ROLE, other.address), true);
  });
});

