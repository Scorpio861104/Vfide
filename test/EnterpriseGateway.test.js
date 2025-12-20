const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDE Enterprise Gateway (Amazon Integration)", function () {
  let owner, buyer, amazonOracle, amazonWallet;
  let ledger, seer, vaultHub, token, gateway;

  before(async function () {
    [owner, buyer, amazonOracle, amazonWallet] = await ethers.getSigners();

    // 1. Deploy Dependencies
    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    ledger = await ProofLedger.deploy(owner.address);
    await ledger.waitForDeployment();

    const MockVaultHub = await ethers.getContractFactory("MockVaultHub");
    vaultHub = await MockVaultHub.deploy();
    await vaultHub.waitForDeployment();

    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(owner.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
    await token.waitForDeployment();

    // 2. Deploy Enterprise Gateway
    const Gateway = await ethers.getContractFactory("VFIDEEnterpriseGateway");
    gateway = await Gateway.deploy(
        owner.address,
        await token.getAddress(),
        await seer.getAddress(),
        await vaultHub.getAddress(),
        amazonOracle.address,
        amazonWallet.address
    );
    await gateway.waitForDeployment();

    // 3. Setup Permissions
    // Gateway needs to be authorized in Seer to give rewards
    await seer.setAuth(await gateway.getAddress(), true);

    // 4. Fund Buyer
    await token.mint(buyer.address, ethers.parseEther("1000"));
    await token.connect(buyer).approve(await gateway.getAddress(), ethers.parseEther("1000"));
  });

  it("should allow user to create an order (Lock Funds)", async function () {
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("AMZN-12345"));
    const amount = ethers.parseEther("50");

    await expect(gateway.connect(buyer).createOrder(orderId, amount, "Amazon Order #12345"))
        .to.emit(gateway, "OrderCreated")
        .withArgs(orderId, buyer.address, amount, "Amazon Order #12345");

    // Check Gateway Balance
    expect(await token.balanceOf(await gateway.getAddress())).to.equal(amount);
  });

  it("should allow Oracle (Amazon) to settle order and reward user", async function () {
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("AMZN-12345"));
    const amount = ethers.parseEther("50");
    
    // Check Buyer Score Before (Default 500)
    // Note: Seer defaults to 500.
    // We need to make sure Seer is fresh or we know the score.
    // In this test suite, it's fresh.
    // Wait, Seer calculates score dynamically.
    // Let's check delta.
    const deltaBefore = await seer.reputationDelta(buyer.address);
    expect(deltaBefore).to.equal(0);

    // Settle
    await expect(gateway.connect(amazonOracle).settleOrder(orderId))
        .to.emit(gateway, "OrderSettled")
        .withArgs(orderId, buyer.address, amount);

    // Check Funds Moved to Amazon Wallet
    expect(await token.balanceOf(amazonWallet.address)).to.equal(amount);

    // Check Trust Reward (Delta should increase by 10)
    const deltaAfter = await seer.reputationDelta(buyer.address);
    expect(deltaAfter).to.equal(10);
  });

  it("should allow Oracle to refund an order", async function () {
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("AMZN-REFUND-TEST"));
    const amount = ethers.parseEther("20");

    // Create Order
    await gateway.connect(buyer).createOrder(orderId, amount, "Refund Test");

    // Refund
    const buyerBalanceBefore = await token.balanceOf(buyer.address);
    
    await expect(gateway.connect(amazonOracle).refundOrder(orderId, "Item Out of Stock"))
        .to.emit(gateway, "OrderRefunded")
        .withArgs(orderId, buyer.address, amount, "Item Out of Stock");

    const buyerBalanceAfter = await token.balanceOf(buyer.address);
    expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(amount);
  });

  it("should prevent unauthorized settlement", async function () {
    const orderId = ethers.keccak256(ethers.toUtf8Bytes("AMZN-HACK-TEST"));
    const amount = ethers.parseEther("10");
    await gateway.connect(buyer).createOrder(orderId, amount, "Hack Test");

    // Buyer tries to settle their own order
    await expect(gateway.connect(buyer).settleOrder(orderId))
        .to.be.revertedWithCustomError(gateway, "ENT_NotOracle");
  });
});
