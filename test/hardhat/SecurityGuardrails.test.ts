import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("ProofScoreBurnRouter (F-26: only Seer updates score)", () => {
  async function burnRouterFixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner, user, recipient, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

    return { ethers, owner, user, recipient, sanctum, burn, ecosystem, seer, router };
  }

  async function deployBurnRouter() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(burnRouterFixture);
  }

  it("owner cannot call updateScore directly", async () => {
    const { owner, user, router } = await deployBurnRouter();

    await assert.rejects(
      () => router.connect(owner).updateScore(user.address),
      /revert/
    );
  });

  it("configured Seer can push a score snapshot", async () => {
    const { ethers, user, seer, router } = await deployBurnRouter();
    await seer.setScore(user.address, 7777);

    const seerAddr = await seer.getAddress();
    await ethers.provider.send("hardhat_setBalance", [seerAddr, "0x3635C9ADC5DEA00000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [seerAddr]);
    const seerSigner = await ethers.getSigner(seerAddr);

    await router.connect(seerSigner).updateScore(user.address);

    const updatedAt = await router.lastScoreUpdate(user.address);
    const snapshot = await router.scoreHistory(user.address, 0);
    assert.ok(updatedAt > 0n);
    assert.equal(snapshot[0], 7777n);
    assert.ok(snapshot[1] > 0n);

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [seerAddr]);
  });

  it("keeps score snapshot history bounded with ring-buffer rollover", async () => {
    const { ethers, user, seer, router } = await deployBurnRouter();

    const cap = await router.MAX_SCORE_SNAPSHOTS();
    assert.equal(cap, 32n);

    const seerAddr = await seer.getAddress();
    await ethers.provider.send("hardhat_setBalance", [seerAddr, "0x3635C9ADC5DEA00000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [seerAddr]);
    const seerSigner = await ethers.getSigner(seerAddr);

    // Push more than cap snapshots while respecting the minimum update interval;
    // the ring head should still advance modulo cap.
    for (let i = 0; i < 40; i++) {
      await seer.setScore(user.address, 7000 + i);
      await router.connect(seerSigner).updateScore(user.address);
      if (i < 39) {
        await ethers.provider.send("evm_increaseTime", [60 * 60 + 1]);
        await ethers.provider.send("evm_mine", []);
      }
    }

    assert.equal(await router.scoreHistoryHead(user.address), 8n);
    assert.ok((await router.lastScoreUpdate(user.address)) > 0n);

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [seerAddr]);
  });

  it("uses cached weighted score in-window and falls back when history is stale", async () => {
    const { ethers, user, seer, router } = await deployBurnRouter();
    await seer.setScore(user.address, 6500);

    const seerAddr = await seer.getAddress();
    await ethers.provider.send("hardhat_setBalance", [seerAddr, "0x3635C9ADC5DEA00000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [seerAddr]);
    const seerSigner = await ethers.getSigner(seerAddr);

    await router.connect(seerSigner).updateScore(user.address);

    assert.equal(await router.cachedTimeWeightedScore(user.address), 6500n);
    assert.equal(await router.getTimeWeightedScore(user.address), 6500n);

    // Advance past the weighting window without pushing a new router snapshot.
    // The router should stop using stale cached history and fall back to Seer's score.
    await seer.setScore(user.address, 7200);
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    assert.equal(await router.cachedTimeWeightedScore(user.address), 6500n);
    assert.equal(await router.getTimeWeightedScore(user.address), 7200n);

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [seerAddr]);
  });

  it("preview helpers expose the same time-weighted score used for live fee execution", async () => {
    const { ethers, user, recipient, seer, router } = await deployBurnRouter();
    await seer.setScore(user.address, 6800);

    const seerAddr = await seer.getAddress();
    await ethers.provider.send("hardhat_setBalance", [seerAddr, "0x3635C9ADC5DEA00000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [seerAddr]);
    const seerSigner = await ethers.getSigner(seerAddr);

    await router.connect(seerSigner).updateScore(user.address);

    const preview = await router.previewFees(user.address, 1_000_000n);
    const previewAccurate = await router.previewFeesAccurate(user.address, recipient.address, 1_000_000n);
    assert.equal(preview[4], 6800n);
    assert.equal(previewAccurate[4], 6800n);

    await seer.setScore(user.address, 7300);
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const refreshedPreview = await router.previewFees(user.address, 1_000_000n);
    const refreshedAccurate = await router.previewFeesAccurate(user.address, recipient.address, 1_000_000n);
    assert.equal(refreshedPreview[4], 7300n);
    assert.equal(refreshedAccurate[4], 7300n);

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [seerAddr]);
  });

  it("computeFeesAndReserve matches computeFees for identical inputs", async () => {
    const { owner, user, seer, router } = await deployBurnRouter();
    await seer.setScore(owner.address, 6200);

    // Route computeFeesAndReserve authorization to owner for deterministic test calls.
    await router.connect(owner).setToken(owner.address);
    // Avoid `burnsPaused()` external totalSupply call against an EOA test token address.
    // This keeps the test focused on compute parity rather than token wiring.
    await router.connect(owner).setSustainability(0n, 0n, 5);

    const amount = 1_000_000n;
    const expected = await router.computeFees(owner.address, user.address, amount);
    const reserved = await router.connect(owner).computeFeesAndReserve.staticCall(owner.address, user.address, amount);

    assert.deepEqual([...reserved], [...expected]);
  });

  it("caps low-value transfer fees at micro transaction ceiling", async () => {
    const { ethers, owner, user, seer, router } = await deployBurnRouter();
    await seer.setScore(owner.address, 4000); // worst-tier score -> max base fee before cap

    await router.connect(owner).setToken(owner.address);
    await router.connect(owner).setSustainability(0n, 0n, 5);

    const smallAmount = ethers.parseEther("5");
    const largeAmount = ethers.parseEther("50");

    const small = await router.computeFees(owner.address, user.address, smallAmount);
    const large = await router.computeFees(owner.address, user.address, largeAmount);

    const smallTotalFee = small[0] + small[1] + small[2];
    const largeTotalFee = large[0] + large[1] + large[2];

    assert.equal(smallTotalFee, (smallAmount * 100n) / 10000n);
    assert.ok(largeTotalFee > (largeAmount * 100n) / 10000n);
  });

  it("splits fees from total fee amount to avoid BPS-share rounding drift", async () => {
    const { owner, user, seer, router } = await deployBurnRouter();
    await seer.setScore(owner.address, 6157); // force an interpolated fee tier

    await router.connect(owner).setToken(owner.address);
    await router.connect(owner).setSustainability(0n, 0n, 5);

    const amount = 1_234_567n;
    const [burnAmount, sanctumAmount, ecosystemAmount] =
      await router.computeFees(owner.address, user.address, amount);

    const totalFee = burnAmount + sanctumAmount + ecosystemAmount;
    assert.equal(burnAmount, (totalFee * 40n) / 100n);
    assert.equal(sanctumAmount, (totalFee * 10n) / 100n);
    assert.equal(ecosystemAmount, totalFee - burnAmount - sanctumAmount);
    assert.ok(totalFee <= amount);
  });
});

describe("VaultHub (F-20: SecurityHub timelock)", () => {
  async function vaultHubFixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    const newToken = await TokenStub.deploy();
    await token.waitForDeployment();
    await newToken.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const oldLedger = await Placeholder.deploy();
    const newLedger = await Placeholder.deploy();
    const oldDao = await Placeholder.deploy();
    const newDao = await Placeholder.deploy();
    await oldLedger.waitForDeployment();
    await newLedger.waitForDeployment();
    await oldDao.waitForDeployment();
    await newDao.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      await oldLedger.getAddress(),
      await oldDao.getAddress(),
    );
    await hub.waitForDeployment();

    return { ethers, owner, token, newToken, oldLedger, newLedger, oldDao, newDao, hub };
  }

  async function deployVaultHubHarness() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(vaultHubFixture);
  }

  it("setProofLedger schedules without immediate effect", async () => {
    const { ethers, owner, oldLedger, newLedger, hub } = await deployVaultHubHarness();

    await hub.connect(owner).setProofLedger(await oldLedger.getAddress());
    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await hub.connect(owner).applyProofLedger();

    await hub.connect(owner).setProofLedger(await newLedger.getAddress());

    assert.equal(await hub.pendingProofLedger_VH(), await newLedger.getAddress());
    assert.ok((await hub.pendingProofLedgerAt_VH()) > 0n);
  });

  it("applyProofLedger reverts before delay and succeeds after 48h", async () => {
    const { ethers, owner, oldLedger, newLedger, hub } = await deployVaultHubHarness();

    await hub.connect(owner).setProofLedger(await oldLedger.getAddress());
    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await hub.connect(owner).applyProofLedger();

    await hub.connect(owner).setProofLedger(await newLedger.getAddress());

    await assert.rejects(
      () => hub.connect(owner).applyProofLedger(),
      /VH: timelock|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await hub.connect(owner).applyProofLedger();

    assert.equal(await hub.pendingProofLedger_VH(), ethers.ZeroAddress);
    assert.equal(await hub.pendingProofLedgerAt_VH(), 0n);
  });

  it("rejects legacy setModules and delays VFIDE, ledger, and DAO changes", async () => {
    const { ethers, owner, token, newToken, newLedger, newDao, hub } = await deployVaultHubHarness();

    const newTokenAddress = await newToken.getAddress();
    const newLedgerAddress = await newLedger.getAddress();
    const newDaoAddress = await newDao.getAddress();

    await assert.rejects(
      () => hub.connect(owner).setModules(newTokenAddress, newLedgerAddress, newDaoAddress),
      /revert/
    );

    await hub.connect(owner).setVFIDEToken(newTokenAddress);
    await hub.connect(owner).setProofLedger(newLedgerAddress);
    await hub.connect(owner).setDAO(newDaoAddress);

    assert.equal(await hub.vfideToken(), await token.getAddress());
    assert.equal(await hub.pendingVFIDE_VH(), newTokenAddress);
    assert.equal(await hub.pendingProofLedger_VH(), newLedgerAddress);
    assert.equal(await hub.pendingDAO_VH(), newDaoAddress);

    await assert.rejects(() => hub.connect(owner).applyVFIDEToken(), /VH: timelock|revert/);
    await assert.rejects(() => hub.connect(owner).applyProofLedger(), /VH: timelock|revert/);
    await assert.rejects(() => hub.connect(owner).applyDAO(), /VH: timelock|revert/);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await hub.connect(owner).applyVFIDEToken();
    await hub.connect(owner).applyProofLedger();
    await hub.connect(owner).applyDAO();

    assert.equal(await hub.vfideToken(), newTokenAddress);
    assert.equal(await hub.pendingVFIDE_VH(), ethers.ZeroAddress);
    assert.equal(await hub.pendingVFIDEAt_VH(), 0n);
    assert.equal(await hub.pendingProofLedger_VH(), ethers.ZeroAddress);
    assert.equal(await hub.pendingProofLedgerAt_VH(), 0n);
    assert.equal(await hub.dao(), newDaoAddress);
    assert.equal(await hub.pendingDAO_VH(), ethers.ZeroAddress);
    assert.equal(await hub.pendingDAOAt_VH(), 0n);
  });
});

describe("MerchantPortal (NEW-05: auto-convert safety hold)", () => {
  async function merchantPortalFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, merchant] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(merchant.address, 7000);

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const TokenStub = await ethers.getContractFactory("TokenStub");
    const vaultHub = await Placeholder.deploy();
    const ledger = await Placeholder.deploy();
    const feeSink = await Placeholder.deploy();
    const router = await Placeholder.deploy();
    const stablecoin = await TokenStub.deploy();
    await vaultHub.waitForDeployment();
    await ledger.waitForDeployment();
    await feeSink.waitForDeployment();
    await router.waitForDeployment();
    await stablecoin.waitForDeployment();

    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    const portal = await MerchantPortal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await ledger.getAddress(),
      await feeSink.getAddress(),
    );
    await portal.waitForDeployment();

    await portal.connect(merchant).registerMerchant("Merchant", "retail");

    return { ethers, dao, merchant, router, stablecoin, portal };
  }

  async function deployMerchantPortal() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(merchantPortalFixture);
  }

  it("allows merchants to enable auto-convert only after the swap path is configured", async () => {
    const { dao, merchant, router, stablecoin, portal } = await deployMerchantPortal();

    await assert.rejects(
      () => portal.connect(merchant).setAutoConvert(true),
      /revert/
    );

    await portal.connect(dao).setAcceptedToken(await stablecoin.getAddress(), true);
    await portal.connect(dao).setSwapConfig(await router.getAddress(), await stablecoin.getAddress());

    await portal.connect(merchant).setAutoConvert(true);
    assert.equal(await portal.autoConvert(merchant.address), true);

    await portal.connect(merchant).setAutoConvert(false);
    assert.equal(await portal.autoConvert(merchant.address), false);
  });
});

describe("SeerPolicyGuard (BATCH-06: schedule/cancel flow)", () => {
  async function seerPolicyGuardFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, seer] = await ethers.getSigners();

    const Guard = await ethers.getContractFactory("SeerPolicyGuard");
    const guard = await Guard.deploy(dao.address, seer.address);
    await guard.waitForDeployment();

    return { ethers, dao, seer, guard };
  }

  async function deploySeerPolicyGuard() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(seerPolicyGuardFixture);
  }

  it("allows Seer consume only after policy delay", async () => {
    const { ethers, dao, seer, guard } = await deploySeerPolicyGuard();

    const selector = "0x12345678";
    const policyClass = 2; // operational => 24h

    await guard.connect(dao).schedulePolicyChange(selector, policyClass);
    const changeId = await guard.getPolicyChangeId(selector, policyClass);
    assert.ok((await guard.policyChangeReadyAt(changeId)) > 0n);

    await assert.rejects(
      () => guard.connect(seer).consume(selector, policyClass),
      /revert/
    );

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await guard.connect(seer).consume(selector, policyClass);
    assert.equal(await guard.policyChangeReadyAt(changeId), 0n);
  });

  it("lets DAO cancel a pending policy change", async () => {
    const { dao, seer, guard } = await deploySeerPolicyGuard();

    const selector = "0x90abcdef";
    const policyClass = 1; // important

    await guard.connect(dao).schedulePolicyChange(selector, policyClass);
    const changeId = await guard.getPolicyChangeId(selector, policyClass);
    assert.ok((await guard.policyChangeReadyAt(changeId)) > 0n);

    await guard.connect(dao).cancelPolicyChange(selector, policyClass);
    assert.equal(await guard.policyChangeReadyAt(changeId), 0n);

    await assert.rejects(
      () => guard.connect(seer).consume(selector, policyClass),
      /revert/
    );
  });
});

describe("DAOTimelock (delay hardening)", () => {
  async function daoTimelockFixture() {
    const { ethers } = (await getConnection()) as any;
    const [admin] = await ethers.getSigners();

    const Timelock = await ethers.getContractFactory("DAOTimelock");
    const tl = await Timelock.deploy(admin.address);
    await tl.waitForDeployment();

    return { ethers, admin, tl };
  }

  async function deployTimelock() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(daoTimelockFixture);
  }

  it("blocks repeated admin emergency delay reductions until the reset window elapses", async () => {
    const { ethers, admin, tl } = await deployTimelock();

    // First emergency reduction succeeds (48h -> 36h)
    await tl.connect(admin).emergencyReduceDelay(36 * 60 * 60);
    assert.equal(await tl.delay(), 36n * 60n * 60n);

    // Additional direct reductions remain blocked during the reset window.
    await assert.rejects(
      () => tl.connect(admin).emergencyReduceDelay(30 * 60 * 60),
      /revert/
    );

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await tl.connect(admin).emergencyReduceDelay(30 * 60 * 60);
    assert.equal(await tl.delay(), 30n * 60n * 60n);
  });

  it("removes executed tx ids from queued tracking", async () => {
    const { ethers, admin, tl } = await deployTimelock();

    const setDelayData = tl.interface.encodeFunctionData("setDelay", [13 * 60 * 60]);
    const queueTx = await tl.connect(admin).queueTx(await tl.getAddress(), 0, setDelayData);
    const queueReceipt = await queueTx.wait();
    const queueLog = queueReceipt?.logs.find((log: any) => {
      try {
        return tl.interface.parseLog(log)?.name === "Queued";
      } catch {
        return false;
      }
    });
    assert.ok(queueLog, "expected Queued event");
    const parsedQueued = tl.interface.parseLog(queueLog!);
    const txId = parsedQueued?.args.id;
    assert.ok(txId, "expected queued tx id");

    let queued = await tl.getQueuedTransactions();
    assert.equal(queued[0].length, 1);
    assert.equal(queued[0][0], txId);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await tl.connect(admin).execute(txId);

    queued = await tl.getQueuedTransactions();
    assert.equal(queued[0].length, 0);
  });

  it("removes secondary-executed tx ids from queued tracking", async () => {
    const { ethers, admin, tl } = await deployTimelock();
    const [, secondary] = await ethers.getSigners();

    const setSecondaryData = tl.interface.encodeFunctionData("setSecondaryExecutor", [secondary.address]);
    const queueSecondaryTx = await tl.connect(admin).queueTx(await tl.getAddress(), 0, setSecondaryData);
    const queueSecondaryReceipt = await queueSecondaryTx.wait();
    const queueSecondaryLog = queueSecondaryReceipt?.logs.find((log: any) => {
      try {
        return tl.interface.parseLog(log)?.name === "Queued";
      } catch {
        return false;
      }
    });
    assert.ok(queueSecondaryLog, "expected Queued event for secondary executor setup");
    const parsedSecondaryQueue = tl.interface.parseLog(queueSecondaryLog!);
    const setSecondaryId = parsedSecondaryQueue?.args.id;
    assert.ok(setSecondaryId, "expected queued tx id for secondary setup");

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await tl.connect(admin).execute(setSecondaryId);
    assert.equal(await tl.secondaryExecutor(), secondary.address);

    const setDelayData = tl.interface.encodeFunctionData("setDelay", [14 * 60 * 60]);
    const queueTx = await tl.connect(admin).queueTx(await tl.getAddress(), 0, setDelayData);
    const queueReceipt = await queueTx.wait();
    const queueLog = queueReceipt?.logs.find((log: any) => {
      try {
        return tl.interface.parseLog(log)?.name === "Queued";
      } catch {
        return false;
      }
    });
    assert.ok(queueLog, "expected Queued event for secondary execution path");
    const parsedQueued = tl.interface.parseLog(queueLog!);
    const txId = parsedQueued?.args.id;
    assert.ok(txId, "expected queued tx id");

    let queued = await tl.getQueuedTransactions();
    assert.equal(queued[0].length, 1);
    assert.equal(queued[0][0], txId);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await tl.connect(secondary).executeBySecondary(txId);

    queued = await tl.getQueuedTransactions();
    assert.equal(queued[0].length, 0);
  });

  it("bubbles target revert reason on execute", async () => {
    const { ethers, admin, tl } = await deployTimelock();

    const Reverter = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:AlwaysRevertStub");
    const reverter = await Reverter.deploy();
    await reverter.waitForDeployment();

    const data = reverter.interface.encodeFunctionData("fail", []);
    const queueTx = await tl.connect(admin).queueTx(await reverter.getAddress(), 0, data);
    const queueReceipt = await queueTx.wait();
    const queueLog = queueReceipt?.logs.find((log: any) => {
      try {
        return tl.interface.parseLog(log)?.name === "Queued";
      } catch {
        return false;
      }
    });
    assert.ok(queueLog, "expected Queued event");
    const parsedQueued = tl.interface.parseLog(queueLog!);
    const txId = parsedQueued?.args.id;
    assert.ok(txId, "expected queued tx id");

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => tl.connect(admin).execute(txId),
      /stub revert reason/
    );
  });
});
