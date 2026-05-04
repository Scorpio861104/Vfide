import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("MultiCurrencyRouter recommended router timelock", () => {
  it("queues and applies recommended router updates only after 48h", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, vfide, rec0, rec1] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MainstreamPriceOracle");
    const oracle = await Oracle.deploy(dao.address, 10n * 10n ** 18n);
    await oracle.waitForDeployment();

    const Router = await ethers.getContractFactory("MultiCurrencyRouter");
    const router = await Router.deploy(
      dao.address,
      vfide.address,
      await oracle.getAddress(),
      rec0.address,
    );
    await router.waitForDeployment();

    assert.equal(await router.recommendedRouter(), rec0.address);

    await router.connect(dao).setRecommendedRouter(rec1.address);

    await assert.rejects(
      () => router.connect(dao).applyRecommendedRouter(),
      /MCR: router timelocked/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await router.connect(dao).applyRecommendedRouter();
    assert.equal(await router.recommendedRouter(), rec1.address);
  });
});
