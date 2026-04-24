import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

function scopedHash(chainId: bigint, registry: string, value: string, ethers: any): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "address", "string"], [chainId, registry, value])
  );
}

describe("VaultRegistry scoped hashing", () => {
  it("searches recovery IDs using scoped hash derivation", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();
    await hub.setVault(owner.address, owner.address);

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hub.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const recoveryPhrase = "my recovery phrase";
    const hashedId = scopedHash(chainId, await registry.getAddress(), recoveryPhrase, ethers);

    await registry.connect(owner).setRecoveryId(owner.address, hashedId);

    assert.equal(await registry.searchByRecoveryId(recoveryPhrase), owner.address);
    const matches = await registry.searchByRecoveryIdAll(recoveryPhrase);
    assert.equal(matches.length, 1);
    assert.equal(matches[0], owner.address);
    assert.equal(await registry.isRecoveryIdAvailable(recoveryPhrase), false);
  });

  it("searches usernames using scoped lowercase hash derivation", async () => {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();
    await hub.setVault(owner.address, owner.address);

    const Registry = await ethers.getContractFactory("VaultRegistry");
    const registry = await Registry.deploy(await hub.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await registry.waitForDeployment();

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const username = "CaseSensitiveName";
    const normalized = username.toLowerCase();
    const hashedUsername = scopedHash(chainId, await registry.getAddress(), normalized, ethers);

    await registry.connect(owner).setUsername(owner.address, hashedUsername);

    assert.equal(await registry.searchByUsername("casesensitivename"), owner.address);
    assert.equal(await registry.searchByUsername("CASESENSITIVENAME"), owner.address);
    assert.equal(await registry.isUsernameAvailable("casesensitivename"), false);
  });
});