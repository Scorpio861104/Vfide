import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("FeeDistributor (audit guardrails)", () => {
  async function deployDistributor() {
    const { ethers } = (await network.connect()) as any;
    const [admin, burn, sanctum, dao, merchants, headhunters, replacement] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockERC20");
    const token = await MockERC20.deploy("VFIDE", "VFD", ethers.parseEther("200000000"));
    await token.waitForDeployment();

    const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
    const distributor = await FeeDistributor.deploy(
      await token.getAddress(),
      burn.address,
      sanctum.address,
      dao.address,
      merchants.address,
      headhunters.address,
      admin.address,
    );
    await distributor.waitForDeployment();

    const fee = ethers.parseEther("10000");
    await token.transfer(await distributor.getAddress(), fee);
    await distributor.connect(admin).receiveFee(fee);

    return { ethers, distributor, token, fee, burn, sanctum, dao, merchants, headhunters, replacement, admin };
  }

  it("burns the burn allocation instead of transferring it to the burn sink", async () => {
    const { distributor, token, fee, burn } = await deployDistributor();

    const totalSupplyBefore = await token.totalSupply();
    await distributor.distribute();

    const burned = (fee * 3500n) / 10000n;
    assert.equal(await token.balanceOf(burn.address), 0n);
    assert.equal(await distributor.totalBurned(), burned);
    assert.equal(await token.totalSupply(), totalSupplyBefore - burned);
  });

  it("rejects untrusted receiveFee callers", async () => {
    const { distributor, replacement, fee } = await deployDistributor();

    await assert.rejects(
      () => distributor.connect(replacement).receiveFee(fee),
      /NotAuthorized|revert/
    );
  });

  it("falls back to the burn sink when token burn reverts", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin, burn, sanctum, dao, merchants, headhunters] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockRevertingBurnERC20");
    const token = await MockToken.deploy("VFIDE", "VFD", ethers.parseEther("200000000"));
    await token.waitForDeployment();

    const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
    const distributor = await FeeDistributor.deploy(
      await token.getAddress(),
      burn.address,
      sanctum.address,
      dao.address,
      merchants.address,
      headhunters.address,
      admin.address,
    );
    await distributor.waitForDeployment();

    const fee = ethers.parseEther("10000");
    await token.transfer(await distributor.getAddress(), fee);
    await distributor.connect(admin).receiveFee(fee);
    await token.setRevertBurn(true);

    await distributor.distribute();

    const expectedBurn = (fee * 3500n) / 10000n;
    assert.equal(await token.balanceOf(burn.address), expectedBurn);
    assert.equal(await distributor.totalBurned(), 0n);
  });

  it("delays destination changes until the timelock expires", async () => {
    const { ethers, distributor, dao, replacement, admin } = await deployDistributor();

    await distributor.connect(admin).setDestination("dao", replacement.address);
    assert.equal(await distributor.daoPayrollPool(), dao.address);

    await assert.rejects(
      () => distributor.connect(admin).executeDestinationChange(),
      /SplitChangeNotReady|revert/
    );

    await ethers.provider.send("evm_increaseTime", [72 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await distributor.connect(admin).executeDestinationChange();
    assert.equal(await distributor.daoPayrollPool(), replacement.address);
  });

  it("allows pending destination changes to be cancelled", async () => {
    const { distributor, dao, replacement, admin } = await deployDistributor();

    await distributor.connect(admin).setDestination("dao", replacement.address);
    await distributor.connect(admin).cancelDestinationChange();

    await assert.rejects(
      () => distributor.connect(admin).executeDestinationChange(),
      /NoSplitChangePending|revert/
    );

    assert.equal(await distributor.daoPayrollPool(), dao.address);
  });
});