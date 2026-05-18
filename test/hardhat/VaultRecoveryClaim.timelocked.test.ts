import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let defaultConnectionPromise: Promise<any> | null = null;

async function getDefaultConnection() {
  defaultConnectionPromise ??= network.connect();
  return defaultConnectionPromise;
}

async function vaultRecoveryClaimFixture() {
  const { ethers } = await getDefaultConnection();
  const [owner, replacementHub, replacementRegistry, outsider] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("VaultRecoveryClaim");
  const contract = await Factory.deploy(owner.address, owner.address);
  await contract.waitForDeployment();

  return { contract, ethers, owner, replacementHub, replacementRegistry, outsider };
}

async function deployVaultRecoveryClaimFixture() {
  const { networkHelpers } = await getDefaultConnection();
  return networkHelpers.loadFixture(vaultRecoveryClaimFixture);
}

describe("VaultRecoveryClaim: Timelocked Module Updates", { concurrency: 1 }, () => {
  it("allows owner to propose vaultHub update with 48h timelock", async () => {
    const { contract, replacementHub, ethers } = await deployVaultRecoveryClaimFixture();

    await (await contract.setVaultHub(replacementHub.address)).wait();

    const pendingChange = await contract.pendingVaultHubChange();
    assert.equal(pendingChange.newAddress, replacementHub.address);
    assert.equal(
      pendingChange.executeAfter - BigInt((await ethers.provider.getBlock("latest"))!.timestamp),
      48n * 60n * 60n
    );
  });

  it("prevents vaultHub update before 48h timelock elapses", async () => {
    const { contract, replacementHub } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultHub(replacementHub.address);

    await assert.rejects(async () => contract.applyVaultHub(), /ModuleChangeNotReady|revert/);
  });

  it("applies vaultHub update after 48h timelock completes", async () => {
    const { contract, owner, replacementHub, ethers } = await deployVaultRecoveryClaimFixture();

    assert.equal(await contract.vaultHub(), owner.address);
    await contract.setVaultHub(replacementHub.address);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await contract.applyVaultHub()).wait();
    assert.equal(await contract.vaultHub(), replacementHub.address);
  });

  it("allows owner to cancel pending vaultHub change before timelock expires", async () => {
    const { contract, replacementHub, ethers } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultHub(replacementHub.address);
    await (await contract.cancelVaultHubChange()).wait();

    const pendingChange = await contract.pendingVaultHubChange();
    assert.equal(pendingChange.newAddress, ethers.ZeroAddress);
    assert.equal(pendingChange.executeAfter, 0n);
  });

  it("prevents concurrent vaultHub changes while one is pending", async () => {
    const { contract, replacementHub, replacementRegistry } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultHub(replacementHub.address);

    await assert.rejects(async () => contract.setVaultHub(replacementRegistry.address), /ModuleChangePending|revert/);
  });

  it("allows owner to propose vaultRegistry update with 48h timelock", async () => {
    const { contract, replacementRegistry, ethers } = await deployVaultRecoveryClaimFixture();

    await (await contract.setVaultRegistry(replacementRegistry.address)).wait();

    const pendingChange = await contract.pendingVaultRegistryChange();
    assert.equal(pendingChange.newAddress, replacementRegistry.address);
    assert.equal(
      pendingChange.executeAfter - BigInt((await ethers.provider.getBlock("latest"))!.timestamp),
      48n * 60n * 60n
    );
  });

  it("prevents vaultRegistry update before 48h timelock elapses", async () => {
    const { contract, replacementRegistry } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultRegistry(replacementRegistry.address);

    await assert.rejects(async () => contract.applyVaultRegistry(), /ModuleChangeNotReady|revert/);
  });

  it("applies vaultRegistry update after 48h timelock completes", async () => {
    const { contract, owner, replacementRegistry, ethers } = await deployVaultRecoveryClaimFixture();

    assert.equal(await contract.vaultRegistry(), owner.address);
    await contract.setVaultRegistry(replacementRegistry.address);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await contract.applyVaultRegistry()).wait();
    assert.equal(await contract.vaultRegistry(), replacementRegistry.address);
  });

  it("allows owner to cancel pending vaultRegistry change before timelock expires", async () => {
    const { contract, replacementRegistry, ethers } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultRegistry(replacementRegistry.address);
    await (await contract.cancelVaultRegistryChange()).wait();

    const pendingChange = await contract.pendingVaultRegistryChange();
    assert.equal(pendingChange.newAddress, ethers.ZeroAddress);
    assert.equal(pendingChange.executeAfter, 0n);
  });

  it("prevents concurrent vaultRegistry changes while one is pending", async () => {
    const { contract, replacementHub, replacementRegistry } = await deployVaultRecoveryClaimFixture();

    await contract.setVaultRegistry(replacementRegistry.address);

    await assert.rejects(async () => contract.setVaultRegistry(replacementHub.address), /ModuleChangePending|revert/);
  });

  it("rejects zero address proposals", async () => {
    const { contract, ethers } = await deployVaultRecoveryClaimFixture();

    await assert.rejects(async () => contract.setVaultHub(ethers.ZeroAddress), /ZeroAddress|revert/);
    await assert.rejects(async () => contract.setVaultRegistry(ethers.ZeroAddress), /ZeroAddress|revert/);
  });

  it("prevents non-owner governance actions", async () => {
    const { contract, replacementHub, replacementRegistry, outsider, ethers } = await deployVaultRecoveryClaimFixture();

    await assert.rejects(async () => contract.connect(outsider).setVaultHub(replacementHub.address), /Ownable|not owner|revert/);

    await contract.setVaultRegistry(replacementRegistry.address);
    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(async () => contract.connect(outsider).applyVaultRegistry(), /Ownable|not owner|revert/);
  });
});
