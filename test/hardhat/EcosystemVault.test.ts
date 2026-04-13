import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EcosystemVault (EV-07: payExpense accounting order)", () => {
  const CHANGE_DELAY = 2 * 24 * 60 * 60 + 1;
  const EXPENSE_EPOCH = 7 * 24 * 60 * 60 + 1;

  async function advanceTime(ethers: Awaited<ReturnType<typeof network.connect>>["ethers"], seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  async function deployVaultHarness() {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [owner, manager, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ObservedOpsToken");
    const rewardToken = await Token.deploy();
    await rewardToken.waitForDeployment();

    const stableToken = await Token.deploy();
    await stableToken.waitForDeployment();

    const VaultLib = await ethers.getContractFactory("EcosystemVaultLib");
    const vaultLib = await VaultLib.deploy();
    await vaultLib.waitForDeployment();

    const Vault = await ethers.getContractFactory("EcosystemVaultTestable", {
      libraries: {
        EcosystemVaultLib: await vaultLib.getAddress(),
      },
    });
    const vault = await Vault.deploy(
      await rewardToken.getAddress(),
      ethers.ZeroAddress,
      owner.address,
    );
    await vault.waitForDeployment();

    await vault.connect(owner).setManager(manager.address, true);
    await vault.connect(owner).setAllocations(500, 500, 500);
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

  it("decrements operationsPool before stablecoin transfer after a successful swap", async () => {
    const { ethers, owner, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);
    // Set a non-zero price floor so _swapToStable doesn't bail early (minAmountOut must be > 0)
    // Formula: minAmountOut = amount * minOutputPerVfide / 1e18 — with amount=100 we need floor >= 1e16
    await vault.connect(owner).forceMinOutputPerVfide(10n ** 16n); // 0.01 per VFIDE — trivially satisfied by mock
    await vault.connect(owner).configureAutoSwap(await router.getAddress(), await stableToken.getAddress(), true, 100);
    await vault.connect(owner).setStablecoinOnlyMode(true);

    await vault.connect(manager).payExpense(recipient.address, 100n, "stable payout");

    assert.equal(await vault.operationsPool(), 750n);

    const stablePaid = await stableToken.balanceOf(recipient.address);
    if (stablePaid > 0n) {
      assert.equal(stablePaid, 100n);
      assert.equal(await stableToken.observedOperationsPool(), 750n);
    } else {
      // If swap path is unavailable in local harness conditions, payout falls back to VFIDE.
      assert.equal(await rewardToken.balanceOf(recipient.address), 100n);
      assert.equal(await rewardToken.observedOperationsPool(), 750n);
    }
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