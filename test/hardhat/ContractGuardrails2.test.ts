import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

// ─────────────────────────────────────────────────────────────────────────────
// F-27: BurnRouter fee policy rate-of-change limit
// setFeePolicy enforces a 1-day cooldown between changes and a 2× cap on
// maxTotalBps increase, preventing instant value-extraction fee spikes.
// ─────────────────────────────────────────────────────────────────────────────
describe("ProofScoreBurnRouter (F-27: fee policy cooldown & rate-of-change)", () => {
  async function deployRouter() {
    const { ethers } = await network.connect();
    const [owner, , sanctum, burn, eco] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      eco.address,
    );
    await router.waitForDeployment();
    return { ethers, router, owner };
  }

  it("second setFeePolicy call reverts within 1-day cooldown", async () => {
    const { router, owner } = await deployRouter();

    // First call succeeds (no prior change yet, lastFeePolicyChange = 0)
    await router.connect(owner).setFeePolicy(25, 500);

    // Immediate second call must revert — cooldown not elapsed
    await assert.rejects(
      () => router.connect(owner).setFeePolicy(30, 600),
      /fee policy cooldown active/
    );
  });

  it("setFeePolicy succeeds after 1-day cooldown elapses", async () => {
    const { ethers, router, owner } = await deployRouter();

    await router.connect(owner).setFeePolicy(25, 500);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await router.connect(owner).setFeePolicy(30, 600);
    assert.equal(await router.maxTotalBps(), 600n);
  });

  it("setFeePolicy reverts when maxTotalBps would exceed 2× the current value", async () => {
    const { ethers, router, owner } = await deployRouter();

    // Establish a baseline so the rate-of-change guard is active (maxTotalBps > 0)
    await router.connect(owner).setFeePolicy(25, 500); // baseline: max=500

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    // 500 * 2 = 1000 is the allowed ceiling; 1001 must revert
    await assert.rejects(
      () => router.connect(owner).setFeePolicy(25, 1001),
      /max cannot exceed 10%|BURN: max increase >2x/
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F-21: DAO emergency quorum rescue 10% floor
// executeEmergencyQuorumRescue must reject a new minVotesRequired that is
// less than 10% of the current value.
// ─────────────────────────────────────────────────────────────────────────────
describe("DAO (F-21: emergency quorum rescue 10% floor)", () => {
  async function deployDAO() {
    const { ethers } = await network.connect();
    const [admin, approver] = await ethers.getSigners();

    // Minimal timelock stub that satisfies extcodesize > 0
    const Placeholder = await ethers.getContractFactory("Placeholder");
    const timelock = await Placeholder.deploy();
    await timelock.waitForDeployment();

    // Seer and VaultHub stubs pass all zero-address guards in the DAO constructor
    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const VaultHubStub = await ethers.getContractFactory("VaultHubStub");
    const hub = await VaultHubStub.deploy();
    await hub.waitForDeployment();

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(
      admin.address,
      await timelock.getAddress(),
      await seer.getAddress(),
      await hub.getAddress(),
      ethers.ZeroAddress, // no hooks
    );
    await dao.waitForDeployment();

    // Set up emergency approver so dual-sign-off works
    // The DAO requires onlyTimelock for setEmergencyApprover — impersonate the timelock
    const timelockAddr = await timelock.getAddress();
    await ethers.provider.send("hardhat_setBalance", [timelockAddr, "0x3635C9ADC5DEA00000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [timelockAddr]);
    const timelockSigner = await ethers.getSigner(timelockAddr);
    await dao.connect(timelockSigner).setEmergencyApprover(approver.address);
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [timelockAddr]);

    return { ethers, dao, admin, approver };
  }

  async function initiateAndApproveRescue(
    ethers: Awaited<ReturnType<typeof deployDAO>>["ethers"],
    dao: Awaited<ReturnType<typeof deployDAO>>["dao"],
    admin: Awaited<ReturnType<typeof deployDAO>>["admin"],
    approver: Awaited<ReturnType<typeof deployDAO>>["approver"],
  ) {
    await dao.connect(admin).initiateEmergencyQuorumRescue();
    await dao.connect(approver).approveEmergencyQuorumRescue();
    // Advance 14 days (EMERGENCY_RESCUE_DELAY)
    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
  }

  it("reverts when new minVotesRequired is below 10% of current", async () => {
    const { ethers, dao, admin, approver } = await deployDAO();
    await initiateAndApproveRescue(ethers, dao, admin, approver);

    const current = await dao.minVotesRequired(); // 5000
    // 10% floor = 500; try to set 499 which is just below the floor
    const tooLow = current / 10n - 1n; // 499

    await assert.rejects(
      () => dao.connect(admin).executeEmergencyQuorumRescue(tooLow, 3n),
      /quorum too low/
    );
  });

  it("permits new minVotesRequired at exactly 10% of current", async () => {
    const { ethers, dao, admin, approver } = await deployDAO();
    await initiateAndApproveRescue(ethers, dao, admin, approver);

    const current = await dao.minVotesRequired(); // 5000
    const floor = current / 10n; // 500 — exactly ABSOLUTE_MIN_QUORUM

    await dao.connect(admin).executeEmergencyQuorumRescue(floor, 3n);
    assert.equal(await dao.minVotesRequired(), floor);
  });

  it("rejects emergency rescue self-approval by initiator", async () => {
    const { dao, admin } = await deployDAO();

    await dao.connect(admin).initiateEmergencyQuorumRescue();

    await assert.rejects(
      () => dao.connect(admin).approveEmergencyQuorumRescue(),
      /initiator cannot self-approve/
    );
  });

  it("rejects emergency timelock replacement self-approval by initiator", async () => {
    const { dao, admin } = await deployDAO();

    // Any non-zero address works as replacement candidate for this guard test.
    await dao.connect(admin).proposeEmergencyTimelockReplacement(admin.address);

    await assert.rejects(
      () => dao.connect(admin).approveEmergencyTimelockReplacement(),
      /initiator cannot self-approve/
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F-18: EscrowManager minimum lock period ≥ 3 days
// Even for the highest-trust merchants the lock period must be at least 3 days.
// ─────────────────────────────────────────────────────────────────────────────
describe("EscrowManager (F-18: minimum lock period)", () => {
  async function deployEscrow() {
    const { ethers } = await network.connect();
    const [arbiter, buyer, merchant] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const Escrow = await ethers.getContractFactory("EscrowManager");
    const escrow = await Escrow.deploy(arbiter.address, await seer.getAddress());
    await escrow.waitForDeployment();

    const Token = await ethers.getContractFactory("TokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    return { ethers, escrow, seer, token, buyer, merchant };
  }

  it("high-trust merchant (score 9000) gets exactly 3-day lock", async () => {
    const { escrow, seer, token, buyer, merchant } = await deployEscrow();

    // Set merchant score above highTrustThreshold (8000) so code takes the 3-day branch
    await seer.setScore(merchant.address, 9000);

    const tx = await escrow
      .connect(buyer)
      .createEscrow(merchant.address, await token.getAddress(), 1000n, "order-1");
    const receipt = await tx.wait();

    const id = 1n;
    const e = await escrow.escrows(id);
    const lockPeriod = e.releaseTime - e.createdAt;
    const threeDays = 3n * 24n * 60n * 60n;

    assert.equal(lockPeriod, threeDays, "high-trust lock should be exactly 3 days");
  });

  it("zero-score (untrusted) merchant gets 14-day default lock", async () => {
    const { escrow, token, buyer, merchant } = await deployEscrow();
    // score defaults to 0 — takes the default 14-day branch

    await escrow
      .connect(buyer)
      .createEscrow(merchant.address, await token.getAddress(), 1000n, "order-2");

    const e = await escrow.escrows(1n);
    const lockPeriod = e.releaseTime - e.createdAt;
    const fourteenDays = 14n * 24n * 60n * 60n;

    assert.equal(lockPeriod, fourteenDays, "low-trust lock should be 14 days");
  });

  it("MIN_LOCK_PERIOD constant is exactly 3 days", async () => {
    const { escrow } = await deployEscrow();
    const threeDays = 3n * 24n * 60n * 60n;
    assert.equal(await escrow.MIN_LOCK_PERIOD(), threeDays);
  });
});
