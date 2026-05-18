import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VaultRegistry vaultHub timelock", () => {
  it("queues and applies setVaultHub after 48h", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hubA = await Hub.deploy();
    const hubB = await Hub.deploy();
    await hubA.waitForDeployment();
    await hubB.waitForDeployment();

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hubA.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    await registry.connect(owner).setVaultHub(await hubB.getAddress());

    await assert.rejects(
      () => registry.connect(owner).applyVaultHub(),
      /ModuleChangeNotReady|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await registry.connect(owner).applyVaultHub();
    assert.equal(await registry.vaultHub(), await hubB.getAddress());
  });

  it("allows cancelling a pending vaultHub update", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hubA = await Hub.deploy();
    const hubB = await Hub.deploy();
    await hubA.waitForDeployment();
    await hubB.waitForDeployment();

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hubA.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    await registry.connect(owner).setVaultHub(await hubB.getAddress());
    await registry.connect(owner).cancelVaultHubChange();

    const pending = await registry.pendingVaultHubChange();
    assert.equal(pending.vaultHub, ethers.ZeroAddress);
    assert.equal(pending.executeAfter, 0n);

    await assert.rejects(
      () => registry.connect(owner).applyVaultHub(),
      /NoPendingModuleChange|revert/
    );
  });
});
