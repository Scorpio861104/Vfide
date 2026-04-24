import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.connect();

describe("DAO admin transfer guardrails", function () {
  async function deployFixture() {
    const [admin, nextAdmin, other] = await ethers.getSigners();

    const Placeholder = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:Placeholder");
    const seer = await Placeholder.deploy();
    const hub = await Placeholder.deploy();
    const hooks = await Placeholder.deploy();
    await seer.waitForDeployment();
    await hub.waitForDeployment();
    await hooks.waitForDeployment();

    const TimelockStub = await ethers.getContractFactory("test/contracts/helpers/DAOAdminTimelockStub.sol:DAOAdminTimelockStub");
    const timelock = await TimelockStub.deploy();
    await timelock.waitForDeployment();

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(
      admin.address,
      await timelock.getAddress(),
      await seer.getAddress(),
      await hub.getAddress(),
      await hooks.getAddress(),
    );
    await dao.waitForDeployment();

    return { admin, nextAdmin, other, dao, timelock };
  }

  it("requires pending admin to accept transfer", async function () {
    const f = await deployFixture();

    await f.timelock.callSetAdmin(await f.dao.getAddress(), f.nextAdmin.address);

    expect(await f.dao.admin()).to.equal(f.admin.address);
    expect(await f.dao.pendingAdmin()).to.equal(f.nextAdmin.address);

    await expect(f.dao.connect(f.other).acceptAdmin()).to.be.revertedWithCustomError(f.dao, "DAO_NotPendingAdmin");

    await f.dao.connect(f.nextAdmin).acceptAdmin();
    expect(await f.dao.admin()).to.equal(f.nextAdmin.address);
    expect(await f.dao.pendingAdmin()).to.equal(ethers.ZeroAddress);
  });

  it("allows timelock to cancel pending admin transfer", async function () {
    const f = await deployFixture();

    await f.timelock.callSetAdmin(await f.dao.getAddress(), f.nextAdmin.address);
    expect(await f.dao.pendingAdmin()).to.equal(f.nextAdmin.address);

    await f.timelock.callCancelPendingAdmin(await f.dao.getAddress());
    expect(await f.dao.pendingAdmin()).to.equal(ethers.ZeroAddress);

    await expect(f.dao.connect(f.nextAdmin).acceptAdmin()).to.be.revertedWithCustomError(f.dao, "DAO_NotPendingAdmin");
  });
});
