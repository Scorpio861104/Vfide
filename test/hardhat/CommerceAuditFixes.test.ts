import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("MainstreamPriceOracle (stale read guard)", () => {
  async function oracleFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MainstreamPriceOracle");
    const oracle = await Oracle.deploy(dao.address, ethers.parseEther("10"));
    await oracle.waitForDeployment();

    return { ethers, dao, oracle };
  }

  async function deployOracleFixture() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(oracleFixture);
  }

  it("allows conversion and preview helpers while the price is fresh", async () => {
    const { ethers, oracle } = await deployOracleFixture();

    const usdAmount = 25_000_000n;
    const vfideAmount = await oracle.usdToVfide(usdAmount);
    assert.equal(vfideAmount, usdAmount * ethers.parseEther("10") / 1_000_000n);

    const usdValue = await oracle.vfideToUsd(ethers.parseEther("50"));
    assert.equal(usdValue, 5_000_000n);

    const vfidePriceUsd = await oracle.getVfidePriceUsd();
    assert.equal(vfidePriceUsd, 100_000n);

    const preview = await oracle.previewCheckoutPrice(9_999n);
    assert.equal(preview[1], 99_990_000n);
    assert.equal(preview[0], 99_990_000n * ethers.parseEther("10") / 1_000_000n);
    assert.equal(preview[2], preview[0] / 10_000_000_000_000_000n);
  });

  it("marks stale prices in getPrice and rejects stale conversion helpers", async () => {
    const { ethers, oracle } = await deployOracleFixture();

    await oracle.setStalenessThreshold(5 * 60);
    await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    const priceState = await oracle.getPrice();
    assert.equal(priceState[2], true);

    await assert.rejects(() => oracle.usdToVfide(1_000_000n), /PO: price stale/);
    await assert.rejects(() => oracle.vfideToUsd(ethers.parseEther("1")), /PO: price stale/);
    await assert.rejects(() => oracle.getVfidePriceUsd(), /PO: price stale/);
    await assert.rejects(() => oracle.previewCheckoutPrice(1_999n), /PO: price stale/);
  });
});

describe("CardBoundVault (Fix 2)", () => {
  it("queues admin VFIDE spender approvals", async () => {
    const { ethers } = (await getConnection()) as any;
    const [hub, admin, wallet, guardian, spender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    const amount = ethers.parseEther("42");
    await vault.connect(admin).approveVFIDE(spender.address, amount);

    const pending = await vault.pendingTokenApproval();
    assert.equal(pending.token, await token.getAddress());
    assert.equal(pending.spender, spender.address);
    assert.equal(pending.amount, amount);
    assert.ok(pending.executeAfter > 0n);

    const allowance = await token.allowance(await vault.getAddress(), spender.address);
    assert.equal(allowance, 0n);
  });

  it("rejects approvals above the vault daily transfer limit", async () => {
    const { ethers } = (await getConnection()) as any;
    const [hub, admin, wallet, guardian, spender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const stable = await Token.deploy();
    await stable.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    const amount = ethers.parseEther("301");
    const stableAddress = await stable.getAddress();
    await assert.rejects(() => vault.connect(admin).approveVFIDE(spender.address, amount), /CBV_TransferLimit|revert/i);
    await assert.rejects(
      () => vault.connect(admin).approveERC20(stableAddress, spender.address, amount),
      /CBV_TransferLimit|revert/i
    );
  });

  it("reports guardian maturity only after seven days", async () => {
    const { ethers } = (await getConnection()) as any;
    const [hub, admin, wallet, guardian] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    assert.equal(await vault.isGuardianMature(guardian.address), false);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    assert.equal(await vault.isGuardianMature(guardian.address), true);
  });

  it("queues token approvals once guardian setup is complete", async () => {
    const { ethers } = (await getConnection()) as any;
    const [, admin, wallet, guardian, spender] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:GuardianSetupHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      await hub.getAddress(),
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    await hub.setGuardianSetupComplete(await vault.getAddress(), true);

    const amount = ethers.parseEther("42");
    await vault.connect(admin).approveVFIDE(spender.address, amount);

    const pending = await vault.pendingTokenApproval();
    assert.equal(pending.token, await token.getAddress());
    assert.equal(pending.spender, spender.address);
    assert.equal(pending.amount, amount);
    assert.ok(pending.executeAfter > 0n);
    assert.equal(await token.allowance(await vault.getAddress(), spender.address), 0n);

    await assert.rejects(() => vault.connect(admin).applyTokenApproval(), /locked|revert/i);

    const approvalNow = await ethers.provider.getBlock("latest");
    const approvalWait = Number((pending.executeAfter - BigInt(approvalNow.timestamp)) + 1n);
    await ethers.provider.send("evm_increaseTime", [approvalWait]);
    await ethers.provider.send("evm_mine", []);

    await vault.connect(admin).applyTokenApproval();

    const allowance = await token.allowance(await vault.getAddress(), spender.address);
    assert.equal(allowance, amount);
  });

  it("timelocks native rescue requests", async () => {
    const { ethers } = (await getConnection()) as any;
    const [hub, admin, wallet, guardian, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    const amount = ethers.parseEther("1");
    await admin.sendTransaction({ to: await vault.getAddress(), value: amount });

    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
    await vault.connect(admin).rescueNative(recipient.address, amount);

    const pending = await vault.pendingNativeRescue();
    assert.equal(pending.to, recipient.address);
    assert.equal(pending.amount, amount);
    assert.ok(pending.executeAfter > 0n);
    assert.equal(await ethers.provider.getBalance(await vault.getAddress()), amount);

    await assert.rejects(() => vault.connect(admin).applyRescueNative(), /locked|revert/i);

    const nativeNow = await ethers.provider.getBlock("latest");
    const nativeWait = Number((pending.executeAfter - BigInt(nativeNow.timestamp)) + 1n);
    await ethers.provider.send("evm_increaseTime", [nativeWait]);
    await ethers.provider.send("evm_mine", []);

    await vault.connect(admin).applyRescueNative();

    assert.equal(await ethers.provider.getBalance(await vault.getAddress()), 0n);
    assert.equal(await ethers.provider.getBalance(recipient.address), recipientBalanceBefore + amount);
  });

  it("timelocks non-VFIDE ERC20 rescue requests", async () => {
    const { ethers } = (await getConnection()) as any;
    const [hub, admin, wallet, guardian, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const stable = await Token.deploy();
    await stable.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    const amount = ethers.parseEther("12");
    await stable.mint(await vault.getAddress(), amount);

    await vault.connect(admin).rescueERC20(await stable.getAddress(), recipient.address, amount);

    const pending = await vault.pendingERC20Rescue();
    assert.equal(pending.token, await stable.getAddress());
    assert.equal(pending.to, recipient.address);
    assert.equal(pending.amount, amount);
    assert.ok(pending.executeAfter > 0n);
    assert.equal(await stable.balanceOf(recipient.address), 0n);

    await assert.rejects(() => vault.connect(admin).applyRescueERC20(), /locked|revert/i);

    const erc20Now = await ethers.provider.getBlock("latest");
    const erc20Wait = Number((pending.executeAfter - BigInt(erc20Now.timestamp)) + 1n);
    await ethers.provider.send("evm_increaseTime", [erc20Wait]);
    await ethers.provider.send("evm_mine", []);

    await vault.connect(admin).applyRescueERC20();

    assert.equal(await stable.balanceOf(recipient.address), amount);
  });
});

describe("MerchantPortal (Fixes 3 and 5)", () => {
  async function merchantPortalFixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, customer, merchant, feeSink] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();

    const SeerStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(customer.address, 5000);
    await seer.setScore(merchant.address, 7000);

    const SecurityHub = await ethers.getContractFactory("test/contracts/mocks/SecurityHubMock.sol:SecurityHubMock");
    const securityHub = await SecurityHub.deploy();
    await securityHub.waitForDeployment();

    const Portal = await ethers.getContractFactory("MerchantPortal");
    const portal = await Portal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await securityHub.getAddress(),
      feeSink.address,
    );
    await portal.waitForDeployment();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
    await portal.connect(dao).setProtocolFee(100); // 1%

    await vaultHub.setVault(customer.address, customer.address);
    await vaultHub.setVault(merchant.address, merchant.address);

    await portal.connect(merchant).registerMerchant("Shop", "retail");

    return { ethers, portal, token, seer, customer, merchant, dao };
  }

  async function deployPortalFixture() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(merchantPortalFixture);
  }

  it("rewards merchant and customer on successful pay", async () => {
    const { ethers, portal, token, seer, customer, merchant } = await deployPortalFixture();

    const amount = ethers.parseEther("10");
    await token.mint(customer.address, amount);
    await token.connect(customer).approve(await portal.getAddress(), amount);

    await portal.connect(customer).pay(merchant.address, await token.getAddress(), amount, "order-1");

    assert.equal(await seer.scores(merchant.address), 7003n);
    assert.equal(await seer.scores(customer.address), 5001n);
  });

  it("calculates gross checkout total from desired item amount", async () => {
    const { ethers, portal, token, customer, merchant } = await deployPortalFixture();

    const itemAmount = ethers.parseEther("10");
    const [grossAmount, totalFee, protocolFee, networkFee] = await portal.calculateGrossAmount(
      customer.address,
      merchant.address,
      await token.getAddress(),
      itemAmount
    );

    assert.equal(networkFee, 0n);
    assert.equal(totalFee, protocolFee);
    const netAfterFees = grossAmount - totalFee;
    assert.ok(netAfterFees <= itemAmount);
    assert.ok(itemAmount - netAfterFees <= 1_000_000n);
    assert.ok(grossAmount > itemAmount);
  });

  it("rejects multi-hop swap paths longer than a single intermediate token", async () => {
    const { portal, token, dao } = await deployPortalFixture();
    const { ethers } = (await getConnection()) as any;

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const stable = await Token.deploy();
    await stable.waitForDeployment();

    const hopA = ethers.Wallet.createRandom().address;
    const hopB = ethers.Wallet.createRandom().address;
    const router = ethers.Wallet.createRandom().address;
    const tokenAddress = await token.getAddress();
    const stableAddress = await stable.getAddress();

    await portal.connect(dao).setAcceptedToken(stableAddress, true);
    await portal.connect(dao).setSwapConfig(router, stableAddress);

    await assert.rejects(
      () => portal.connect(dao).setSwapPath(tokenAddress, [
        tokenAddress,
        hopA,
        hopB,
        stableAddress,
      ]),
      /revert/
    );
  });
});
