import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EcosystemVault (EV-07: payExpense accounting order)", { concurrency: 1 }, () => {
  const CHANGE_DELAY = 2 * 24 * 60 * 60 + 1;
  const EXPENSE_EPOCH = 7 * 24 * 60 * 60 + 1;
  let connectionPromise: Promise<Awaited<ReturnType<typeof network.connect>>> | null = null;

  async function getConnection() {
    if (!connectionPromise) {
      connectionPromise = network.connect({
        override: {
          allowUnlimitedContractSize: true,
        },
      });
    }
    return connectionPromise;
  }

  async function advanceTime(ethers: Awaited<ReturnType<typeof network.connect>>["ethers"], seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  async function deployVaultHarness() {
    const { ethers, networkHelpers } = await getConnection();
    return networkHelpers.loadFixture(deployVaultHarnessFixture);
  }

  async function deployVaultHarnessFixture() {
    const { ethers } = await getConnection();
    const [owner, manager, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ObservedOpsToken");
    const rewardToken = await Token.deploy();
    await rewardToken.waitForDeployment();

    const stableToken = await Token.deploy();
    await stableToken.waitForDeployment();

    const VaultLib = await ethers.getContractFactory("EcosystemVaultLib");
    const vaultLib = await VaultLib.deploy();
    await vaultLib.waitForDeployment();

    const PlaceholderFactory = await ethers.getContractFactory("Placeholder");
    const placeholderSeer = await PlaceholderFactory.deploy();
    await placeholderSeer.waitForDeployment();

    const Vault = await ethers.getContractFactory("EcosystemVaultTestable", {
      libraries: {
        EcosystemVaultLib: await vaultLib.getAddress(),
      },
    });
    const vault = await Vault.deploy(
      await rewardToken.getAddress(),
      await placeholderSeer.getAddress(),
      owner.address,
    );
    await vault.waitForDeployment();

    await vault.connect(owner).setManager(manager.address, true);
    await vault.connect(owner).setAllocations(500, 500, 500);
    await vault.connect(owner).setEpochCaps(10_000, 10_000);
    await advanceTime(ethers, CHANGE_DELAY);
    await vault.connect(owner).executeManagerChange();
    await vault.connect(owner).executeAllocationChange();

    await rewardToken.setObservedVault(await vault.getAddress());
    await stableToken.setObservedVault(await vault.getAddress());

    return { ethers, owner, manager, recipient, rewardToken, stableToken, vault };
  }

  it("decrements operationsPool before fallback VFIDE transfer", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const inertRouter = await Placeholder.deploy();
    await inertRouter.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n);
    await vault.connect(owner).configureAutoSwap(await inertRouter.getAddress(), await stableToken.getAddress(), true, 100);

    await vault.connect(manager).payExpense(recipient.address, 100n, "fallback payout");

    assert.equal(await vault.operationsPool(), 750n);
    assert.equal(await rewardToken.observedOperationsPool(), 750n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 100n);
  });

  it("decrements operationsPool before stablecoin transfer from a funded reserve", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);
    await stableToken.mint(manager.address, 1_000n);
    await stableToken.connect(manager).approve(await vault.getAddress(), 1_000n);
    await vault.connect(manager).depositStablecoinReserve(await stableToken.getAddress(), 500n);

    // Keep auto-swap configured to mirror production setup, even though stablecoin-only payouts
    // now require a pre-funded reserve instead of falling through to a swap path.
    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n); // 0.01 per VFIDE — trivially satisfied by mock
    await vault.connect(owner).configureAutoSwap(await router.getAddress(), await stableToken.getAddress(), true, 100);
    await vault.connect(owner).setStablecoinOnlyMode(true);

    await vault.connect(manager).payExpense(recipient.address, 100n, "stable payout");

    assert.equal(await vault.operationsPool(), 750n);
    assert.equal(await stableToken.balanceOf(recipient.address), 100n);
    assert.equal(await stableToken.observedOperationsPool(), 750n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 0n);
  });

  it("automatically swaps VFIDE to stablecoin for expenses when reserve is empty", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);

    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n);
    await vault.connect(owner).configureAutoSwap(await router.getAddress(), await stableToken.getAddress(), true, 100);
    await vault.connect(owner).setStablecoinOnlyMode(true);

    await vault.connect(manager).payExpense(recipient.address, 100n, "auto swapped stable payout");

    assert.equal(await vault.operationsPool(), 750n);
    assert.equal(await stableToken.balanceOf(recipient.address), 100n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 0n);
    assert.equal(await rewardToken.balanceOf(await router.getAddress()), 100n);
  });

  it("automatically swaps VFIDE to stablecoin for merchant work rewards", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);

    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n);
    await vault.connect(owner).configureAutoSwap(await router.getAddress(), await stableToken.getAddress(), true, 100);
    await vault.connect(owner).setStablecoinOnlyMode(true);

    await vault.connect(manager).payMerchantWorkReward(recipient.address, 40n, "merchant stable payout");

    assert.equal(await stableToken.balanceOf(recipient.address), 40n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 0n);
    assert.equal(await rewardToken.balanceOf(await router.getAddress()), 40n);
  });

  it("rejects merchant work rewards until stablecoin reward routing is configured", async () => {
    const { manager, recipient, rewardToken, vault } = await deployVaultHarness();

    await rewardToken.mint(await vault.getAddress(), 1_000n);

    await assert.rejects(
      vault.connect(manager).payMerchantWorkReward(recipient.address, 40n, "unconfigured reward"),
      /ECO_InvalidConfig/
    );

    assert.equal(await rewardToken.balanceOf(recipient.address), 0n);
  });

  it("pays council rewards in stablecoin even when expense stablecoin mode is off", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();
    const secondCouncilMember = (await ethers.getSigners())[3];

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    const CouncilManager = await ethers.getContractFactory("MockCouncilManager");
    const councilManager = await CouncilManager.deploy();
    await councilManager.waitForDeployment();
    await councilManager.setActiveMembers([recipient.address, secondCouncilMember.address]);

    await vault.connect(owner).setCouncilManager(await councilManager.getAddress());
    await advanceTime(ethers, CHANGE_DELAY);
    await vault.connect(owner).executeCouncilManagerChange();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);

    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n);
    await vault.connect(owner).configureAutoSwap(await router.getAddress(), await stableToken.getAddress(), true, 100);

    await vault.connect(manager).distributeCouncilRewards();

    assert.equal(await stableToken.balanceOf(recipient.address), 25n);
    assert.equal(await stableToken.balanceOf(secondCouncilMember.address), 25n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 0n);
    assert.equal(await rewardToken.balanceOf(secondCouncilMember.address), 0n);
  });

  it("queues manager changes for direct owners until the delay matures", async () => {
    const { ethers, owner, manager, rewardToken, vault } = await deployVaultHarness();
    const candidateManager = (await ethers.getSigners())[3];

    await vault.connect(owner).setManager(candidateManager.address, true);

    assert.equal(await vault.isManager(candidateManager.address), false);
    await assert.rejects(
      vault.connect(candidateManager).payExpense(manager.address, 1n, "too early"),
      /custom error|0xb73271c2/
    );

    await advanceTime(ethers, CHANGE_DELAY);
    await vault.connect(owner).executeManagerChange();

    await rewardToken.mint(await vault.getAddress(), 100n);
    await vault.connect(candidateManager).payExpense(manager.address, 1n, "after delay");
    assert.equal(await rewardToken.balanceOf(manager.address), 1n);
  });

  it("enforces the rolling operations expense ceiling", async () => {
    const { ethers, manager, recipient, rewardToken, vault } = await deployVaultHarness();

    await rewardToken.mint(await vault.getAddress(), 1_000n);

    await vault.connect(manager).payExpense(recipient.address, 200n, "within cap");
    await assert.rejects(
      vault.connect(manager).payExpense(recipient.address, 20n, "over cap"),
      /ECO_ExpenseCapExceeded/
    );

    await advanceTime(ethers, EXPENSE_EPOCH);
    await vault.connect(manager).payExpense(recipient.address, 20n, "next epoch");

    assert.equal(await rewardToken.balanceOf(recipient.address), 220n);
  });

  it("caps aggregate pending withdrawals instead of each request independently", async () => {
    const { ethers, owner, recipient, rewardToken, vault } = await deployVaultHarness();

    await rewardToken.mint(await vault.getAddress(), 1_000n);

    await vault.connect(owner).requestWithdraw(recipient.address, 100n);
    assert.equal(await vault.pendingWithdrawTotal(), 100n);

    await assert.rejects(
      vault.connect(owner).requestWithdraw(recipient.address, 1n),
      /ECO_ExceedsMax/
    );

    await vault.connect(owner).cancelWithdraw(1n);
    assert.equal(await vault.pendingWithdrawTotal(), 0n);

    await vault.connect(owner).requestWithdraw(recipient.address, 100n);
    await advanceTime(ethers, CHANGE_DELAY);
    await vault.connect(owner).executeWithdraw(2n);

    assert.equal(await vault.pendingWithdrawTotal(), 0n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 100n);
  });
});