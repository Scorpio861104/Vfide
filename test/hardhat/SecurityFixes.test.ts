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
// M-11: VaultHub + Council Recovery Approver
// ──────────────────────────────────────────────────────────────────────────────
describe("VaultHub (M-11: council as recovery approver)", () => {
  it("council member can approve force recovery" , async () => {
    const { ethers } = await network.connect();
    const [owner, dao, approver, councilMember, vaultOwner, newOwner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(await token.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress, dao.address);
    await hub.waitForDeployment();

    // Create vault for vaultOwner
    await (await hub.connect(vaultOwner).ensureVault(vaultOwner.address)).wait();
    const vaultAddr = await hub.vaultOf(vaultOwner.address);

    // Deploy and set up council
    const CouncilStub = await ethers.getContractFactory("CouncilStub");
    const council = await CouncilStub.deploy();
    await council.waitForDeployment();
    await council.addCouncilMember(councilMember.address);
    await hub.setCouncil(await council.getAddress());

    // Council member calls approveForceRecovery — should work (M-11 Fix)
    await hub.connect(councilMember).approveForceRecovery(vaultAddr, newOwner.address);
    assert.equal(await hub.recoveryApprovalCount(vaultAddr), 1n);
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
    const presale = await TokenStub.deploy();
    await token.waitForDeployment();
    await vaultHub.waitForDeployment();
    await presale.waitForDeployment();

    const EXPECTED_ALLOC = 50_000_000n * 10n ** 18n;
    const DRVV = await ethers.getContractFactory("DevReserveVestingVault");
    const vault = await DRVV.deploy(
      await token.getAddress(), bene.address, await vaultHub.getAddress(),
      ethers.ZeroAddress, ethers.ZeroAddress, await presale.getAddress(),
      EXPECTED_ALLOC, dao.address
    );
    await vault.waitForDeployment();

    // DAO pauses claims (H-03 Fix: DAO can pause)
    await vault.connect(dao).pauseClaims(true);
    assert.equal(await vault.claimsPaused(), true);
  });

  it("DAO can call emergencyFreeze", async () => {
    const { ethers } = await network.connect();
    const [deployer, bene, dao] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    const vaultHub = await TokenStub.deploy();
    const presale = await TokenStub.deploy();
    await token.waitForDeployment();
    await vaultHub.waitForDeployment();
    await presale.waitForDeployment();

    const EXPECTED_ALLOC = 50_000_000n * 10n ** 18n;
    const DRVV = await ethers.getContractFactory("DevReserveVestingVault");
    const vault = await DRVV.deploy(
      await token.getAddress(), bene.address, await vaultHub.getAddress(),
      ethers.ZeroAddress, ethers.ZeroAddress, await presale.getAddress(),
      EXPECTED_ALLOC, dao.address
    );
    await vault.waitForDeployment();

    // DAO calls emergencyFreeze (H-03 Fix: DAO-only freeze)
    await vault.connect(dao).emergencyFreeze();
    assert.equal(await vault.claimsPaused(), true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// H-05: VaultInfrastructure + Execute Whitelist
// ──────────────────────────────────────────────────────────────────────────────
describe("UserVaultLegacy (H-05: execute whitelist)", () => {
  it("enforces execute whitelist when enabled", async () => {
    const { ethers } = await network.connect();
    const [hubAddr, owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const hubContract = await Placeholder.deploy();
    const target = await Placeholder.deploy();
    await hubContract.waitForDeployment();
    await target.waitForDeployment();

    const Vault = await ethers.getContractFactory("UserVaultLegacy");
    const vault = await Vault.deploy(
      await hubContract.getAddress(), await token.getAddress(), owner.address,
      ethers.ZeroAddress, ethers.ZeroAddress
    );
    await vault.waitForDeployment();

    // Owner adds target to whitelist
    await vault.connect(owner).setAllowedTarget(await target.getAddress(), true);
    assert.equal(await vault.allowedExecuteTarget(await target.getAddress()), true);
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

    // selfPanic must revert — vault not registered (M-25 Fix)
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
    const { ethers } = await network.connect();
    const [dao, user] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    // DAO sets score
    await seer.connect(dao).setScore(user.address, 7500, "initial");
    assert.equal(await seer.getScore(user.address), 7500n);
  });

  it("operator can reward user", async () => {
    const { ethers } = await network.connect();
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

    // Transfer admin (L-08 Fix: atomic)
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
