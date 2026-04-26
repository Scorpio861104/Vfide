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

      await registry.setGovernance(signers[1].address);

      await assert.rejects(async () => {
        await registry.addStablecoin(await token.getAddress(), 6, "USDC");
      });

      await registry.connect(signers[1]).addStablecoin(await token.getAddress(), 6, "USDC");
      assert.equal(await registry.isWhitelisted(await token.getAddress()), true);
      assert.equal(await registry.tokenDecimals(await token.getAddress()), 6n);
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
});
