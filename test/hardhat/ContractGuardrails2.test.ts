import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { expectHardhatRevert } from "./utils/expectHardhatRevert";

// ─────────────────────────────────────────────────────────────────────────────
// F-27: BurnRouter fee policy rate-of-change limit
// setFeePolicy enforces a 1-day cooldown between changes and a 2× cap on
// maxTotalBps increase, preventing instant value-extraction fee spikes.
// ─────────────────────────────────────────────────────────────────────────────
describe("ProofScoreBurnRouter (F-27: fee policy cooldown & rate-of-change)", () => {
  async function deployRouter() {
    const { ethers } = (await network.connect()) as any;
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
    await expectHardhatRevert(
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
    await expectHardhatRevert(
      () => router.connect(owner).setFeePolicy(25, 1001),
      /max cannot exceed 10%|BURN: max increase >2x/
    );
  });

  it("rejects legacy setModules path and requires propose/apply flow", async () => {
    const { router, owner, ethers } = await deployRouter();
    const [, , sanctum, burn, eco] = await ethers.getSigners();

    await expectHardhatRevert(
      () => router.connect(owner).setModules(owner.address, sanctum.address, burn.address, eco.address),
      /use proposeModules\/applyModules/
    );
  });

  it("computeFeesAndReserve matches computeFees for the same inputs", async () => {
    const { router, owner, ethers } = await deployRouter();
    const [, user] = await ethers.getSigners();

    await router.connect(owner).setToken(owner.address);
    await router.connect(owner).setSustainability(0n, 0n, 5);

    const amount = 1_000n * 10n ** 18n;
    const quoted = await router.computeFees(owner.address, user.address, amount);
    const reserved = await router.connect(owner).computeFeesAndReserve.staticCall(owner.address, user.address, amount);

    assert.deepEqual([...reserved], [...quoted]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OwnerControlPanel governance delay hardening
// Delay reductions are capped (50% per step) and now rate-limited over time.
// ─────────────────────────────────────────────────────────────────────────────
describe("OwnerControlPanel (governance delay reduction cooldown)", () => {
  async function deployPanel() {
    const { ethers } = (await network.connect({ override: { allowUnlimitedContractSize: true } })) as any;
    const [owner] = await ethers.getSigners();

    const Panel = await ethers.getContractFactory("OwnerControlPanel");
    const panel = await Panel.deploy(
      owner.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
    );
    await panel.waitForDeployment();

    return { ethers, owner, panel };
  }

  async function queueAndExecuteDelay(
    ethers: any,
    panel: any,
    owner: any,
    newDelay: bigint,
  ) {
    const actionId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["string", "uint256"], ["governance_setDelay", newDelay]),
    );
    await panel.connect(owner).governance_queueAction(actionId);
    const eta = await panel.queuedActionEta(actionId);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    await ethers.provider.send("evm_increaseTime", [Number(eta - now + 1n)]);
    await ethers.provider.send("evm_mine", []);
    await panel.connect(owner).governance_setDelay(newDelay);
  }

  it("allows a first reduction but blocks a second reduction inside cooldown window", async () => {
    const { ethers, owner, panel } = await deployPanel();

    // Raise from 1d -> 4d first (non-reduction path)
    await queueAndExecuteDelay(ethers, panel, owner, 4n * 24n * 60n * 60n);
    assert.equal(await panel.governanceDelay(), 4n * 24n * 60n * 60n);

    // First reduction (allowed): 4d -> 2d
    await queueAndExecuteDelay(ethers, panel, owner, 2n * 24n * 60n * 60n);
    assert.equal(await panel.governanceDelay(), 2n * 24n * 60n * 60n);

    // Second reduction attempt inside cooldown: 2d -> 1d should revert
    const nextDelay = 1n * 24n * 60n * 60n;
    const actionId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["string", "uint256"], ["governance_setDelay", nextDelay]),
    );
    await panel.connect(owner).governance_queueAction(actionId);

    const eta = await panel.queuedActionEta(actionId);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    await ethers.provider.send("evm_increaseTime", [Number(eta - now + 1n)]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => panel.connect(owner).governance_setDelay(nextDelay),
      /[Rr]evert|cooldown/
    );
    assert.equal(await panel.governanceDelay(), 2n * 24n * 60n * 60n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F-21: DAO emergency quorum rescue 10% floor
// executeEmergencyQuorumRescue must reject a new minVotesRequired that is
// less than 10% of the current value.
// ─────────────────────────────────────────────────────────────────────────────
describe("DAO (F-21: emergency quorum rescue 10% floor)", () => {
  async function deployDAOWithoutApprover() {
    const { ethers } = (await network.connect()) as any;
    const [admin] = await ethers.getSigners();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const timelock = await Placeholder.deploy();
    await timelock.waitForDeployment();

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
      ethers.ZeroAddress,
    );
    await dao.waitForDeployment();

    return { ethers, dao, admin, timelock };
  }

  async function deployDAO() {
    const { ethers } = (await network.connect()) as any;
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

    return { ethers, dao, admin, approver, seer, hub, timelock };
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

    await expectHardhatRevert(
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
      /initiator cannot self-approve|revert/
    );
  });

  it("rejects emergency timelock replacement self-approval by initiator", async () => {
    const { dao, admin } = await deployDAO();

    // Any non-zero address works as replacement candidate for this guard test.
    await dao.connect(admin).proposeEmergencyTimelockReplacement(admin.address);

    await expectHardhatRevert(
      () => dao.connect(admin).approveEmergencyTimelockReplacement(),
      /initiator cannot self-approve/
    );
  });

  it("rejects rescue self-approval even when the emergency approver is a contract", async () => {
    const { dao, admin, timelock } = await deployDAOWithoutApprover();

    assert.equal(await dao.emergencyApprover(), await timelock.getAddress());

    await dao.connect(admin).initiateEmergencyQuorumRescue();
    await assert.rejects(
      () => dao.connect(admin).approveEmergencyQuorumRescue(),
      /initiator cannot self-approve|revert/
    );
  });

  it("initializes emergency approver to timelock at deployment", async () => {
    const { dao, admin } = await deployDAOWithoutApprover();
    const timelockAddr = await dao.timelock();

    assert.equal(await dao.emergencyApprover(), timelockAddr);
    await dao.connect(admin).initiateEmergencyQuorumRescue();
  });

  it("counts only active proposals toward the cap", async () => {
    const { ethers, dao, admin, seer, hub, timelock } = await deployDAO();

    await hub.setVault(admin.address, admin.address);
    await seer.setScore(admin.address, 5000);

    await dao.connect(admin).propose(0, await timelock.getAddress(), 0n, "0x", "first-proposal");
    assert.equal(await dao.proposalCount(), 1n);
    assert.equal(await dao.activeProposalCount(), 1n);

    await dao.connect(admin).withdrawProposal(1n);
    assert.equal(await dao.activeProposalCount(), 0n);

    await ethers.provider.send("evm_increaseTime", [60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await dao.connect(admin).propose(0, await timelock.getAddress(), 0n, "0x01", "second-proposal");
    assert.equal(await dao.proposalCount(), 2n);
    assert.equal(await dao.activeProposalCount(), 1n);
  });

  it("allows voting when voter activity is established at least SCORE_SETTLEMENT_WINDOW before proposal", async () => {
    const { ethers, dao, admin, approver, seer, hub, timelock } = await deployDAO();

    // Eligibility requires both a vault and sufficient score.
    await hub.setVault(admin.address, admin.address);
    await hub.setVault(approver.address, approver.address);
    await seer.setScore(admin.address, 5000);
    await seer.setScore(approver.address, 5000);

    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const twoDays = 2n * 24n * 60n * 60n;
    await seer.setActivity(approver.address, Number(now - twoDays - 10n));

    await dao.connect(admin).propose(0, await timelock.getAddress(), 0n, "0x", "dao-05-pass");

    // Wait until voting starts (votingDelay = 1 day)
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await dao.connect(approver).vote(1n, true);
  });

  it("rejects voting when voter activity was updated too close to proposal creation", async () => {
    const { ethers, dao, admin, approver, seer, hub, timelock } = await deployDAO();

    await hub.setVault(admin.address, admin.address);
    await hub.setVault(approver.address, approver.address);
    await seer.setScore(admin.address, 5000);
    await seer.setScore(approver.address, 5000);

    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const oneDay = 1n * 24n * 60n * 60n;
    // Clearly too recent for the 2-day settlement-window requirement.
    await seer.setActivity(approver.address, Number(now - oneDay));

    await dao.connect(admin).propose(0, await timelock.getAddress(), 0n, "0x", "dao-05-fail");

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expectHardhatRevert(
      () => dao.connect(approver).vote(1n, true),
      /score not recently established/
    );
  });

  it("uses the proposal-time score snapshot instead of a post-proposal score increase", async () => {
    const { ethers, dao, admin, approver, seer, hub, timelock } = await deployDAO();

    await hub.setVault(admin.address, admin.address);
    await hub.setVault(approver.address, approver.address);
    await seer.setScore(admin.address, 5000);
    await seer.setScore(approver.address, 2000);

    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    const twoDays = 2n * 24n * 60n * 60n;
    await seer.setActivity(approver.address, Number(now - twoDays - 10n));

    const proposeTx = await dao.connect(admin).propose(0, await timelock.getAddress(), 0n, "0x", "dao-05-snapshot");
    const proposeReceipt = await proposeTx.wait();
    const proposeBlock = await ethers.provider.getBlock(proposeReceipt!.blockNumber);
    await seer.setScoreAt(approver.address, proposeBlock!.timestamp, 2000);

    await seer.setScore(approver.address, 9000);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await dao.connect(approver).vote(1n, true);

    const details = await dao.getProposalDetails(1n);
    assert.equal(details[7], 2000n);
    assert.equal(details[8], 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MerchantPortal scoped pull permit hardening
// Merchant-initiated pulls must respect remaining amount, expiry, and revocation.
// ─────────────────────────────────────────────────────────────────────────────
describe("MerchantPortal (scoped pull permits)", { concurrency: 1 }, () => {
  async function deployPortal() {
    const { ethers } = (await network.connect()) as any;
    const [dao, merchant, customer, feeSink] = await ethers.getSigners();

    const VaultHub = await ethers.getContractFactory("VaultHubStub");
    const hub = await VaultHub.deploy();
    await hub.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerScoreStub");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Token = await ethers.getContractFactory("TokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Portal = await ethers.getContractFactory("MerchantPortal");
    const portal = await Portal.deploy(
      dao.address,
      await hub.getAddress(),
      await seer.getAddress(),
      ethers.ZeroAddress,
      feeSink.address,
    );
    await portal.waitForDeployment();

    await seer.setScore(merchant.address, 7000);
    await portal.connect(dao).setProtocolFee(0);
    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
    await portal.connect(merchant).registerMerchant("Merchant", "Retail");
    await hub.setVault(customer.address, customer.address);
    await hub.setVault(merchant.address, merchant.address);

    return { ethers, portal, token, merchant, customer };
  }

  it("decrements remaining permit amount after each merchant pull", async () => {
    const { portal, token, merchant, customer } = await deployPortal();

    await portal.connect(customer).setMerchantPullPermit(merchant.address, 1000n, 0);
    await portal.connect(merchant).processPayment(customer.address, await token.getAddress(), 400n, "order-1", { gasLimit: 3_000_000n });

    assert.equal(await portal.merchantPullRemaining(customer.address, merchant.address), 600n);
  });

  it("rejects merchant pulls after permit expiry", async () => {
    const { ethers, portal, token, merchant, customer } = await deployPortal();

    const latest = await ethers.provider.getBlock("latest");
    const expiresAt = BigInt((latest?.timestamp ?? 0) + 60);
    await portal.connect(customer).setMerchantPullPermit(merchant.address, 1000n, expiresAt);

    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);

    await expectHardhatRevert(
      async () => portal.connect(merchant).processPayment(customer.address, await token.getAddress(), 100n, "order-expired"),
      /merchant approval expired/
    );
  });

  it("clears permit state on revoke and blocks further pulls", async () => {
    const { portal, token, merchant, customer } = await deployPortal();

    await portal.connect(customer).setMerchantPullPermit(merchant.address, 1000n, 0);
    await portal.connect(customer).setMerchantPullApproval(merchant.address, false);

    assert.equal(await portal.merchantPullApproved(customer.address, merchant.address), false);
    assert.equal(await portal.merchantPullRemaining(customer.address, merchant.address), 0n);
    assert.equal(await portal.merchantPullExpiry(customer.address, merchant.address), 0n);

    await expectHardhatRevert(
      async () => portal.connect(merchant).processPayment(customer.address, await token.getAddress(), 100n, "order-revoked"),
      /merchant not approved by customer/
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F-18: EscrowManager minimum lock period ≥ 3 days
// Even for the highest-trust merchants the lock period must be at least 3 days.
// ─────────────────────────────────────────────────────────────────────────────
describe("EscrowManager (F-18: minimum lock period)", () => {
  async function deployEscrow() {
    const { ethers } = (await network.connect()) as any;
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

    await escrow.connect(arbiter).setTokenWhitelist(await token.getAddress(), true);

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

// ─────────────────────────────────────────────────────────────────────────────
// VaultHub guardian bootstrap hardening
// New vaults should not inherit DAO as default guardian.
// ─────────────────────────────────────────────────────────────────────────────
describe("VaultHub (guardian bootstrap hardening)", () => {
  it("assigns owner as initial guardian and does not assign DAO guardian by default", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      ethers.ZeroAddress,
      dao.address,
    );
    await hub.waitForDeployment();

    await hub.connect(owner).createVault();
    const vaultAddr = await hub.vaultOf(owner.address);
    assert.notEqual(vaultAddr, ethers.ZeroAddress);

    const vault = await ethers.getContractAt("CardBoundVault", vaultAddr);
    assert.equal(await vault.isGuardian(owner.address), true);
    assert.equal(await vault.isGuardian(dao.address), false);
    assert.equal(await vault.guardianCount(), 1n);
  });

  it("blocks vault-to-vault transfers before guardian setup is completed", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, owner, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      ethers.ZeroAddress,
      dao.address,
    );
    await hub.waitForDeployment();

    await hub.connect(owner).createVault();
    await hub.connect(recipient).createVault();

    const vaultAddr = await hub.vaultOf(owner.address);
    const recipientVaultAddr = await hub.vaultOf(recipient.address);
    const vault = await ethers.getContractAt("CardBoundVault", vaultAddr);

    const latestBlock = await ethers.provider.getBlock("latest");
    const intent = {
      vault: vaultAddr,
      toVault: recipientVaultAddr,
      amount: 1n,
      nonce: 0n,
      deadline: BigInt((latestBlock?.timestamp ?? 0) + 3600),
      walletEpoch: 1n,
      chainId: BigInt((await ethers.provider.getNetwork()).chainId),
    };

    await assert.rejects(
      () => vault.connect(owner).executeVaultToVaultTransfer(intent, "0x"),
      /revert/
    );
  });
});
