const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Uncovered mocks coverage", function () {
  let deployer, alice;
  before(async () => {
    [deployer, alice] = await ethers.getSigners();
  });

  it("ReenterTargetMock emits Released", async () => {
    const C = await ethers.getContractFactory("ReenterTargetMock");
  const c = await C.deploy();
  await c.waitForDeployment();
    await expect(c.release(42)).to.emit(c, "Released").withArgs(42, deployer.address);
  });

  it("ReverterEscrow emits and reverts correctly", async () => {
    const C = await ethers.getContractFactory("ReverterEscrow");
  const c = await C.deploy();
  await c.waitForDeployment();

    await c.setRevert(false);
    await expect(c.release(1)).to.emit(c, "Released").withArgs(1);
    await expect(c.refund(2)).to.emit(c, "Refunded").withArgs(2);

    await c.setRevert(true);
    await expect(c.release(3)).to.be.revertedWith("revert-release");
    await expect(c.refund(4)).to.be.revertedWith("revert-refund");
  });

  it("RevertingDecimals fallback reverts on plain call", async () => {
    const C = await ethers.getContractFactory("RevertingDecimals");
  const c = await C.deploy();
  await c.waitForDeployment();

    // send a raw txn (empty calldata) to trigger fallback (use .target address)
    await expect(
      deployer.sendTransaction({ to: c.target, data: "0x" })
    ).to.be.revertedWith("revert-decimals");
  });

  it("SecurityHubMock and SeerMock basic behaviors", async () => {
    const S = await ethers.getContractFactory("SecurityHubMock");
  const s = await S.deploy();
  await s.waitForDeployment();
    expect(await s.isLocked(deployer.address)).to.equal(false);
    await s.setLocked(deployer.address, true);
    expect(await s.isLocked(deployer.address)).to.equal(true);

  const Se = await ethers.getContractFactory("SeerMock");
  const se = await Se.deploy();
  await se.waitForDeployment();
    expect(await se.getScore(deployer.address)).to.equal(0);
    await se.setScore(deployer.address, 42);
    expect(await se.getScore(deployer.address)).to.equal(42);
    await se.setMin(7);
    expect(await se.minForMerchant()).to.equal(7);
  });

  it("VaultHubMock vaultOf and TestVFIDEHarness TEST helpers", async () => {
    const V = await ethers.getContractFactory("VaultHubMock");
  const v = await V.deploy();
  await v.waitForDeployment();
    await v.setVault(deployer.address, deployer.address);
    expect(await v.vaultOf(deployer.address)).to.equal(deployer.address);

    const L = await ethers.getContractFactory("LedgerMock");
  const l = await L.deploy(false);
  await l.waitForDeployment();

    const Test = await ethers.getContractFactory("TestVFIDEHarness");
  const testToken = await Test.deploy(v.target, v.target, l.target, "0x0000000000000000000000000000000000000000");
  await testToken.waitForDeployment();

    // mint to alice via exposed helper and verify
  await testToken.TEST_exposed_mint(alice.address, ethers.parseUnits("1", 18));
  expect(await testToken.balanceOf(alice.address)).to.equal(ethers.parseUnits("1", 18));

    // call exposed transfer with from==address(0) should revert with VF_ZERO (custom error)
  await expect(testToken.TEST_expose_transfer("0x0000000000000000000000000000000000000000", alice.address, 1)).to.be.reverted;
  });

  it("LedgerMock logEvent and logSystemEvent revert paths", async () => {
  const L = await ethers.getContractFactory("LedgerMock");
  const l = await L.deploy(false);
  await l.waitForDeployment();

    await expect(l.logSystemEvent(deployer.address, "act", deployer.address)).to.emit(l, "LoggedSystem");
    await expect(l.logEvent(deployer.address, "act", 123, "note")).to.emit(l, "Logged");

    await l.setRevert(true);
    await expect(l.logSystemEvent(deployer.address, "x", deployer.address)).to.be.revertedWith("ledger revert");
    await expect(l.logEvent(deployer.address, "x", 1, "n")).to.be.revertedWith("ledger revert");
  });
});
