import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("MainstreamPriceOracle force price timelock", () => {
  it("queues force price updates behind a 24h timelock", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MainstreamPriceOracle");
    const oracle = await Oracle.deploy(dao.address, 10n * 10n ** 18n);
    await oracle.waitForDeployment();

    await oracle.connect(dao).forceSetPrice(8n * 10n ** 18n);

    await assert.rejects(
      () => oracle.connect(dao).applyForceSetPrice(),
      /PO: force price timelocked/
    );

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await oracle.connect(dao).applyForceSetPrice();
    assert.equal(await oracle.vfidePerUsd(), 8n * 10n ** 18n);
  });

  it("rejects force price decreases greater than 50%", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MainstreamPriceOracle");
    const oracle = await Oracle.deploy(dao.address, 10n * 10n ** 18n);
    await oracle.waitForDeployment();

    await assert.rejects(
      () => oracle.connect(dao).forceSetPrice(4n * 10n ** 18n),
      /PO: price change too large/
    );

    await oracle.connect(dao).forceSetPrice(5n * 10n ** 18n);
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(dao).applyForceSetPrice();

    assert.equal(await oracle.vfidePerUsd(), 5n * 10n ** 18n);
  });
});
