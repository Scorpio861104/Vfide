import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.connect();

describe("VFIDEEnterpriseGateway guardrails", function () {
  async function deployFixture(useRevertingSeer = false) {
    const [dao, oracle, buyer, merchant, rescuer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestMintableToken");
    const token = await Token.deploy();
    const stable = await Token.deploy();
    await token.waitForDeployment();
    await stable.waitForDeployment();

    await token.mint(buyer.address, ethers.parseEther("1000"));
    await stable.mint(rescuer.address, ethers.parseEther("500"));

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await VaultHubStub.deploy();
    await hub.waitForDeployment();

    let seerAddress = dao.address;
    if (useRevertingSeer) {
      const AlwaysRevertStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:AlwaysRevertStub");
      const seer = await AlwaysRevertStub.deploy();
      await seer.waitForDeployment();
      seerAddress = await seer.getAddress();
    }

    const Gateway = await ethers.getContractFactory("VFIDEEnterpriseGateway");
    const gateway = await Gateway.deploy(
      dao.address,
      await token.getAddress(),
      seerAddress,
      await hub.getAddress(),
      oracle.address,
      merchant.address,
    );
    await gateway.waitForDeployment();

    return { dao, oracle, buyer, merchant, rescuer, token, stable, gateway };
  }

  it("prevents rescuing escrowed VFIDE pending orders", async function () {
    const f = await deployFixture();

    await f.token.connect(f.buyer).approve(await f.gateway.getAddress(), ethers.parseEther("100"));
    await f.gateway.connect(f.buyer).createOrder(
      ethers.keccak256(ethers.toUtf8Bytes("order-1")),
      ethers.parseEther("100"),
      "order-1",
    );

    expect(await f.gateway.totalPendingOrderAmount()).to.equal(ethers.parseEther("100"));

    await expect(
      f.gateway.connect(f.dao).rescueFunds(await f.token.getAddress(), ethers.parseEther("1"), f.dao.address)
    ).to.be.revertedWithCustomError(f.gateway, "ENT_InsufficientAvailable");
  });

  it("allows rescuing non-escrow tokens", async function () {
    const f = await deployFixture();

    await f.stable.connect(f.rescuer).transfer(await f.gateway.getAddress(), ethers.parseEther("50"));

    const daoBefore = await f.stable.balanceOf(f.dao.address);
    await f.gateway.connect(f.dao).rescueFunds(await f.stable.getAddress(), ethers.parseEther("10"), f.dao.address);
    const daoAfter = await f.stable.balanceOf(f.dao.address);

    expect(daoAfter - daoBefore).to.equal(ethers.parseEther("10"));
  });

  it("accepts non-standard ERC20 tokens in createOrder", async function () {
    const [dao, oracle, buyer, merchant] = await ethers.getSigners();

    const NonStandard = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockNonStandardERC20");
    const nonStandard = await NonStandard.connect(dao).deploy("Mock USDT", "mUSDT", ethers.parseEther("1000"));
    await nonStandard.waitForDeployment();

    await nonStandard.connect(dao).transfer(buyer.address, ethers.parseEther("100"));

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await VaultHubStub.deploy();
    await hub.waitForDeployment();

    const Gateway = await ethers.getContractFactory("VFIDEEnterpriseGateway");
    const gateway = await Gateway.deploy(
      dao.address,
      await nonStandard.getAddress(),
      dao.address,
      await hub.getAddress(),
      oracle.address,
      merchant.address,
    );
    await gateway.waitForDeployment();

    const orderId = ethers.keccak256(ethers.toUtf8Bytes("order-non-standard"));
    await nonStandard.connect(buyer).approve(await gateway.getAddress(), ethers.parseEther("25"));
    await gateway.connect(buyer).createOrder(orderId, ethers.parseEther("25"), "order-non-standard");

    const order = await gateway.orders(orderId);
    expect(order.buyer).to.equal(buyer.address);
    expect(order.amount).to.equal(ethers.parseEther("25"));
    expect(await gateway.totalPendingOrderAmount()).to.equal(ethers.parseEther("25"));
  });

  it("emits SeerRewardFailed when trust reward call reverts", async function () {
    const f = await deployFixture(true);
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("order-reward-fail"));

    await f.token.connect(f.buyer).approve(await f.gateway.getAddress(), ethers.parseEther("25"));
    await f.gateway.connect(f.buyer).createOrder(orderId, ethers.parseEther("25"), "order-reward-fail");

    const tx = await f.gateway.connect(f.oracle).settleOrder(orderId);
    const receipt = await tx.wait();
    expect(receipt).to.not.equal(null);

    let settledSeen = false;
    let rewardFailedSeen = false;
    for (const log of receipt!.logs) {
      try {
        const parsed = f.gateway.interface.parseLog(log);
        if (parsed?.name === "OrderSettled") {
          settledSeen = true;
        }
        if (parsed?.name === "SeerRewardFailed") {
          rewardFailedSeen = true;
          expect(parsed.args.orderId).to.equal(orderId);
          expect(parsed.args.buyer).to.equal(f.buyer.address);
          expect(parsed.args.delta).to.equal(10n);
        }
      } catch {
        // Ignore non-gateway logs.
      }
    }

    expect(settledSeen).to.equal(true);
    expect(rewardFailedSeen).to.equal(true);
  });

  it("keeps oracle and merchant wallet roles distinct across constructor and updates", async function () {
    const [dao, oracle, buyer, merchant] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestMintableToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await VaultHubStub.deploy();
    await hub.waitForDeployment();

    const Gateway = await ethers.getContractFactory("VFIDEEnterpriseGateway");

    await expect(
      Gateway.deploy(
        dao.address,
        await token.getAddress(),
        dao.address,
        await hub.getAddress(),
        merchant.address,
        merchant.address,
      )
    ).to.be.revertedWith("ENT: oracle must differ from merchant");

    const gateway = await Gateway.deploy(
      dao.address,
      await token.getAddress(),
      dao.address,
      await hub.getAddress(),
      oracle.address,
      merchant.address,
    );
    await gateway.waitForDeployment();

    await expect(gateway.connect(dao).setOracle(merchant.address)).to.be.revertedWith(
      "ENT: oracle must differ from merchant"
    );

    await expect(gateway.connect(dao).setMerchantWallet(oracle.address)).to.be.revertedWith(
      "ENT: oracle must differ from merchant"
    );

    await gateway.connect(dao).setMerchantWallet(buyer.address);
    await expect(gateway.connect(dao).setOracle(buyer.address)).to.be.revertedWith(
      "ENT: oracle must differ from pending merchant"
    );
  });

  it("uses forceApprove-compatible flow for zero-first tokens", async function () {
    const [owner] = await ethers.getSigners();

    const ZeroFirst = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockZeroFirstApproveERC20");
    const token = await ZeroFirst.connect(owner).deploy("Zero First", "ZFA", ethers.parseEther("1"));
    await token.waitForDeployment();

    const Placeholder = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:Placeholder");
    const spender = await Placeholder.deploy();
    await spender.waitForDeployment();

    const ForceApproveHarness = await ethers.getContractFactory("test/contracts/helpers/SafeERC20Harness.sol:ForceApproveHarness");
    const harness = await ForceApproveHarness.deploy();
    await harness.waitForDeployment();

    // Seed stale allowance to emulate zero-first token edge case.
    await token.seedAllowance(await harness.getAddress(), await spender.getAddress(), 1n);

    await harness.forceApproveToken(await token.getAddress(), await spender.getAddress(), 25n);
    expect(await token.allowance(await harness.getAddress(), await spender.getAddress())).to.equal(25n);

    await harness.forceApproveToken(await token.getAddress(), await spender.getAddress(), 5n);
    expect(await token.allowance(await harness.getAddress(), await spender.getAddress())).to.equal(5n);
  });
});
