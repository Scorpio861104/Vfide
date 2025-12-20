const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Business Suite (Corporate Finance)", function () {
  let owner, employer, employee, supplier, tax;
  let usdc;
  let payrollManager, revenueSplitter;

  beforeEach(async function () {
    [owner, employer, employee, supplier, tax] = await ethers.getSigners();

    // Deploy Token
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    usdc = await ERC20Mock.deploy("USDC", "USDC");
    
    // Mint funds to employer
    await usdc.mint(employer.address, ethers.parseEther("10000"));
  });

  describe("PayrollManager (Streaming Salaries)", function () {
    beforeEach(async function () {
      const PayrollManager = await ethers.getContractFactory("PayrollManager");
      payrollManager = await PayrollManager.deploy();
    });

    it("should create a stream and allow withdrawal", async function () {
      const rate = ethers.parseEther("1"); // 1 token per second
      const deposit = ethers.parseEther("100");

      await usdc.connect(employer).approve(payrollManager.target, deposit);

      await expect(
        payrollManager.connect(employer).createStream(employee.address, usdc.target, rate, deposit)
      ).to.emit(payrollManager, "StreamCreated");

      // Fast forward 10 seconds
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      // Check claimable
      const claimable = await payrollManager.claimable(1);
      expect(claimable).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("1"));

      // Withdraw
      await expect(payrollManager.connect(employee).withdraw(1))
        .to.emit(payrollManager, "Withdraw");

      expect(await usdc.balanceOf(employee.address)).to.be.closeTo(ethers.parseEther("10"), ethers.parseEther("1"));
    });

    it("should cancel stream and return funds", async function () {
      const rate = ethers.parseEther("1");
      const deposit = ethers.parseEther("100");

      await usdc.connect(employer).approve(payrollManager.target, deposit);
      await payrollManager.connect(employer).createStream(employee.address, usdc.target, rate, deposit);

      // Fast forward 50 seconds (50% earned)
      await ethers.provider.send("evm_increaseTime", [50]);
      await ethers.provider.send("evm_mine");

      await payrollManager.connect(employer).cancelStream(1);

      // Employee gets ~50
      expect(await usdc.balanceOf(employee.address)).to.be.closeTo(ethers.parseEther("50"), ethers.parseEther("1"));
      // Employer gets ~50 back (started with 10000, spent 100, got 50 back -> 9950)
      expect(await usdc.balanceOf(employer.address)).to.be.closeTo(ethers.parseEther("9950"), ethers.parseEther("1"));
    });
  });

  describe("RevenueSplitter (Treasury)", function () {
    it("should split revenue correctly", async function () {
      // 40% Supplier, 30% Tax, 30% Profit (Owner)
      const shares = [4000, 3000, 3000];
      const accounts = [supplier.address, tax.address, owner.address];

      const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
      revenueSplitter = await RevenueSplitter.deploy(accounts, shares);

      // Send 1000 USDC to splitter
      await usdc.mint(revenueSplitter.target, ethers.parseEther("1000"));

      // Distribute
      await revenueSplitter.distribute(usdc.target);

      expect(await usdc.balanceOf(supplier.address)).to.equal(ethers.parseEther("400"));
      expect(await usdc.balanceOf(tax.address)).to.equal(ethers.parseEther("300"));
      expect(await usdc.balanceOf(owner.address)).to.equal(ethers.parseEther("300"));
    });
  });
});
