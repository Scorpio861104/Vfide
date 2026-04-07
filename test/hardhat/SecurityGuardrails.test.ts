import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("ProofScoreBurnRouter (F-26: only Seer updates score)", () => {
  it("owner cannot call updateScore directly", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner, user, sanctum, burn, ecosystem] = await ethers.getSigners();

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

    await assert.rejects(
      () => router.connect(owner).updateScore(user.address),
      /only seer/
    );
  });

  it("configured Seer can push a score snapshot", async () => {
    const { ethers } = (await network.connect()) as any;
    const [, user, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(user.address, 7777);

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

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
    const { ethers } = (await network.connect()) as any;
    const [, user, sanctum, burn, ecosystem] = await ethers.getSigners();

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
    const { ethers } = (await network.connect()) as any;
    const [, user, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(user.address, 6500);

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

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
    const { ethers } = (await network.connect()) as any;
    const [, user, recipient, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(user.address, 6800);

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

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
    const { ethers } = (await network.connect()) as any;
    const [owner, user, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(owner.address, 6200);

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

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
    const { ethers } = (await network.connect()) as any;
    const [owner, user, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(owner.address, 4000); // worst-tier score -> max base fee before cap

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

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
});

describe("VaultHub (F-20: SecurityHub timelock)", () => {
  it("setSecurityHub schedules without immediate effect", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const oldSecurity = await Placeholder.deploy();
    const newSecurity = await Placeholder.deploy();
    await oldSecurity.waitForDeployment();
    await newSecurity.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      await oldSecurity.getAddress(),
      ethers.ZeroAddress,
      owner.address,
    );
    await hub.waitForDeployment();

    await hub.connect(owner).setSecurityHub(await newSecurity.getAddress());

    assert.equal(await hub.securityHub(), await oldSecurity.getAddress());
    assert.equal(await hub.pendingSecurityHub_VH(), await newSecurity.getAddress());
    assert.ok((await hub.pendingSecurityHubAt_VH()) > 0n);
  });

  it("applySecurityHub reverts before delay and succeeds after 48h", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const oldSecurity = await Placeholder.deploy();
    const newSecurity = await Placeholder.deploy();
    await oldSecurity.waitForDeployment();
    await newSecurity.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      await oldSecurity.getAddress(),
      ethers.ZeroAddress,
      owner.address,
    );
    await hub.waitForDeployment();

    await hub.connect(owner).setSecurityHub(await newSecurity.getAddress());

    await assert.rejects(
      () => hub.connect(owner).applySecurityHub(),
      /VH: timelock|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await hub.connect(owner).applySecurityHub();

    assert.equal(await hub.securityHub(), await newSecurity.getAddress());
    assert.equal(await hub.pendingSecurityHub_VH(), ethers.ZeroAddress);
    assert.equal(await hub.pendingSecurityHubAt_VH(), 0n);
  });

  it("rejects legacy setModules and delays VFIDE, ledger, and DAO changes", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner] = await ethers.getSigners();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    const newToken = await TokenStub.deploy();
    await token.waitForDeployment();
    await newToken.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const security = await Placeholder.deploy();
    const oldLedger = await Placeholder.deploy();
    const newLedger = await Placeholder.deploy();
    const oldDao = await Placeholder.deploy();
    const newDao = await Placeholder.deploy();
    await security.waitForDeployment();
    await oldLedger.waitForDeployment();
    await newLedger.waitForDeployment();
    await oldDao.waitForDeployment();
    await newDao.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHub");
    const hub = await VaultHub.deploy(
      await token.getAddress(),
      await security.getAddress(),
      await oldLedger.getAddress(),
      await oldDao.getAddress(),
    );
    await hub.waitForDeployment();

    const newTokenAddress = await newToken.getAddress();
    const securityAddress = await security.getAddress();
    const newLedgerAddress = await newLedger.getAddress();
    const newDaoAddress = await newDao.getAddress();

    await assert.rejects(
      () => hub.connect(owner).setModules(newTokenAddress, securityAddress, newLedgerAddress, newDaoAddress),
      /VH: use individual setters/
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
  it("allows merchants to enable auto-convert only after the swap path is configured", async () => {
    const { ethers } = (await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    })) as any;
    const [dao, merchant] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(merchant.address, 7000);

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const vaultHub = await Placeholder.deploy();
    const securityHub = await Placeholder.deploy();
    const ledger = await Placeholder.deploy();
    const feeSink = await Placeholder.deploy();
    const router = await Placeholder.deploy();
    const stablecoin = await Placeholder.deploy();
    await vaultHub.waitForDeployment();
    await securityHub.waitForDeployment();
    await ledger.waitForDeployment();
    await feeSink.waitForDeployment();
    await router.waitForDeployment();
    await stablecoin.waitForDeployment();

    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    const portal = await MerchantPortal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await securityHub.getAddress(),
      await ledger.getAddress(),
      await feeSink.getAddress(),
    );
    await portal.waitForDeployment();

    await portal.connect(merchant).registerMerchant("Merchant", "retail");

    await assert.rejects(
      () => portal.connect(merchant).setAutoConvert(true),
      /swap not configured/
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
  it("allows Seer consume only after policy delay", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, seer] = await ethers.getSigners();

    const Guard = await ethers.getContractFactory("SeerPolicyGuard");
    const guard = await Guard.deploy(dao.address, seer.address);
    await guard.waitForDeployment();

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
    const { ethers } = (await network.connect()) as any;
    const [dao, seer] = await ethers.getSigners();

    const Guard = await ethers.getContractFactory("SeerPolicyGuard");
    const guard = await Guard.deploy(dao.address, seer.address);
    await guard.waitForDeployment();

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
  it("blocks repeated admin emergency delay reductions until the reset window elapses", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin] = await ethers.getSigners();

    const Timelock = await ethers.getContractFactory("DAOTimelock");
    const tl = await Timelock.deploy(admin.address);
    await tl.waitForDeployment();

    // First emergency reduction succeeds (48h -> 36h)
    await tl.connect(admin).emergencyReduceDelay(36 * 60 * 60);
    assert.equal(await tl.delay(), 36n * 60n * 60n);

    // Additional direct reductions remain blocked during the reset window.
    await assert.rejects(
      () => tl.connect(admin).emergencyReduceDelay(30 * 60 * 60),
      /emergency reduction already used/
    );

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await tl.connect(admin).emergencyReduceDelay(30 * 60 * 60);
    assert.equal(await tl.delay(), 30n * 60n * 60n);
  });
});
