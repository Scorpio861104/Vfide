import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EcosystemVault (EV-07: payExpense accounting order)", () => {
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

    const Vault = await ethers.getContractFactory("EcosystemVaultTestable");
    const vault = await Vault.deploy(
      await rewardToken.getAddress(),
      ethers.ZeroAddress,
      owner.address,
    );
    await vault.waitForDeployment();

    await vault.connect(owner).setManager(manager.address, true);
    await vault.connect(owner).setAllocations(500, 500, 500);

    await rewardToken.setObservedVault(await vault.getAddress());
    await stableToken.setObservedVault(await vault.getAddress());

    return { ethers, owner, manager, recipient, rewardToken, stableToken, vault };
  }

  it("decrements operationsPool before fallback VFIDE transfer", async () => {
    const { ethers, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const inertRouter = await Placeholder.deploy();
    await inertRouter.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await vault.forceAutoSwapConfig(await inertRouter.getAddress(), await stableToken.getAddress(), true, 100);

    await vault.connect(manager).payExpense(recipient.address, 100n, "fallback payout");

    assert.equal(await vault.operationsPool(), 750n);
    assert.equal(await rewardToken.observedOperationsPool(), 750n);
    assert.equal(await rewardToken.balanceOf(recipient.address), 100n);
  });

  it("decrements operationsPool before stablecoin transfer after a successful swap", async () => {
    const { ethers, manager, recipient, rewardToken, stableToken, vault } = await deployVaultHarness();

    const Router = await ethers.getContractFactory("QuoteMockSwapRouter");
    const router = await Router.deploy();
    await router.waitForDeployment();

    await rewardToken.mint(await vault.getAddress(), 1_000n);
    await stableToken.mint(await router.getAddress(), 1_000n);
    await vault.forceAutoSwapConfig(await router.getAddress(), await stableToken.getAddress(), true, 100);
    // Set a non-zero price floor so _swapToStable doesn't bail early (minAmountOut must be > 0)
    // Formula: minAmountOut = amount * minOutputPerVfide / 1e18 — with amount=100 we need floor >= 1e16
    await vault.forceMinOutputPerVfide(10n ** 16n); // 0.01 per VFIDE — trivially satisfied by mock

    await vault.connect(manager).payExpense(recipient.address, 100n, "stable payout");

    assert.equal(await vault.operationsPool(), 750n);
    assert.equal(await stableToken.observedOperationsPool(), 750n);
    assert.equal(await stableToken.balanceOf(recipient.address), 100n);
  });
});