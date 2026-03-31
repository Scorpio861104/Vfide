import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("Complete audit blockers", () => {
  it("UserVaultLegacy inheritance threshold uses majority for snapshot count >= 3", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner, g1, g2, g3, g4, nextOfKin] = await ethers.getSigners();

    const Legacy = await ethers.getContractFactory("UserVaultLegacy");
    const legacy = await Legacy.deploy(
      owner.address,
      owner.address,
      owner.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
    await legacy.waitForDeployment();

    await legacy.connect(owner).setNextOfKin(nextOfKin.address);

    await legacy.connect(owner).setGuardian(g1.address, true);
    await legacy.connect(owner).setGuardian(g2.address, true);
    await legacy.connect(owner).setGuardian(g3.address, true);
    await legacy.connect(owner).setGuardian(g4.address, true);

    // Request inheritance to snapshot 4 guardians.
    await legacy.connect(nextOfKin).requestInheritance();

    const statusBefore = await legacy.getInheritanceStatus();
    assert.equal(statusBefore[5], 3n);

    // Two guardian votes are no longer enough to cancel inheritance at snapshot=4.
    await legacy.connect(g1).guardianCancelInheritance();
    await legacy.connect(g2).guardianCancelInheritance();

    const statusAfterTwo = await legacy.getInheritanceStatus();
    assert.equal(statusAfterTwo[0], true);

    await legacy.connect(g3).guardianCancelInheritance();
    const statusAfterThree = await legacy.getInheritanceStatus();
    assert.equal(statusAfterThree[0], false);
  });

  it("ProofScoreBurnRouter reverse calculator returns net >= desired", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner, user, to, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(user.address, 6500);

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
    );
    await router.waitForDeployment();

    const desiredNet = 1000n * 10n ** 18n;

    const checkout = await router.previewCheckout(user.address, to.address, desiredNet);
    const grossAmount = checkout[0] as bigint;
    const totalFee = checkout[4] as bigint;
    const netAmount = checkout[5] as bigint;

    assert.ok(grossAmount >= desiredNet);
    assert.ok(netAmount >= desiredNet);
    assert.equal(grossAmount - totalFee, netAmount);

    const computed = await router.computeFees(user.address, to.address, grossAmount);
    const feeSum = (computed[0] as bigint) + (computed[1] as bigint) + (computed[2] as bigint);
    assert.equal(grossAmount - feeSum, netAmount);
  });
});
