import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("Mainnet readiness contract fixes", () => {
  describe("StablecoinRegistry", () => {
    it("cross-checks token decimals and supports governance handoff", async () => {
      const { ethers } = await network.connect();
      const signers = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("test/contracts/mocks/ERC20DecimalsMock.sol:ERC20DecimalsMock");
      const token = await TokenFactory.deploy("USD Coin", "USDC", 6);
      await token.waitForDeployment();

      const RegistryFactory = await ethers.getContractFactory("StablecoinRegistry");
      const registry = await RegistryFactory.deploy();
      await registry.waitForDeployment();

      await assert.rejects(async () => {
        await registry.addStablecoin(await token.getAddress(), 18, "USDC");
      });

      const handoffTx = await registry.setGovernance(signers[1].address);
      await handoffTx.wait();

      await assert.rejects(async () => {
        const tx = await registry.setGovernance(signers[2].address);
        await tx.wait();
      });

      await assert.rejects(async () => {
        const tx = await registry.applyGovernance();
        await tx.wait();
      });

      const governanceDelay = await registry.CHANGE_DELAY();
      await ethers.provider.send("evm_increaseTime", [Number(governanceDelay) + 1]);
      await ethers.provider.send("evm_mine", []);

      const applyTx = await registry.applyGovernance();
      await applyTx.wait();

      const rotateTx = await registry.connect(signers[1]).setGovernance(signers[2].address);
      await rotateTx.wait();

      await ethers.provider.send("evm_increaseTime", [Number(governanceDelay) + 1]);
      await ethers.provider.send("evm_mine", []);

      const applyRotateTx = await registry.connect(signers[1]).applyGovernance();
      await applyRotateTx.wait();

      await assert.rejects(async () => {
        const tx = await registry.connect(signers[1]).addStablecoin(await token.getAddress(), 6, "USDC");
        await tx.wait();
      });

      await registry.connect(signers[2]).addStablecoin(await token.getAddress(), 6, "USDC");

      await assert.rejects(async () => {
        const tx = await registry.connect(signers[2]).applyQueuedChange();
        await tx.wait();
      });

      const delay = await registry.CHANGE_DELAY();
      await ethers.provider.send("evm_increaseTime", [Number(delay) + 1]);
      await ethers.provider.send("evm_mine", []);

      await registry.connect(signers[2]).applyQueuedChange();
      assert.equal(await registry.isWhitelisted(await token.getAddress()), true);
      assert.equal(await registry.tokenDecimals(await token.getAddress()), 6n);
    });
  });

  describe("MerchantPortal", () => {
    it("rejects configured stablecoin settlement when live decimals drift", async () => {
      const { ethers } = await network.connect();
      const [dao, customer, merchant, feeSink] = await ethers.getSigners();

      const VaultHubFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
      const vaultHub = await VaultHubFactory.deploy();
      await vaultHub.waitForDeployment();

      const SeerFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
      const seer = await SeerFactory.deploy();
      await seer.waitForDeployment();
      await seer.setScore(customer.address, 6000);
      await seer.setScore(merchant.address, 7000);

      const SecurityHubFactory = await ethers.getContractFactory("test/contracts/mocks/SecurityHubMock.sol:SecurityHubMock");
      const securityHub = await SecurityHubFactory.deploy();
      await securityHub.waitForDeployment();

      const TokenFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MutableDecimalsTokenStub");
      const token = await TokenFactory.deploy(6);
      await token.waitForDeployment();

      const PortalFactory = await ethers.getContractFactory("MerchantPortal");
      const portal = await PortalFactory.deploy(
        dao.address,
        await vaultHub.getAddress(),
        await seer.getAddress(),
        await securityHub.getAddress(),
        feeSink.address,
      );
      await portal.waitForDeployment();

      await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
      await portal.connect(dao).setSwapConfig(ethers.ZeroAddress, await token.getAddress());

      await vaultHub.setVault(customer.address, customer.address);
      await vaultHub.setVault(merchant.address, merchant.address);
      await portal.connect(merchant).registerMerchant("Shop", "retail");

      const amount = 1_000_000n;
      await token.mint(customer.address, amount);
      await token.connect(customer).approve(await portal.getAddress(), amount);
      const expiresAt = BigInt((await ethers.provider.getBlock("latest"))!.timestamp + 3600);
      await portal.connect(customer).setMerchantPullPermitForToken(merchant.address, await token.getAddress(), amount, expiresAt);

      await token.setDecimals(18);

      await assert.rejects(async () => {
        await portal.connect(merchant).processPayment(customer.address, await token.getAddress(), amount, "order-decimals-drift");
      });
    });
  });

  describe("PayrollManager", () => {
    it("decrements active stream counts after cancellation so users are not permanently capped", async () => {
      const { ethers } = await network.connect();
      const [dao, payer, payee] = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("test/contracts/mocks/MockERC20.sol:MockERC20");
      const token = await TokenFactory.deploy();
      await token.waitForDeployment();
      await token.mint(payer.address, ethers.parseEther("1000"));

      const Factory = await ethers.getContractFactory("PayrollManager");
      const payroll = await Factory.deploy(dao.address, ethers.ZeroAddress);
      await payroll.waitForDeployment();

      await payroll.connect(dao).setSupportedToken(await token.getAddress(), true);
      await token.connect(payer).approve(await payroll.getAddress(), ethers.parseEther("1000"));

      await payroll.connect(payer).createStream(payee.address, await token.getAddress(), 10n ** 12n, ethers.parseEther("10"));
      assert.equal(await payroll.activePayerStreamCount(payer.address), 1n);
      assert.equal(await payroll.activePayeeStreamCount(payee.address), 1n);

      await payroll.connect(payer).cancelStream(1);
      assert.equal(await payroll.activePayerStreamCount(payer.address), 0n);
      assert.equal(await payroll.activePayeeStreamCount(payee.address), 0n);

      await payroll.connect(payer).createStream(payee.address, await token.getAddress(), 10n ** 12n, ethers.parseEther("10"));
      assert.equal(await payroll.activePayerStreamCount(payer.address), 1n);
      assert.equal(await payroll.activePayeeStreamCount(payee.address), 1n);
    });

    it("accounts only for actually received funds on topUp for fee-on-transfer tokens", async () => {
      const { ethers } = await network.connect();
      const [dao, payer, payee] = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("test/contracts/mocks/FeeOnTransferTokenMock.sol:FeeOnTransferTokenMock");
      const token = await TokenFactory.deploy(500);
      await token.waitForDeployment();
      await token.mint(payer.address, ethers.parseEther("1000"));

      const Factory = await ethers.getContractFactory("PayrollManager");
      const payroll = await Factory.deploy(dao.address, ethers.ZeroAddress);
      await payroll.waitForDeployment();

      await payroll.connect(dao).setSupportedToken(await token.getAddress(), true);
      await token.connect(payer).approve(await payroll.getAddress(), ethers.parseEther("1000"));

      await payroll.connect(payer).createStream(payee.address, await token.getAddress(), 10n ** 12n, ethers.parseEther("10"));
      const streamBefore = await payroll.getStream(1);
      const beforeBalance = streamBefore.depositBalance;

      await payroll.connect(payer).topUp(1, ethers.parseEther("10"));
      const streamAfter = await payroll.getStream(1);
      assert.equal(streamAfter.depositBalance - beforeBalance, ethers.parseEther("9.5"));
    });

    it("requires DAO-supported tokens for new streams", async () => {
      const { ethers } = await network.connect();
      const [dao, payer, payee] = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("test/contracts/mocks/MockERC20.sol:MockERC20");
      const token = await TokenFactory.deploy();
      await token.waitForDeployment();
      await token.mint(payer.address, ethers.parseEther("100"));

      const Factory = await ethers.getContractFactory("PayrollManager");
      const payroll = await Factory.deploy(dao.address, ethers.ZeroAddress);
      await payroll.waitForDeployment();

      await token.connect(payer).approve(await payroll.getAddress(), ethers.parseEther("100"));

      await assert.rejects(async () => {
        await payroll.connect(payer).createStream(payee.address, await token.getAddress(), 10n ** 12n, ethers.parseEther("1"));
      });
    });
  });

  describe("SubscriptionManager", () => {
    it("fails closed when subscriber or merchant vault mapping changes after subscription creation", async () => {
      const { ethers } = await network.connect();
      const [dao, subscriber, merchant, other] = await ethers.getSigners();

      const TokenFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
      const token = await TokenFactory.deploy();
      await token.waitForDeployment();

      const VaultHubFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
      const GuardianVaultFactory = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:GuardianVaultStub");

      const hub = await VaultHubFactory.deploy();
      const subscriberVault = await GuardianVaultFactory.deploy();
      const merchantVault = await GuardianVaultFactory.deploy();
      await hub.waitForDeployment();
      await subscriberVault.waitForDeployment();
      await merchantVault.waitForDeployment();

      await hub.setVault(subscriber.address, await subscriberVault.getAddress());
      await hub.setVault(merchant.address, await merchantVault.getAddress());

      const ManagerFactory = await ethers.getContractFactory("SubscriptionManager");
      const manager = await ManagerFactory.deploy(await hub.getAddress(), dao.address, ethers.ZeroAddress);
      await manager.waitForDeployment();

      const paymentAmount = ethers.parseEther("5");
      await token.mint(await subscriberVault.getAddress(), paymentAmount);
      await subscriberVault.approve(await token.getAddress(), await manager.getAddress(), paymentAmount);

      await manager.connect(subscriber).createSubscription(
        merchant.address,
        await token.getAddress(),
        paymentAmount,
        3600,
        "sub"
      );

      const recorded = await manager.getSubscription(1);
      assert.equal(recorded.subscriberVault, await subscriberVault.getAddress());
      assert.equal(recorded.merchantVault, await merchantVault.getAddress());

      // Remap subscriber vault and ensure processing now fails closed.
      await hub.setVault(subscriber.address, other.address);

      await assert.rejects(async () => {
        await manager.connect(merchant).processPayment(1);
      });
    });
  });
});
