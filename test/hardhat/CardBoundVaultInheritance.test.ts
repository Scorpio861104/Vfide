import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

function encodeInheritanceCommitment(
  ethers: any,
  chainId: bigint,
  vault: string,
  configVersion: bigint,
  heir: string,
  basisPoints: bigint,
  secret: string,
) {
  const abi = ethers.AbiCoder.defaultAbiCoder();
  const domain = ethers.keccak256(ethers.toUtf8Bytes("VFIDE_INHERITANCE_V1"));
  const encoded = abi.encode(
    ["bytes32", "uint256", "address", "uint64", "address", "uint256", "bytes32"],
    [domain, chainId, vault, configVersion, heir, basisPoints, secret],
  );
  return ethers.keccak256(encoded);
}

describe("CardBoundVault inheritance", { concurrency: 1 }, () => {
  it("supports propose/confirm/initiate/reveal/finalize/withdraw flow", async () => {
    const { ethers, networkHelpers } = (await getConnection()) as any;
    const [, , owner, heir] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      await hub.getAddress(),
      await token.getAddress(),
      owner.address,
      owner.address,
      [owner.address],
      1,
      ethers.parseEther("1000"),
      ethers.parseEther("10000"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    await hub.setVault(owner.address, vaultAddr);

    const Manager = await ethers.getContractFactory("CardBoundVaultInheritanceManager");
    const manager = await Manager.deploy(vaultAddr);
    await manager.waitForDeployment();
    await vault.connect(owner).setInheritanceManager(await manager.getAddress());

    await vault.connect(owner).setGuardian(heir.address, true);

    const configVersion = (await vault.inheritanceConfigVersion()) + 1n;
    const share = 10_000n;
    const secret = ethers.keccak256(ethers.toUtf8Bytes("vfide-heir-secret-1"));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const commitment = encodeInheritanceCommitment(
      ethers,
      chainId,
      vaultAddr,
      configVersion,
      heir.address,
      share,
      secret,
    );

    await vault.connect(owner).proposeInheritanceConfig([heir.address], [commitment]);
    await networkHelpers.time.increase(30 * 24 * 60 * 60 + 5);
    await vault.connect(owner).confirmInheritanceConfig();

    await token.mint(vaultAddr, ethers.parseEther("1000"));

    await vault.connect(owner).initiateInheritanceClaim(ethers.keccak256(ethers.toUtf8Bytes("owner deceased notice")));
    await networkHelpers.time.increase(30 * 24 * 60 * 60 + 5);

    await vault.connect(heir).claimHeirShare(secret, share);
    await vault.finalizeInheritanceDistribution();
    await vault.connect(heir).withdrawFinalHeirPayout();

    const heirVault = await hub.vaultOf(heir.address);
    assert.notEqual(heirVault, ethers.ZeroAddress);

    const received = await token.balanceOf(heirVault);
    assert.equal(received, ethers.parseEther("1000"));

    const inheritanceState = await vault.inheritanceState();
    assert.equal(Number(inheritanceState[0]), 3);
  });

  it("allows veto during veto period and resets to normal", async () => {
    const { ethers, networkHelpers } = (await getConnection()) as any;
    const [, , owner, heir] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      await hub.getAddress(),
      await token.getAddress(),
      owner.address,
      owner.address,
      [owner.address],
      1,
      ethers.parseEther("1000"),
      ethers.parseEther("10000"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    await hub.setVault(owner.address, vaultAddr);

    const Manager = await ethers.getContractFactory("CardBoundVaultInheritanceManager");
    const manager = await Manager.deploy(vaultAddr);
    await manager.waitForDeployment();
    await vault.connect(owner).setInheritanceManager(await manager.getAddress());

    await vault.connect(owner).setGuardian(heir.address, true);

    const configVersion = (await vault.inheritanceConfigVersion()) + 1n;
    const share = 10_000n;
    const secret = ethers.keccak256(ethers.toUtf8Bytes("vfide-heir-secret-2"));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const commitment = encodeInheritanceCommitment(
      ethers,
      chainId,
      vaultAddr,
      configVersion,
      heir.address,
      share,
      secret,
    );

    await vault.connect(owner).proposeInheritanceConfig([heir.address], [commitment]);
    await networkHelpers.time.increase(30 * 24 * 60 * 60 + 5);
    await vault.connect(owner).confirmInheritanceConfig();

    await vault.connect(owner).initiateInheritanceClaim(ethers.keccak256(ethers.toUtf8Bytes("claim to veto")));
    await vault.connect(heir).vetoInheritanceClaim();

    const inheritanceState = await vault.inheritanceState();
    assert.equal(Number(inheritanceState[0]), 0);
  });
});
