import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("MainstreamPriceOracle updater cooldown", () => {
  it("enforces per-updater cooldown while allowing a different updater", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, updaterA, updaterB] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("MainstreamPriceOracle");
    const oracle = await Oracle.deploy(dao.address, 10n * 10n ** 18n);
    await oracle.waitForDeployment();

    await oracle.connect(dao).setUpdater(updaterA.address, true);
    await oracle.connect(dao).setUpdater(updaterB.address, true);

    // Satisfy global update cooldown from constructor timestamp.
    await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await oracle.connect(updaterA).updatePrice(11n * 10n ** 18n);

    // Satisfy global cooldown again, but not per-updater cooldown (15 minutes).
    await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => oracle.connect(updaterA).updatePrice(12n * 10n ** 18n),
      /PO: updater cooldown active/
    );

    // Different updater can still update after global cooldown.
    await oracle.connect(updaterB).updatePrice(12n * 10n ** 18n);
    assert.equal(await oracle.vfidePerUsd(), 12n * 10n ** 18n);
  });
});
