const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Extra mock branch coverage", function () {
  let owner, alice, bob;
  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
  });

  it("GasDrainer: extra TEST_checkAllowance edge cases and transferFrom reverts/succeeds", async function () {
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const g = await Gas.deploy();
    await g.waitForDeployment();

    // mint so balance checks pass for transferFrom tests
    await g.mint(alice.address, 50);

    // case: zero allowance and asking for 0 should be true (edge)
    expect(await g.TEST_checkAllowance(alice.address, owner.address, 0)).to.equal(true);

    // case: zero allowance and asking for 1 should be false
    expect(await g.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(false);

    // set an allowance of exactly 1 and check equality branch
    await g.connect(alice).approve(owner.address, 1);
    expect(await g.TEST_checkAllowance(alice.address, owner.address, 1)).to.equal(true);

    // transferFrom: attempt with insufficient allowance should revert
    await expect(g.connect(owner).transferFrom(alice.address, bob.address, 2)).to.be.revertedWith("allowance");

    // transferFrom: with exact allowance should succeed
    await expect(g.connect(owner).transferFrom(alice.address, bob.address, 1)).to.be.not.reverted;
  });

  it("ReenteringERC20: transfer with default (no reenter target) and with reenter target", async function () {
    const Reenter = await ethers.getContractFactory("ReenteringERC20");
    const re = await Reenter.deploy();
    await re.waitForDeployment();

    // mint to owner and ensure transfer works when reenterTarget == address(0)
    await re.mint(owner.address, 10);
    // transfer should work and not emit the external Released event (no target set)
    await expect(re.transfer(bob.address, 2)).to.be.not.reverted;
    expect((await re.balanceOf(bob.address)).toString()).to.equal("2");

    // now deploy a real reenter target that emits on release
    const Target = await ethers.getContractFactory("ReenterTargetMock");
    const target = await Target.deploy();
    await target.waitForDeployment();

    // mint and set target, then transfer to trigger the release() call
    await re.mint(alice.address, 5);
    await re.setReenter(target.target, 7);

    // transfer should succeed and trigger the Released event on the target
    await expect(re.connect(alice).transfer(bob.address, 1)).to.emit(target, "Released").withArgs(7, re.target);
  });
});
