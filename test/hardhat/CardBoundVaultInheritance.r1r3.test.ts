/**
 * Tests for R-1 (guardian-quorum cancel) and R-3 (DAO initiation block).
 *
 * These were documented as residual risks in
 * VFIDE_INHERITANCE_THREAT_MODEL.md Part 9. R-1 is now implemented as
 * `cancelInheritanceConfigChangeByGuardians`; R-3 as `setDAOGuardian` +
 * a check in `initiateInheritanceClaim`. This file exercises both.
 *
 * Tests:
 *   - R-3 / T-24: DAO guardian cannot initiate but can veto
 *   - R-3 setter: set / replace / clear works
 *   - R-1: single vote does not cancel below threshold
 *   - R-1: M-of-N votes clear pending state
 *   - R-1: double-vote reverts
 *   - R-1: vote when no pending proposal reverts
 *   - R-1: vote from non-guardian reverts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

function encodeInheritanceCommitment(
  ethers: any,
  chainId: bigint,
  vault: string,
  configVersion: bigint,
  heir: string,
  basisPoints: bigint,
  secret: string,
) {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const domain = ethers.keccak256(ethers.toUtf8Bytes("VFIDE_INHERITANCE_V1"));
  const encoded = abi.encode(
    ["bytes32", "uint256", "address", "uint64", "address", "uint256", "bytes32"],
    [domain, chainId, vault, configVersion, heir, basisPoints, secret],
  );
  return ethers.keccak256(encoded);
}

async function deployFixture(numGuardians = 1, threshold = 1) {
  const { ethers, networkHelpers } = (await getConnection()) as any;
  const signers = await ethers.getSigners();
  const owner = signers[2];
  const heir1 = signers[3];
  const guardian2 = signers[4];
  const guardian3 = signers[5];
  const guardian4 = signers[6];
  const daoGuardian = signers[7];
  const external = signers[8];

  const Token = await ethers.getContractFactory(
    "test/contracts/helpers/Stubs.sol:MintableTokenStub",
  );
  const token = await Token.deploy();
  await token.waitForDeployment();

  const Hub = await ethers.getContractFactory(
    "test/contracts/helpers/Stubs.sol:VaultHubStub",
  );
  const hub = await Hub.deploy();
  await hub.waitForDeployment();

  const Vault = await ethers.getContractFactory("CardBoundVault");
  const vault = await Vault.deploy(
    await hub.getAddress(),
    await token.getAddress(),
    owner.address,
    owner.address,
    [owner.address],
    1,
    ethers.parseEther("1000"),
    ethers.parseEther("10000"),
    ethers.ZeroAddress,
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  await hub.setVault(owner.address, vaultAddr);

  const Manager = await ethers.getContractFactory(
    "CardBoundVaultInheritanceManager",
  );
  const manager = await Manager.deploy(vaultAddr);
  await manager.waitForDeployment();
  await vault.connect(owner).setInheritanceManager(await manager.getAddress());

  await vault.connect(owner).setGuardian(heir1.address, true);
  if (numGuardians >= 2) await vault.connect(owner).setGuardian(guardian2.address, true);
  if (numGuardians >= 3) await vault.connect(owner).setGuardian(guardian3.address, true);
  if (numGuardians >= 4) await vault.connect(owner).setGuardian(guardian4.address, true);
  if (threshold > 1) await vault.connect(owner).setGuardianThreshold(threshold);

  const chainId = (await ethers.provider.getNetwork()).chainId;

  return {
    ethers,
    networkHelpers,
    owner,
    heir1,
    guardian2,
    guardian3,
    guardian4,
    daoGuardian,
    external,
    token,
    hub,
    vault,
    manager,
    vaultAddr,
    chainId,
  };
}

async function proposeConfig(
  f: Awaited<ReturnType<typeof deployFixture>>,
  heir: { address: string },
  salt: string,
) {
  const configVersion = (await f.vault.inheritanceConfigVersion()) + 1n;
  const secret = f.ethers.keccak256(f.ethers.toUtf8Bytes(salt));
  const commitment = encodeInheritanceCommitment(
    f.ethers,
    f.chainId,
    f.vaultAddr,
    configVersion,
    heir.address,
    10_000n,
    secret,
  );
  await f.vault
    .connect(f.owner)
    .proposeInheritanceConfig([heir.address], [commitment]);
  return { configVersion, secret, commitment };
}

async function expectRevert(promise: Promise<unknown>, hint?: string) {
  await assert.rejects(promise, (err) => {
    if (!(err instanceof Error)) return false;
    if (hint) return err.message.includes(hint);
    return /revert|VM Exception|execution reverted/i.test(err.message);
  });
}

describe("Inheritance — R-1 + R-3 residual fixes", { concurrency: 1 }, () => {
  // ── R-3 — DAO initiation block ──────────────────────────────────────────

  it("R-3 setter: setDAOGuardian writes and emits, supports clear", async () => {
    const f = await deployFixture();
    // Initially zero.
    let dao = await f.manager.daoGuardian();
    assert.equal(dao, f.ethers.ZeroAddress);

    // Set to daoGuardian. Should emit DAOGuardianSet(zero, dao).
    const tx = await f.vault.connect(f.owner).setDAOGuardian(f.daoGuardian.address);
    const receipt = await tx.wait();
    dao = await f.manager.daoGuardian();
    assert.equal(dao, f.daoGuardian.address);
    const event = receipt.logs.find((l: any) => {
      try {
        return f.manager.interface.parseLog(l)?.name === "DAOGuardianSet";
      } catch { return false; }
    });
    assert.ok(event, "DAOGuardianSet event expected");

    // Replace with a different address.
    await f.vault.connect(f.owner).setDAOGuardian(f.guardian2.address);
    dao = await f.manager.daoGuardian();
    assert.equal(dao, f.guardian2.address);

    // Clear back to zero.
    await f.vault.connect(f.owner).setDAOGuardian(f.ethers.ZeroAddress);
    dao = await f.manager.daoGuardian();
    assert.equal(dao, f.ethers.ZeroAddress);
  });

  it("R-3 setter: non-admin cannot set DAO guardian", async () => {
    const f = await deployFixture();
    await expectRevert(
      f.vault.connect(f.external).setDAOGuardian(f.daoGuardian.address),
    );
  });

  it("T-24 / R-3: DAO guardian cannot initiate inheritance claim", async () => {
    const f = await deployFixture(2);
    // Make daoGuardian an actual guardian on the vault (it is, per setup).
    await f.vault.connect(f.owner).setGuardian(f.daoGuardian.address, true);
    // Register them as the DAO guardian.
    await f.vault.connect(f.owner).setDAOGuardian(f.daoGuardian.address);
    // Configure inheritance.
    const { secret } = await proposeConfig(f, f.heir1, "r3-init");
    await f.networkHelpers.time.increase(30 * 24 * 60 * 60 + 5);
    await f.vault.connect(f.owner).confirmInheritanceConfig();

    // DAO guardian tries to initiate — should revert (INH_DAOCannotInitiate).
    await expectRevert(
      f.vault
        .connect(f.daoGuardian)
        .initiateInheritanceClaim(
          f.ethers.keccak256(f.ethers.toUtf8Bytes("dao-init")),
        ),
    );
    // Sanity: heir1 (a regular guardian) can still initiate.
    await f.vault
      .connect(f.heir1)
      .initiateInheritanceClaim(
        f.ethers.keccak256(f.ethers.toUtf8Bytes("regular-init")),
      );
    const st = await f.vault.inheritanceState();
    assert.equal(Number(st[0]), 1); // VETO_PERIOD
    // Sanity 2: DAO guardian CAN veto.
    await f.vault.connect(f.daoGuardian).vetoInheritanceClaim();
    const vetoCount = await f.manager.vetoCount();
    assert.equal(vetoCount, 1n);
  });

  it("R-3: when daoGuardian is unset (zero), the check is a no-op", async () => {
    const f = await deployFixture();
    // daoGuardian is zero by default. heir1 (a guardian) should initiate fine.
    await proposeConfig(f, f.heir1, "r3-noop");
    await f.networkHelpers.time.increase(30 * 24 * 60 * 60 + 5);
    await f.vault.connect(f.owner).confirmInheritanceConfig();
    await f.vault
      .connect(f.heir1)
      .initiateInheritanceClaim(
        f.ethers.keccak256(f.ethers.toUtf8Bytes("noop")),
      );
    const st = await f.vault.inheritanceState();
    assert.equal(Number(st[0]), 1);
  });

  // ── R-1 — Guardian-quorum cancel of pending config ──────────────────────

  it("R-1: single vote does not clear pending when threshold > 1", async () => {
    const f = await deployFixture(3, 2); // threshold 2
    await proposeConfig(f, f.heir1, "r1-single");

    // One guardian vote.
    await f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians();
    const pendingHeirCount = await f.manager.pendingHeirCount();
    assert.equal(pendingHeirCount, 1, "pending state still present after 1 vote when threshold = 2");
    const pendingVersion = await f.manager.pendingConfigVersion();
    const votes = await f.manager.cancelVotesByPendingVersion(pendingVersion);
    assert.equal(votes, 1n);
  });

  it("R-1: M-of-N votes clear pending state + emit cancellation", async () => {
    const f = await deployFixture(3, 2);
    await proposeConfig(f, f.heir1, "r1-quorum");

    await f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians();
    // The second vote reaches threshold and clears.
    const tx = await f.vault.connect(f.guardian3).cancelInheritanceConfigChangeByGuardians();
    const receipt = await tx.wait();
    const cancelledByGuardians = receipt.logs.find((l: any) => {
      try {
        return f.manager.interface.parseLog(l)?.name === "PendingConfigCancelledByGuardians";
      } catch { return false; }
    });
    assert.ok(cancelledByGuardians, "PendingConfigCancelledByGuardians event expected");
    const generalCancelled = receipt.logs.find((l: any) => {
      try {
        return f.manager.interface.parseLog(l)?.name === "InheritanceConfigCancelled";
      } catch { return false; }
    });
    assert.ok(generalCancelled, "InheritanceConfigCancelled event also expected");

    // Pending state is gone.
    const pendingHeirCount = await f.manager.pendingHeirCount();
    assert.equal(pendingHeirCount, 0);
    const pendingEffectiveAt = await f.manager.pendingHeirConfigEffectiveAt();
    assert.equal(pendingEffectiveAt, 0n);
  });

  it("R-1: double-vote from same guardian reverts", async () => {
    const f = await deployFixture(3, 2);
    await proposeConfig(f, f.heir1, "r1-double");
    await f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians();
    await expectRevert(
      f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians(),
    );
  });

  it("R-1: vote with no pending proposal reverts", async () => {
    const f = await deployFixture(3, 2);
    // No propose() called — should revert with INH_NoPendingConfig.
    await expectRevert(
      f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians(),
    );
  });

  it("R-1: non-guardian cannot vote to cancel", async () => {
    const f = await deployFixture(3, 2);
    await proposeConfig(f, f.heir1, "r1-nonguardian");
    await expectRevert(
      f.vault.connect(f.external).cancelInheritanceConfigChangeByGuardians(),
    );
  });

  it("R-1: after quorum cancel, owner can propose a fresh config", async () => {
    const f = await deployFixture(3, 2);
    await proposeConfig(f, f.heir1, "r1-after-1");
    await f.vault.connect(f.guardian2).cancelInheritanceConfigChangeByGuardians();
    await f.vault.connect(f.guardian3).cancelInheritanceConfigChangeByGuardians();
    // Now propose a brand new config — should succeed cleanly.
    await proposeConfig(f, f.heir1, "r1-after-2");
    const pending = await f.manager.pendingHeirCount();
    assert.equal(pending, 1);
  });
});
