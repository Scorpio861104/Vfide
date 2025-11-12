const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mocks coverage: LedgerMock and ReenteringERC20", function () {
  let owner, alice, bob;
  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
  });

  it("LedgerMock: exercises emit and revert branches via StablecoinRegistry calls", async function () {
    const Ledger = await ethers.getContractFactory("LedgerMock");
    // start with non-reverting ledger
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const SCR = await ethers.getContractFactory("StablecoinRegistry");
    const scr = await SCR.deploy(owner.address, ledger.target);
    await scr.waitForDeployment();

    // calling a DAO function should trigger the ledger.logSystemEvent emit when ledger willRevert==false
    await expect(scr.connect(owner).setDAO(owner.address)).to.emit(scr, "DAOSet");
    // switch ledger to revert path
    await ledger.setRevert(true);

    // calling again should still succeed (try/catch in _log) even though ledger will revert internally
    await expect(scr.connect(owner).setDAO(owner.address)).to.emit(scr, "DAOSet");
  });

  it("LedgerMock: exercises logEvent path (addAsset) both emit and revert branches", async function () {
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const SCR = await ethers.getContractFactory("StablecoinRegistry");
    const scr = await SCR.deploy(owner.address, ledger.target);
    await scr.waitForDeployment();

    // deploy a simple ERC20 mock to add as an asset
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const t1 = await ERC20.deploy("A","A"); await t1.waitForDeployment();
    const t2 = await ERC20.deploy("B","B"); await t2.waitForDeployment();

    // ledger not reverting -> addAsset should emit AssetAdded and ledger Logged
    await expect(scr.connect(owner).addAsset(t1.target, "A")).to.emit(scr, "AssetAdded");

    // now set ledger to revert and add a different asset; the internal ledger.logEvent will revert but caller swallows it
    await ledger.setRevert(true);
    await expect(scr.connect(owner).addAsset(t2.target, "B")).to.emit(scr, "AssetAdded");
  });

  it("LedgerMock: direct calls exercise both logSystemEvent/logEvent branches", async function () {
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    // direct emit paths
    await expect(ledger.logSystemEvent(owner.address, "sys", owner.address)).to.emit(ledger, "LoggedSystem");
    await expect(ledger.logEvent(owner.address, "ev", 1, "n")).to.emit(ledger, "Logged");

    // direct revert paths
    await ledger.setRevert(true);
    await expect(ledger.logSystemEvent(owner.address, "sys", owner.address)).to.be.revertedWith("ledger revert");
    await expect(ledger.logEvent(owner.address, "ev", 1, "n")).to.be.revertedWith("ledger revert");
  });

  it("ReenteringERC20: covers balance guard and reentry path", async function () {
    const Reenter = await ethers.getContractFactory("ReenteringERC20");
    const re = await Reenter.deploy();
    await re.waitForDeployment();

    const Target = await ethers.getContractFactory("ReenterTargetMock");
    const target = await Target.deploy();
    await target.waitForDeployment();

    // insufficient balance -> revert with 'balance'
    await expect(re.transfer(bob.address, 1)).to.be.revertedWith("balance");

    // mint and set reenter target, then transfer to trigger release()
    await re.mint(owner.address, 10);
    // set reenter target and id (use 42)
    await re.setReenter(target.target, 42);

    // transfer should succeed and trigger the target contract's Released event
    await expect(re.transfer(bob.address, 1)).to.emit(target, "Released").withArgs(42, re.target);
  });

  it("ReverterEscrow: covers release/refund emit and revert paths", async function () {
    const RE = await ethers.getContractFactory("ReverterEscrow");
    const re = await RE.deploy(); await re.waitForDeployment();

    // non-reverting path emits
    await expect(re.release(1)).to.emit(re, "Released").withArgs(1);
    await expect(re.refund(2)).to.emit(re, "Refunded").withArgs(2);

    // set revert and ensure functions revert
    await re.setRevert(true);
    await expect(re.release(3)).to.be.revertedWith("revert-release");
    await expect(re.refund(4)).to.be.revertedWith("revert-refund");
  });

  it("BurnRouterMock: set and computeFees paths", async function () {
    const BR = await ethers.getContractFactory("BurnRouterMock");
    const br = await BR.deploy(); await br.waitForDeployment();

    // default zero values
    let fees = await br.computeFees(owner.address, bob.address, 10);
    expect(fees[0]).to.equal(0);

    // set non-zero values and read back
    await br.set(5, 7, alice.address, bob.address);
    fees = await br.computeFees(owner.address, bob.address, 10);
    expect(fees[0]).to.equal(5);
    expect(fees[1]).to.equal(7);
    expect(fees[2]).to.equal(alice.address);
    expect(fees[3]).to.equal(bob.address);
  });

  it("ReenteringERC20: transferFrom allowance branches (allowance/underflow and success)", async function () {
    const Reenter = await ethers.getContractFactory("ReenteringERC20");
    const re = await Reenter.deploy();
    await re.waitForDeployment();

    // mint to alice and attempt transferFrom by owner without approval -> should revert 'allowance'
    await re.mint(alice.address, 10);
    await expect(re.connect(owner).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("allowance");

    // now approve owner and perform transferFrom successfully
    await re.connect(alice).approve(owner.address, 5);
    await expect(re.connect(owner).transferFrom(alice.address, bob.address, 2)).to.be.not.reverted;
  });

  it("GasDrainerERC20: transfer and transferFrom paths (balance guard and success)", async function () {
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const g = await Gas.deploy(); await g.waitForDeployment();

    // insufficient balance on transfer should revert
    await expect(g.transfer(bob.address, 1)).to.be.revertedWith("balance");

    // mint and transfer should succeed
    await g.mint(owner.address, 100);
    await expect(g.transfer(bob.address, 1)).to.be.not.reverted;

    // transferFrom allowance path
    await g.mint(alice.address, 10);
    await expect(g.connect(owner).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("allowance");
    await g.connect(alice).approve(owner.address, 5);
    await expect(g.connect(owner).transferFrom(alice.address, bob.address, 2)).to.be.not.reverted;
  });

  it("GasDrainerERC20: explicit allowance-revert branch (zero allowance and small value)", async function () {
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const g = await Gas.deploy(); await g.waitForDeployment();

    // mint to alice so balance check passes, but do NOT approve owner -> should revert on allowance
    await g.mint(alice.address, 100);
    await expect(g.connect(owner).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("allowance");
  });

  it("GasDrainerERC20: TEST_checkAllowance covers both branches (false then true)", async function () {
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const g = await Gas.deploy(); await g.waitForDeployment();

    await g.mint(alice.address, 20);

    // allowance false before approve
    expect(await g.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(false);

    // approve then true
    await g.connect(alice).approve(owner.address, 3);
    expect(await g.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(true);
  });

  it("ReenteringERC20: explicit allowance-revert branch (zero allowance)", async function () {
    const Reenter = await ethers.getContractFactory("ReenteringERC20");
    const re = await Reenter.deploy();
    await re.waitForDeployment();

    // mint to alice so balance check passes, but do NOT approve owner -> should revert on allowance
    await re.mint(alice.address, 50);
    await expect(re.connect(owner).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("allowance");
  });

  it("ReenteringERC20: TEST_checkAllowance covers both branches (false then true)", async function () {
    const Reenter = await ethers.getContractFactory("ReenteringERC20");
    const re = await Reenter.deploy();
    await re.waitForDeployment();

    // mint so balance check would pass
    await re.mint(alice.address, 10);

    // before approve: allowance false
    expect(await re.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(false);

    // approve and then helper should return true
    await re.connect(alice).approve(owner.address, 5);
    expect(await re.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(true);
  });

  it("MerchantRegistryMock: setMerchant and info cover status branches", async function () {
    const MR = await ethers.getContractFactory("MerchantRegistryMock");
    // deploy with initial NONE (0)
    const mr = await MR.deploy(owner.address, owner.address, 1); // set ACTIVE initially
    await mr.waitForDeployment();

    // read info and confirm initial fields
    const info = await mr.info(owner.address);
    expect(info.owner).to.equal(owner.address);

    // change merchant to SUSPENDED (2) and then DELISTED (3) to exercise enum assignments
    await mr.setMerchant(alice.address, bob.address, 2);
    let info2 = await mr.info(alice.address);
    expect(info2.status).to.equal(2);

    await mr.setMerchant(owner.address, alice.address, 3);
    let info3 = await mr.info(owner.address);
    expect(info3.status).to.equal(3);
  });
});
