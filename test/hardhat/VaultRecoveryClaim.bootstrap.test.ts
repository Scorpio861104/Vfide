import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

async function trustVerifier(contract: any, verifier: string, ethers: any) {
  await contract.setTrustedVerifier(verifier, true);
  await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
  await ethers.provider.send("evm_mine", []);
  await contract.applyTrustedVerifierChange();
}

describe("VaultRecoveryClaim bootstrap fallback", { concurrency: 1 }, () => {
  it("allows trusted verifiers to approve claims for single-guardian bootstrap vaults", async () => {
    const { ethers } = (await getConnection()) as any;
    const [deployer, originalOwner, claimant, guardian, verifierA, verifierB, verifierC, verifierD, verifierE] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      await hub.getAddress(),
      await token.getAddress(),
      originalOwner.address,
      originalOwner.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    await hub.setVault(originalOwner.address, await vault.getAddress());

    const Recovery = await ethers.getContractFactory("VaultRecoveryClaim");
    const recovery = await Recovery.deploy(await hub.getAddress(), ethers.ZeroAddress);
    await recovery.waitForDeployment();

    await trustVerifier(recovery, verifierA.address, ethers);
    await trustVerifier(recovery, verifierB.address, ethers);
    await trustVerifier(recovery, verifierC.address, ethers);
    await trustVerifier(recovery, verifierD.address, ethers);
    await trustVerifier(recovery, verifierE.address, ethers);

    await recovery.connect(claimant).initiateClaim(await vault.getAddress(), "", ethers.ZeroHash, "lost phone");

    await recovery.connect(verifierA).verifierVote(1, true);
    await recovery.connect(verifierB).verifierVote(1, true);
    await recovery.connect(verifierC).verifierVote(1, true);
    await recovery.connect(verifierD).verifierVote(1, true);
    await recovery.connect(verifierE).verifierVote(1, true);

    const claim = await recovery.claims(1);
    assert.equal(claim.status, 2n);
    assert.equal(claim.verifierVotes, 5n);
    assert.ok(claim.challengeEndsAt > 0n);
  });
});