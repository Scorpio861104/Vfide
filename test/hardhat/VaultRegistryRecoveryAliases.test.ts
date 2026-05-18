import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VaultRegistry recovery aliases", () => {
  it("stores multiple vault matches for the same email hash", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner1, owner2, outsider] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    await hub.setVault(owner1.address, owner1.address);
    await hub.setVault(owner2.address, owner2.address);

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hub.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const emailHash = ethers.keccak256(ethers.toUtf8Bytes("same-email-hash"));
    const replacementHash = ethers.keccak256(ethers.toUtf8Bytes("replacement-email-hash"));

    await registry.connect(owner1).setEmailRecovery(owner1.address, emailHash);
    await registry.connect(owner2).setEmailRecovery(owner2.address, emailHash);

    const matches = await registry.searchByEmailAll(emailHash);
    assert.equal(matches.length, 2);
    assert.ok(matches.includes(owner1.address));
    assert.ok(matches.includes(owner2.address));

    await registry.connect(owner1).setEmailRecovery(owner1.address, replacementHash);

    const oldMatches = await registry.searchByEmailAll(emailHash);
    assert.equal(oldMatches.length, 1);
    assert.equal(oldMatches[0], owner2.address);

    await assert.rejects(
      () => registry.connect(outsider).setEmailRecovery(owner1.address, emailHash),
      /revert/i
    );
  });

  it("stores multiple vault matches for the same phone hash", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner1, owner2] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    await hub.setVault(owner1.address, owner1.address);
    await hub.setVault(owner2.address, owner2.address);

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hub.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const phoneHash = ethers.keccak256(ethers.toUtf8Bytes("same-phone-hash"));

    await registry.connect(owner1).setPhoneRecovery(owner1.address, phoneHash);
    await registry.connect(owner2).setPhoneRecovery(owner2.address, phoneHash);

    const matches = await registry.searchByPhoneAll(phoneHash);
    assert.equal(matches.length, 2);
    assert.ok(matches.includes(owner1.address));
    assert.ok(matches.includes(owner2.address));
  });
});