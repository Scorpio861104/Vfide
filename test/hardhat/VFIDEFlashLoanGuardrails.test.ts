import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDEFlashLoan guardrails", () => {
  it("rejects dust initial registration deposits", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lender, feeSink] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:ExemptableMintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const FlashLoan = await ethers.getContractFactory("VFIDEFlashLoan");
    const flashLoan = await FlashLoan.deploy(
      await token.getAddress(),
      dao.address,
      ethers.ZeroAddress,
      feeSink.address,
    );
    await flashLoan.waitForDeployment();

    await token.setSystemExempt(await flashLoan.getAddress(), true);
    await flashLoan.connect(dao).confirmSystemExempt();

    await token.mint(lender.address, ethers.parseEther("10"));
    await token.connect(lender).approve(await flashLoan.getAddress(), ethers.parseEther("10"));

    await assert.rejects(
      () => flashLoan.connect(lender).deposit(ethers.parseEther("0.5")),
      /FL_MinInitialDeposit|revert/i
    );

    await flashLoan.connect(lender).deposit(ethers.parseEther("1"));
    assert.equal(await flashLoan.lenderCount(), 1n);
  });

  it("recycles lender slots after full withdrawal", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lender, feeSink] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:ExemptableMintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const FlashLoan = await ethers.getContractFactory("VFIDEFlashLoan");
    const flashLoan = await FlashLoan.deploy(
      await token.getAddress(),
      dao.address,
      ethers.ZeroAddress,
      feeSink.address,
    );
    await flashLoan.waitForDeployment();

    await token.setSystemExempt(await flashLoan.getAddress(), true);
    await flashLoan.connect(dao).confirmSystemExempt();

    const amount = ethers.parseEther("2");
    await token.mint(lender.address, amount);
    await token.connect(lender).approve(await flashLoan.getAddress(), amount);
    await flashLoan.connect(lender).deposit(amount);

    assert.equal(await flashLoan.lenderCount(), 1n);

    await flashLoan.connect(lender).withdraw(amount);

    const lenderInfo = await flashLoan.getLenderInfo(lender.address);
    assert.equal(lenderInfo.isRegistered, false);
    assert.equal(await flashLoan.lenderCount(), 0n);
  });
});