import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("ProofScoreBurnRouter fee guards", () => {
  async function fixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner, user, sanctum, burn, ecosystem] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const TokenStub = await ethers.getContractFactory("TokenStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const Router = await ethers.getContractFactory("ProofScoreBurnRouter");
    const router = await Router.deploy(
      await seer.getAddress(),
      sanctum.address,
      burn.address,
      ecosystem.address,
      await token.getAddress(),
    );
    await router.waitForDeployment();

    return { ethers, owner, user, seer, token, router };
  }

  async function deploy() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(fixture);
  }

  it("rejects micro-tx ceiling values below the configured fee floor", async () => {
    const { owner, router } = await deploy();

    await assert.rejects(
      () => router.connect(owner).setMicroTxFeeCeiling(24, 10n ** 18n),
      /BURN: micro ceiling below floor|revert/
    );
  });

  it("keeps total computed fees bounded by amount", async () => {
    const { owner, user, seer, router } = await deploy();

    await seer.setScore(owner.address, 4000);

    const amount = 1_000_000n;
    const [burnAmount, sanctumAmount, ecosystemAmount] =
      await router.computeFees(owner.address, user.address, amount);

    const totalFees = burnAmount + sanctumAmount + ecosystemAmount;
    assert.ok(totalFees <= amount);
  });
});
